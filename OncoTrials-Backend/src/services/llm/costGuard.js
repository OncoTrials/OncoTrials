// costGuard.js — two-tier daily LLM spend cap (per-org + global).
//
// Behaviour (reserve/settle, so parallel calls cannot race past the cap):
//   - Before each LLM call, `reserveSpend(orgId, estimatedCostUsd)` atomically
//     adds the estimate to the counters and checks the result. Denied
//     reservations are refunded; callers fall back to a rule-only response.
//   - After the call, `settleSpend(orgId, estimate, actualCostUsd)` adjusts
//     the counters to the actual cost (0 on failure = full refund).
//   - Both per-org and global counters live in Redis with a TTL just past
//     midnight so they self-clean.
//
// Alerting:
//   - When a counter crosses 80% or 100% of its cap, we log a structured
//     WARNING / CRITICAL line. A Cloud Logging alert policy on that filter
//     turns the log into an email/Slack page (operational wiring, not in this
//     module).

const { redis } = require('../../db/redisClient');

const DEFAULT_ORG_DAILY_USD    = Number(process.env.DEFAULT_ORG_DAILY_LLM_BUDGET_USD || 5);
const GLOBAL_DAILY_USD         = Number(process.env.GLOBAL_DAILY_LLM_BUDGET_USD     || 20);
const COUNTER_TTL_SECONDS      = 36 * 60 * 60;   // 36h — survives across UTC midnight

// Per-org cap can never exceed the global cap — a single org would otherwise
// be able to drain the whole site budget by itself. Clamp at compute time
// (so per-org overrides from the DB are clamped too) and warn once at boot
// if the env defaults are inconsistent.
function clampOrgCap(requestedOrgCap) {
    if (!Number.isFinite(requestedOrgCap) || requestedOrgCap <= 0) return GLOBAL_DAILY_USD;
    return Math.min(requestedOrgCap, GLOBAL_DAILY_USD);
}

if (DEFAULT_ORG_DAILY_USD > GLOBAL_DAILY_USD) {
    console.warn(JSON.stringify({
        event: 'llm_budget_misconfigured',
        message: 'DEFAULT_ORG_DAILY_LLM_BUDGET_USD exceeds GLOBAL_DAILY_LLM_BUDGET_USD; per-org cap will be clamped to global.',
        default_org_usd: DEFAULT_ORG_DAILY_USD,
        global_usd:      GLOBAL_DAILY_USD,
        severity: 'WARNING',
    }));
}

