// LLM provider factory.
//
// Selects a provider implementation by name. Centralizes the per-request
// timeout, error normalization, and cost-guard wrapping so calling code (the
// trial ranker) doesn't have to repeat that logic for each provider.
//
// Provider precedence (PR 2 wires only OpenAI; the precedence is here for
// when Anthropic / Gemini get implemented):
//   1. explicit `providerName` arg (from request, only when external API ships)
//   2. org.preferred_ai_provider (PR 4)
//   3. env DEFAULT_LLM_PROVIDER
//   4. 'openai'

const costGuard = require('./costGuard');

const PROVIDERS = {
    openai:    require('./providers/openai'),
    anthropic: require('./providers/anthropic'),
    gemini:    require('./providers/gemini'),
};

const DEFAULT_TIMEOUT_MS = 4000;   // Stage 3 budget; see plan §5.3

function resolveProvider(providerName) {
    const requested = (providerName || process.env.DEFAULT_LLM_PROVIDER || 'openai').toLowerCase();
    const provider = PROVIDERS[requested];
    if (!provider) {
        const err = new Error(`Unknown LLM provider: ${requested}`);
        err.code = 'LLM_UNKNOWN_PROVIDER';
        throw err;
    }
    return provider;
}

/**
 * Explain a single (patient, trial) pair via the chosen LLM, with cost-guard
 * enforcement and a hard timeout.
 *
 * Returns:
 *   { ok: true,  provider, model, explanation, cost_usd, usage }
 *   { ok: false, provider, model, reason, error?, fallback_used: true }
 *
 * Callers should *always* check `ok` and fall back to a rule-derived rationale
 * when false — see trialRanker for the pattern.
 */
async function explainOnePair(patient, trial, opts = {}) {
    const provider = resolveProvider(opts.providerName);

    // Pre-flight cost check. We use a conservative estimate (~1000 input
    // tokens, ~250 output tokens for our prompt shape).
    const estimate = provider.estimateCostUSD(1000, 250);
    const verdict  = await costGuard.canSpend(opts.orgId, estimate, { orgCapUsd: opts.orgCapUsd });
    if (!verdict.allowed) {
        return {
            ok:       false,
            provider: provider.name,
            model:    provider.model,
            reason:   verdict.reason,
            fallback_used: true,
        };
    }

    const controller = new AbortController();
    const timeoutMs  = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timer      = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const result = await provider.explainTrialMatch(patient, trial, {
            signal: controller.signal,
        });

        // Record actual spend post-hoc
        await costGuard.recordSpend(opts.orgId, result.cost_usd, { orgCapUsd: opts.orgCapUsd });

        return {
            ok:          true,
            provider:    provider.name,
            model:       provider.model,
            explanation: result.explanation,
            cost_usd:    result.cost_usd,
            usage:       result.usage,
        };
    } catch (err) {
        return {
            ok:       false,
            provider: provider.name,
            model:    provider.model,
            reason:   err?.name === 'AbortError' ? 'timeout' : (err?.code || 'llm_call_failed'),
            error:    err?.message,
            fallback_used: true,
        };
    } finally {
        clearTimeout(timer);
    }
}

module.exports = {
    explainOnePair,
    resolveProvider,
    PROVIDERS,
};
