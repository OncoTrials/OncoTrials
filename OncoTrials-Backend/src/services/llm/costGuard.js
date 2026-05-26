// costGuard.js — two-tier daily LLM spend cap (per-org + global).
//
// See epic-fhir-integration-plan.md §6.4.
//
// Behaviour:
//   - Before each LLM call, ask `canSpend(orgId, estimatedCostUsd)`. If either
//     cap would be exceeded, fall back to a rule-only response and skip the
//     LLM entirely.
//   - After each LLM call, record actual spend with `recordSpend(orgId, actualCostUsd)`.
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

async function getCurrentSpend(key) {
    const raw = await redis.get(key);
    if (raw == null) return 0;
    return Number(raw) || 0;
}

/**
 * @param {string|null} orgId
 * @param {number} estimatedCostUsd
 * @returns {Promise<{allowed: boolean, reason?: string, orgSpend?: number, globalSpend?: number, orgCap?: number, globalCap?: number}>}
 */
async function canSpend(orgId, estimatedCostUsd, opts = {}) {
    const orgCap = clampOrgCap(Number(opts.orgCapUsd ?? DEFAULT_ORG_DAILY_USD));

    const [orgSpend, globalSpend] = await Promise.all([
        getCurrentSpend(orgKey(orgId)),
        getCurrentSpend(globalKey()),
    ]);

    if (globalSpend + estimatedCostUsd > GLOBAL_DAILY_USD) {
        return {
            allowed: false,
            reason:  'global_daily_cap_exceeded',
            orgSpend, globalSpend, orgCap, globalCap: GLOBAL_DAILY_USD,
        };
    }
    if (orgSpend + estimatedCostUsd > orgCap) {
        return {
            allowed: false,
            reason:  'org_daily_cap_exceeded',
            orgSpend, globalSpend, orgCap, globalCap: GLOBAL_DAILY_USD,
        };
    }

    return {
        allowed: true,
        orgSpend, globalSpend, orgCap, globalCap: GLOBAL_DAILY_USD,
    };
}

/**
 * Record actual spend after an LLM call completes. Increments both counters
 * atomically (well — best-effort; Redis INCRBYFLOAT is atomic per-key, but the
 * two-key update is not transactional. Acceptable for budget enforcement; we
 * fail-safe by checking again on next call).
 */
async function recordSpend(orgId, actualCostUsd, opts = {}) {
    if (!Number.isFinite(actualCostUsd) || actualCostUsd <= 0) return;

    const oKey = orgKey(orgId);
    const gKey = globalKey();
    const orgCap = clampOrgCap(Number(opts.orgCapUsd ?? DEFAULT_ORG_DAILY_USD));

    const [newOrgSpend, newGlobalSpend] = await Promise.all([
        redis.incrByFloat(oKey, actualCostUsd),
        redis.incrByFloat(gKey, actualCostUsd),
    ]);

    // Refresh TTLs (incr resets them if the key was newly created in some
    // backends — Upstash preserves TTL across INCR, but EXPIRE is cheap and
    // safe to call repeatedly).
    await Promise.all([
        redis.expire(oKey, COUNTER_TTL_SECONDS),
        redis.expire(gKey, COUNTER_TTL_SECONDS),
    ]);

    // Threshold alerts. Cross-checking previous-vs-current avoids spamming
    // alerts on every call after the threshold is crossed.
    const prevOrgSpend    = Number(newOrgSpend) - actualCostUsd;
    const prevGlobalSpend = Number(newGlobalSpend) - actualCostUsd;
    maybeAlert('org',    orgId, prevOrgSpend,    Number(newOrgSpend),    orgCap);
    maybeAlert('global', null,  prevGlobalSpend, Number(newGlobalSpend), GLOBAL_DAILY_USD);

    return { orgSpend: Number(newOrgSpend), globalSpend: Number(newGlobalSpend) };
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
    canSpend,
    recordSpend,
    // exported for tests / debugging
    _todayKey: todayKey,
    _orgKey:   orgKey,
    _globalKey: globalKey,
    DEFAULT_ORG_DAILY_USD,
    GLOBAL_DAILY_USD,
};