function todayKey() {
    // YYYYMMDD in UTC. Counter is per-UTC-day; consistent across instances.
    const d = new Date();
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

function orgKey(orgId)  { return `llm:spend:org:${orgId ?? 'anonymous'}:${todayKey()}`; }
function globalKey()    { return `llm:spend:global:${todayKey()}`; }

/**
 * Reserve budget BEFORE an LLM call: atomically add the estimate to both
 * counters, then check the resulting totals. Because each caller's increment
 * is included in the total it checks, N parallel calls can no longer all pass
 * a stale pre-check and collectively blow the cap (the old check-then-record
 * race allowed ~10x overshoot per match request).
 *
 * If the reservation lands over a cap, it is refunded and denied.
 * Pair every successful reservation with settleSpend() (even on LLM failure).
 *
 * @returns {Promise<{allowed: boolean, reason?: string, orgSpend?: number, globalSpend?: number, orgCap?: number, globalCap?: number}>}
 */
async function reserveSpend(orgId, estimatedCostUsd, opts = {}) {
    const orgCap = clampOrgCap(Number(opts.orgCapUsd ?? DEFAULT_ORG_DAILY_USD));
    const oKey = orgKey(orgId);
    const gKey = globalKey();

    const [orgSpend, globalSpend] = (await Promise.all([
        redis.incrByFloat(oKey, estimatedCostUsd),
        redis.incrByFloat(gKey, estimatedCostUsd),
    ])).map(Number);

    await Promise.all([
        redis.expire(oKey, COUNTER_TTL_SECONDS),
        redis.expire(gKey, COUNTER_TTL_SECONDS),
    ]);

    const overGlobal = globalSpend > GLOBAL_DAILY_USD;
    const overOrg    = orgSpend > orgCap;
    if (overGlobal || overOrg) {
        // Refund the reservation so a denied call doesn't consume budget.
        await Promise.all([
            redis.incrByFloat(oKey, -estimatedCostUsd),
            redis.incrByFloat(gKey, -estimatedCostUsd),
        ]);
        return {
            allowed: false,
            reason:  overGlobal ? 'global_daily_cap_exceeded' : 'org_daily_cap_exceeded',
            orgSpend: orgSpend - estimatedCostUsd,
            globalSpend: globalSpend - estimatedCostUsd,
            orgCap, globalCap: GLOBAL_DAILY_USD,
        };
    }

    return { allowed: true, orgSpend, globalSpend, orgCap, globalCap: GLOBAL_DAILY_USD };
}

/**
 * Settle a reservation once the call finishes: adjust the counters from the
 * estimate to the actual cost (actual = 0 refunds a failed call entirely).
 * Threshold alerts fire here, on the settled totals.
 */
async function settleSpend(orgId, estimatedCostUsd, actualCostUsd, opts = {}) {
    const actual = Number.isFinite(actualCostUsd) && actualCostUsd > 0 ? actualCostUsd : 0;
    const delta  = actual - estimatedCostUsd;

    const oKey = orgKey(orgId);
    const gKey = globalKey();
    const orgCap = clampOrgCap(Number(opts.orgCapUsd ?? DEFAULT_ORG_DAILY_USD));

    const [newOrgSpend, newGlobalSpend] = (await Promise.all([
        redis.incrByFloat(oKey, delta),
        redis.incrByFloat(gKey, delta),
    ])).map(Number);

    // Refresh TTLs (incr resets them if the key was newly created in some
    // backends — Upstash preserves TTL across INCR, but EXPIRE is cheap and
    // safe to call repeatedly).
    await Promise.all([
        redis.expire(oKey, COUNTER_TTL_SECONDS),
        redis.expire(gKey, COUNTER_TTL_SECONDS),
    ]);

    // Threshold alerts. Cross-checking previous-vs-current avoids spamming
    // alerts on every call after the threshold is crossed. Only meaningful
    // when the counter moved up (delta > 0).
    if (delta > 0) {
        maybeAlert('org',    orgId, newOrgSpend - delta,    newOrgSpend,    orgCap);
        maybeAlert('global', null,  newGlobalSpend - delta, newGlobalSpend, GLOBAL_DAILY_USD);
    }

    return { orgSpend: newOrgSpend, globalSpend: newGlobalSpend };
}

function maybeAlert(scope, scopeId, prev, current, cap) {
    if (cap <= 0) return;
    const prevPct    = (prev    / cap) * 100;
    const currentPct = (current / cap) * 100;

    const crossings = [
        { threshold: 80,  severity: 'WARNING' },
        { threshold: 100, severity: 'CRITICAL' },
    ];
    for (const { threshold, severity } of crossings) {
        if (prevPct < threshold && currentPct >= threshold) {
            const payload = {
                event:   'llm_spend_threshold_crossed',
                scope, scope_id: scopeId,
                threshold_pct: threshold,
                current_usd: Number(current.toFixed(5)),
                cap_usd:     cap,
                severity,
            };
            // Structured single-line log; Cloud Logging picks up `severity`.
            console.log(JSON.stringify(payload));
        }
    }
}

module.exports = {
    reserveSpend,
    settleSpend,
    // exported for tests / debugging
    _todayKey: todayKey,
    _orgKey:   orgKey,
    _globalKey: globalKey,
    DEFAULT_ORG_DAILY_USD,
    GLOBAL_DAILY_USD,
};
