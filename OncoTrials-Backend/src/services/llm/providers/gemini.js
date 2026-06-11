// Gemini provider — STUB.
//
// Interface placeholder. To enable:
//   1. npm install @google/generative-ai (or use Vertex AI SDK for BAA)
//   2. Implement explainTrialMatch (mirror openai.js — gemini-2.0-flash with
//      JSON response mime type via generation_config).
//   3. Register in services/llm/index.js providers map.

const MODEL = 'gemini-2.0-flash';

module.exports = {
    name:  'gemini',
    model: MODEL,
    explainTrialMatch: async () => {
        const err = new Error('Gemini provider not yet implemented');
        err.code = 'LLM_PROVIDER_NOT_IMPLEMENTED';
        throw err;
    },
    estimateCostUSD: () => 0,
};
