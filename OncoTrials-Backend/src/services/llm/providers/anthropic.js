// Anthropic provider — STUB.
//
// Interface placeholder so future wiring is a small change rather than a
// refactor. To enable:
//   1. npm install @anthropic-ai/sdk
//   2. Implement explainTrialMatch (mirror openai.js — system prompt goes to
//      `system` field, user prompt to messages, response_format-style JSON
//      enforcement via prompt + validation).
//   3. Register in services/llm/index.js providers map.

const MODEL = 'claude-haiku-4-5';

module.exports = {
    name:  'anthropic',
    model: MODEL,
    explainTrialMatch: async () => {
        const err = new Error('Anthropic provider not yet implemented');
        err.code = 'LLM_PROVIDER_NOT_IMPLEMENTED';
        throw err;
    },
    estimateCostUSD: () => 0,
};
