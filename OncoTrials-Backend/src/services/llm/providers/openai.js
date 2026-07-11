// OpenAI provider — default LLM for trial-match explanations.
//
// Model: gpt-4o-mini (cheap, fast, JSON-mode capable, BAA-eligible on
// OpenAI Enterprise).
//
// All cost numbers below are USD per token, current as of project start.
// Update when OpenAI changes pricing. Source: platform.openai.com/pricing.

const OpenAI = require('openai');
const {
    SYSTEM_PROMPT,
    buildUserPrompt,
    validateResponse,
} = require('../prompts/trialMatchExplainer');

const MODEL = 'gpt-4o-mini';

// Per-token cost (USD). gpt-4o-mini pricing as of 2025:
//   $0.150 per 1M input tokens
//   $0.600 per 1M output tokens
const COST_PER_INPUT_TOKEN  = 0.150 / 1_000_000;
const COST_PER_OUTPUT_TOKEN = 0.600 / 1_000_000;

let client = null;
function getClient() {
    if (client) return client;
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set');
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return client;
}

async function explainTrialMatch(patient, trial, opts = {}) {
    const userPrompt = buildUserPrompt(patient, trial);

    const completion = await getClient().chat.completions.create({
        model:           MODEL,
        // Determinism matters more than prose variety here: the same patient
        // + trial pair should produce the same verdict on every run. seed is
        // best-effort on OpenAI's side but measurably reduces run-to-run
        // drift when combined with temperature 0.
        temperature:     0,
        seed:            7,
        response_format: { type: 'json_object' },
        max_tokens:      500,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user',   content: userPrompt },
        ],
    }, {
        // Provider-level timeout. Caller can also race us via AbortController.
        signal: opts.signal,
    });

    const choice  = completion.choices?.[0];
    const content = choice?.message?.content;

    let parsed = null;
    try { parsed = JSON.parse(content); } catch { parsed = null; }

    const validated = validateResponse(parsed);
    if (!validated) {
        const err = new Error('LLM response failed schema validation');
        err.code = 'LLM_INVALID_RESPONSE';
        err.raw  = content;
        throw err;
    }

    const usage = completion.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
    const costUsd =
        usage.prompt_tokens     * COST_PER_INPUT_TOKEN +
        usage.completion_tokens * COST_PER_OUTPUT_TOKEN;

    return {
        explanation: validated,
        usage: {
            prompt_tokens:     usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens:      usage.total_tokens ?? (usage.prompt_tokens + usage.completion_tokens),
        },
        cost_usd: costUsd,
    };
}

module.exports = {
    name:  'openai',
    model: MODEL,
    explainTrialMatch,
    estimateCostUSD: (promptTokens, completionTokens) =>
        promptTokens * COST_PER_INPUT_TOKEN + completionTokens * COST_PER_OUTPUT_TOKEN,
};
