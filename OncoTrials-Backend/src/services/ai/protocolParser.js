// src/services/ai/protocolParser.js
// Parse trial protocol PDFs and extract structured eligibility criteria

const OpenAI = require('openai');
const pdf = require('pdf-parse');
const supabase = require('../../db/supabaseClient');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

/**
 * Extract text from PDF buffer
 */
async function extractPdfText(pdfBuffer) {
  try {
    const data = await pdf(pdfBuffer);
    return {
      success: true,
      text: data.text,
      pages: data.numpages
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}


/**
 * Build system prompt for protocol parsing
 */
function buildProtocolParsingSystemPrompt() {
  return `You are an expert oncology clinical trial protocol analyst. Your role is to extract structured eligibility criteria from clinical trial protocols with perfect accuracy.

CRITICAL INSTRUCTIONS:
1. Extract ONLY information explicitly stated in the protocol
2. Pay special attention to line of therapy (treatment-naive vs prior treatment)
3. Identify exact biomarker requirements (gene + variant specificity)
4. Distinguish between "required" and "excluded" criteria
5. Extract numeric thresholds precisely (ECOG, lab values, age)
6. Return valid JSON only - no additional text
7. Be conservative - if unclear, mark as null

Line of Therapy Definitions:
- 1st line: Treatment-naive patients, no prior systemic therapy
- 2nd line: Patients who received exactly one prior line of therapy
- 3rd line: Patients who received two prior lines of therapy
- etc.

Your extraction will be used for automated patient matching - accuracy is critical.`;
}

/**
 * Build extraction prompt for protocol
 */
function buildProtocolExtractionPrompt(pdfText, trialMetadata) {
  return `Extract structured eligibility criteria from this clinical trial protocol.

TRIAL METADATA:
NCT ID: ${trialMetadata.nct_id || 'Not specified'}
Title: ${trialMetadata.title}
Condition: ${trialMetadata.condition || 'Not specified'}
Phase: ${trialMetadata.phase || 'Not specified'}

PROTOCOL TEXT:
---
${pdfText}
---

Extract the following information in this exact JSON format:

{
  "line_of_therapy": [1, 2], // Array of allowed lines (e.g., [1] for 1st line only, [2,3] for 2nd/3rd line)
  
  "inclusion_criteria": {
    "disease": {
      "cancer_type": "specific cancer type",
      "subtypes": ["subtype1", "subtype2"], // or null
      "stage": ["III", "IV"], // or null
      "metastatic": true/false/null
    },
    "performance_status": {
      "ecog": [0, 1], // allowed ECOG scores
      "karnofsky": null // or [80, 90, 100]
    },
    "prior_treatment": {
      "lines_completed": [0], // [0] = treatment-naive, [1] = 1 prior line, etc.
      "specific_regimens_required": null, // or ["carboplatin", "pembrolizumab"]
      "washout_period_days": 14 // or null
    }
  },
  
  "exclusion_criteria": {
    "brain_metastases": "allowed/not_allowed/allowed_if_treated",
    "other_malignancies": "allowed/not_allowed/details",
    "specific_conditions": [
      "condition that excludes patient"
    ]
  },
  
  "required_biomarkers": [
    {
      "gene": "KRAS",
      "variants": ["G12C"], // specific variants, or ["any"] for gene-level
      "requirement_type": "must_have",
      "variant_specificity": "exact", // "exact" or "gene_level"
      "testing_method": ["NGS", "PCR"] // or null
    }
  ],
  
  "excluded_biomarkers": [
    {
      "gene": "EGFR",
      "variants": ["any"],
      "requirement_type": "must_not_have",
      "variant_specificity": "gene_level"
    }
  ],
  
  "ecog_requirements": {
    "min": 0,
    "max": 1
  },
  
  "age_requirements": {
    "min": 18,
    "max": null // or specific age
  },
  
  "sex_restriction": "all", // "all", "male", "female"
  
  "organ_function_requirements": {
    "hepatic": {
      "ast_max": 100, // U/L
      "alt_max": 100,
      "bilirubin_max": 1.5, // × ULN
      "albumin_min": null
    },
    "renal": {
      "creatinine_clearance_min": 50, // mL/min
      "creatinine_max": null
    },
    "cardiac": {
      "ejection_fraction_min": null,
      "qtc_max": null
    },
    "hematologic": {
      "hemoglobin_min": 9.0, // g/dL
      "platelet_min": 100000,
      "anc_min": 1500
    }
  },
  
  "prior_treatment_restrictions": {
    "immunotherapy_washout_days": null,
    "chemotherapy_washout_days": null,
    "radiation_washout_days": null,
    "excluded_prior_therapies": null // or ["drug1", "drug2"]
  },
  
  "additional_notes": "any important criteria not captured above"
}

Extract NOW. Return ONLY the JSON object, no other text.`;
}

/**
 * Extract eligibility criteria from protocol text using AI
 */
async function extractEligibilityCriteria(pdfText, trialMetadata) {
  const systemPrompt = buildProtocolParsingSystemPrompt();
  const prompt = buildProtocolExtractionPrompt(pdfText, trialMetadata);
  
  try {
    console.log(`Calling OpenAI to parse protocol for trial ${trialMetadata.nct_id}...`);
    
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.0, // Deterministic output
      response_format: { type: 'json_object' } // Ensure JSON response
    });
    
    const responseText = completion.choices[0].message.content;
    const extracted = JSON.parse(responseText);
    
    // Flatten some fields for easier database storage
    const formatted = {
      line_of_therapy: extracted.line_of_therapy || [],
      inclusion_criteria: extracted.inclusion_criteria,
      exclusion_criteria: extracted.exclusion_criteria,
      required_biomarkers: extracted.required_biomarkers || [],
      excluded_biomarkers: extracted.excluded_biomarkers || [],
      min_ecog: extracted.ecog_requirements?.min,
      max_ecog: extracted.ecog_requirements?.max,
      age_min: extracted.age_requirements?.min,
      age_max: extracted.age_requirements?.max,
      sex_restriction: extracted.sex_restriction,
      organ_requirements: extracted.organ_function_requirements,
      prior_treatment_restrictions: extracted.prior_treatment_restrictions,
      additional_notes: extracted.additional_notes,
      
      // Metadata
      tokens_used: completion.usage.total_tokens,
      model_used: MODEL
    };
    
    console.log(`✓ Successfully extracted eligibility criteria`);
    console.log(`  - Line of therapy: ${formatted.line_of_therapy.join(', ')}`);
    console.log(`  - Required biomarkers: ${formatted.required_biomarkers.length}`);
    console.log(`  - Tokens used: ${formatted.tokens_used}`);
    
    return {
      success: true,
      data: formatted,
      usage: completion.usage
    };
    
  } catch (error) {
    console.error('Error extracting eligibility criteria:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Parse protocol PDF (complete workflow)
 */
async function parseProtocol(protocolId) {
  console.log(`Starting protocol parsing for ${protocolId}`);
  
  try {
    // 1. Get protocol record
    const { data: protocol, error: fetchError } = await supabase
      .from('trial_protocols')
      .select(`
        *,
        trial:trials(*)
      `)
      .eq('id', protocolId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (protocol.parsed) {
      console.log('Protocol already parsed, skipping');
      return { success: true, alreadyParsed: true };
    }
    
    // 2. Download PDF from storage
    console.log(`Downloading PDF from storage: ${protocol.pdf_storage_path}`);
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('trial-protocols')
      .download(protocol.pdf_storage_path);
    
    if (downloadError) throw new Error(`Download failed: ${downloadError.message}`);
    
    // 3. Extract text from PDF
    console.log('Extracting text from PDF...');
    const arrayBuffer = await pdfData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const extractResult = await extractPdfText(buffer);
    if (!extractResult.success) {
      throw new Error(`PDF extraction failed: ${extractResult.error}`);
    }
    
    console.log(`Extracted ${extractResult.text.length} characters from ${extractResult.pages} pages`);
    
    // 4. Extract eligibility criteria with AI
    console.log('Sending to AI for structured extraction...');
    const aiResult = await extractEligibilityCriteria(extractResult.text, protocol.trial);
    
    if (!aiResult.success) {
      throw new Error(`AI extraction failed: ${aiResult.error}`);
    }
    
    const extracted = aiResult.data;
    
    // 5. Store structured data in database
    console.log('Storing structured data...');
    const { data: updated, error: updateError } = await supabase
      .from('trial_protocols')
      .update({
        parsed: true,
        parsed_at: new Date().toISOString(),
        line_of_therapy: extracted.line_of_therapy,
        inclusion_criteria: extracted.inclusion_criteria,
        exclusion_criteria: extracted.exclusion_criteria,
        required_biomarkers: extracted.required_biomarkers,
        excluded_biomarkers: extracted.excluded_biomarkers,
        min_ecog: extracted.min_ecog,
        max_ecog: extracted.max_ecog,
        age_min: extracted.age_min,
        age_max: extracted.age_max,
        sex_restriction: extracted.sex_restriction,
        organ_requirements: extracted.organ_requirements,
        prior_treatment_restrictions: extracted.prior_treatment_restrictions,
        raw_ai_extraction: extracted,
        ai_model_used: extracted.model_used,
        extraction_confidence: {
          overall: 'high', // Could implement confidence scoring
          notes: extracted.additional_notes
        }
      })
      .eq('id', protocolId)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    console.log(`✓ Protocol parsing complete for ${protocolId}`);
    
    return {
      success: true,
      data: updated,
      usage: aiResult.usage
    };
    
  } catch (error) {
    console.error(`✗ Protocol parsing failed for ${protocolId}:`, error);
    
    // Mark as failed in database
    await supabase
      .from('trial_protocols')
      .update({
        parsed: false,
        parsing_error: error.message
      })
      .eq('id', protocolId);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Queue protocol for async parsing
 */
async function queueProtocolParsing(protocolId) {
  // In production, use a proper job queue (Bull, BullMQ, etc.)
  // For now, just parse immediately in background
  setTimeout(() => {
    parseProtocol(protocolId).catch(err => {
      console.error('Background parsing error:', err);
    });
  }, 100);
}

/**
 * Match patient biomarkers against trial requirements
 */
function matchesBiomarkerRequirements(patientBiomarkers, requiredBiomarkers, excludedBiomarkers) {
  // Check required biomarkers
  for (const required of requiredBiomarkers || []) {
    const patientHas = patientBiomarkers.some(pb => {
      if (pb.gene !== required.gene) return false;
      
      if (required.variant_specificity === 'exact') {
        // Need exact variant match
        return required.variants.includes(pb.variant);
      } else {
        // Gene-level match is sufficient
        return true;
      }
    });
    
    if (!patientHas) {
      return false; // Missing required biomarker
    }
  }
  
  // Check excluded biomarkers
  for (const excluded of excludedBiomarkers || []) {
    const patientHas = patientBiomarkers.some(pb => {
      if (pb.gene !== excluded.gene) return false;
      
      if (excluded.variant_specificity === 'exact') {
        return excluded.variants.includes(pb.variant);
      } else {
        return true;
      }
    });
    
    if (patientHas) {
      return false; // Has excluded biomarker
    }
  }
  
  return true;
}

/**
 * Check if patient meets line of therapy requirement
 */
function meetsLineOfTherapyRequirement(patientPriorLines, trialAllowedLines) {
  // patientPriorLines: number of completed lines (0 = treatment-naive)
  // trialAllowedLines: array of allowed lines, e.g., [1, 2]
  
  // Patient's current line is priorLines + 1
  const patientCurrentLine = patientPriorLines + 1;
  
  return trialAllowedLines.includes(patientCurrentLine);
}

module.exports = {
  parseProtocol,
  queueProtocolParsing,
  extractPdfText,
  extractEligibilityCriteria,
  matchesBiomarkerRequirements,
  meetsLineOfTherapyRequirement,
};