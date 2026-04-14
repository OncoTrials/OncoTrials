require('dotenv').config();
const supabase = require('../db/supabaseClient');
const { z } = require('zod');
const { zodToJsonSchema } = require('zod-to-json-schema');

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';

const clinicianSummarySchema = z.object({
  summary_markdown: z.string().describe('1-3 sentence concise summary of the intended study population.'),
  inclusion_criteria: z.array(z.string()).describe('Explicit inclusion criteria rewritten for clinician readability.'),
  exclusion_criteria: z.array(z.string()).describe('Explicit exclusion criteria rewritten for clinician readability.'),
});

function buildPrompt(trial) {
    return `
  You are an expert clinical trial eligibility summarizer writing for clinicians.
  
  Your job:
  Convert raw eligibility criteria into a concise, accurate, clinician-friendly summary.
  
  Hard rules:
  1. Use ONLY information explicitly stated in the source text.
  2. Do NOT invent missing details.
  3. Preserve important exceptions and caveats.
  4. Prefer concise medical phrasing.
  5. Rewrite for readability, but do not change meaning.
  6. If something is unclear or absent, use null or an empty array.
  7. Separate inclusion vs exclusion cleanly.
  8. Pull out clinically important thresholds: age, ECOG, key labs, biomarkers, prior therapies, washouts, CNS disease, organ function.
  9. Remove repetitive legal/admin wording unless clinically relevant.
  10. Output MUST be valid JSON (no extra text, no markdown outside fields).
  
  🚨 CRITICAL: FIELD NAMES MUST MATCH EXACTLY 🚨
  Use ONLY these exact keys in the JSON output:
  - "summary_markdown"
  - "inclusion_criteria"
  - "exclusion_criteria"
  
  Do NOT use:
  - inclusion_criteria_summary
  - exclusion_criteria_summary
  - inclusion_bullets
  - exclusion_bullets
  - or any other variation
  
  Trial metadata:
  - ID: ${trial.id}
  - NCT ID: ${trial.nct_id || 'Unknown'}
  - Title: ${trial.title || 'Unknown'}
  
  Raw eligibility criteria:
  """
  ${trial.eligibility_criteria}
  """
  
  Return JSON in this EXACT shape:
  
  {
    "summary_markdown": "string",
    "inclusion_criteria": ["string"],
    "exclusion_criteria": ["string"]
  }
  
  For summary_markdown, use this format:
  
  ## Population
  - ...
  
  ## Key Inclusion
  - ...
  
  ## Key Exclusion
  - ...
  
  ## Important Thresholds / Notes
  - ...
  
  Return ONLY the JSON object. Keep it concise and clinician-friendly. No explanations.
  `.trim();
  }

async function getGeminiClient() {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });
}

async function summarizeEligibility(ai, trial) {
  const prompt = buildPrompt(trial);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: zodToJsonSchema(clinicianSummarySchema),
      temperature: 0.1
    }
  });
  const parsed = clinicianSummarySchema.parse(JSON.parse(response.text));
  return {
    parsed,
    rawText: response.text
  };
}

async function pullTrialsBatch(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('trials')
      .select('id, nct_id, title, eligibility_criteria, eligibility_criteria_summary')
      .not('eligibility_criteria', 'is', null)
      .is('eligibility_criteria_summary', null)
      .range(offset, offset + limit - 1);
  
    if (error) throw error;
    return data || [];
  }

async function saveSummary(trialId, summary) {
  const { error } = await supabase
    .from('trials')
    .update({
      eligibility_criteria_summary: summary.summary_markdown,
      eligibility_summary_clinician_json: summary,
      eligibility_summary_clinician_generated_at: new Date().toISOString()
    })
    .eq('id', trialId);

  if (error) throw error;
}

function shouldSkipTrial(trial) {
  return !trial.eligibility_criteria || !trial.eligibility_criteria.trim() || trial.eligibility_criteria_summary;
}

async function runWithConcurrency(items, concurrency, worker) {
    let currentIndex = 0;
  
    async function runner() {
      while (true) {
        const index = currentIndex++;
        if (index >= items.length) break;
        await worker(items[index], index);
      }
    }
  
    const runners = Array.from(
      { length: Math.min(concurrency, items.length) },
      () => runner()
    );
  
    await Promise.all(runners);
  }
  
  const failedTrials = [];
  
  async function processTrials({
    batchSize = 25,
    maxTrials = null,
    previewOnly = false,
    onlyTrialId = null,
    concurrency = 5
  } = {}) {
    const ai = await getGeminiClient();
  
    let offset = 0;
    let processed = 0;
    let attempted = 0;
  
    while (true) {
      let trials = await pullTrialsBatch(batchSize, offset);
  
      if (onlyTrialId) {
        trials = trials.filter(t => String(t.id) === String(onlyTrialId));
      }
  
      if (!trials.length) break;
  
      if (maxTrials) {
        const remaining = maxTrials - attempted;
        if (remaining <= 0) {
          console.log(`Reached maxTrials=${maxTrials}`);
          return;
        }
        trials = trials.slice(0, remaining);
      }
  
      await runWithConcurrency(trials, concurrency, async (trial) => {
        attempted++;
  
        if (shouldSkipTrial(trial)) {
          console.log(`Skipping ${trial.id} - missing eligibility text or already summarized`);
          return;
        }
  
        try {
          console.log(`Summarizing ${trial.id} ${trial.nct_id ? `(${trial.nct_id})` : ''}...`);
  
          const result = await summarizeEligibility(ai, trial);
  
          if (previewOnly) {
            console.log('\n================ PREVIEW ================\n');
            console.log(`Trial ID: ${trial.id}`);
            console.log(`Title: ${trial.title || 'Untitled'}`);
            console.log('\n--- MARKDOWN SUMMARY ---\n');
            console.log(result.parsed.summary_markdown);
            console.log('\n--- JSON ---\n');
            console.log(JSON.stringify(result.parsed, null, 2));
            console.log('\n=========================================\n');
          } else {
            await saveSummary(trial.id, result.parsed);
            console.log(`✓ Saved clinician summary for ${trial.id}`);
          }
  
          processed++;
        } catch (error) {
          console.error(`✗ Failed for trial ${trial.id}:`, error.message);
          failedTrials.push([trial.id, trial.title]);
        }
      });
  
      offset += batchSize;
  
      if (onlyTrialId) break;
    }
  
    console.log(`Done. Attempted: ${attempted}. Processed: ${processed}.`);
    console.log('Failed trials:', failedTrials);
  }

// ---- RUN MODES ----
(async () => {
  try {
    //Preview a small sample:
    // await processTrials({
    //   batchSize: 10,
    //   maxTrials: 5,
    //   previewOnly: true
    // });

    // await processTrials({
    //   batchSize: 50,
    //   onlyTrialId: '478db8a2-ec19-4028-8f89-1222d022dd9e',
    //   previewOnly: false
    // });

    // Proccess all trials
    await processTrials({
      batchSize: 100,
      concurrency: 5,
      previewOnly: false
    });

    // Process one specific trial:
    // await processTrials({
    //   batchSize: 50,
    //   onlyTrialId: 'YOUR_TRIAL_ID_HERE',
    //   previewOnly: true
    // });
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
})();