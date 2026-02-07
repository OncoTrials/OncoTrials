// src/services/ai/protocolMatcher.js
// Fast patient-trial matching using pre-parsed protocol data

const supabase = require('../../db/supabaseClient');
const { 
  matchesBiomarkerRequirements, 
  meetsLineOfTherapyRequirement 
} = require('./protocolParser');

/**
 * Find eligible trials for a patient using fast structured query
 * NO PDF PARSING - uses pre-extracted data
 */
async function findEligibleTrials(patientData, options = {}) {
  const {
    maxTrials = 20,
    minMatchScore = 60,
    includeTrialDetails = true
  } = options;
  
  console.log('Finding eligible trials for patient...');
  console.log(`Patient: ${patientData.diagnosis}, ${patientData.prior_treatments?.length || 0} prior lines`);
  
  try {
    // Start with base query
    let query = supabase
      .from('trial_protocols')
      .select(includeTrialDetails ? `
        *,
        trial:trials(*)
      ` : '*')
      .eq('parsed', true); // Only consider parsed protocols
    
    // Filter by line of therapy
    const patientPriorLines = (patientData.prior_treatments || []).length;
    const patientCurrentLine = patientPriorLines + 1;
    
    console.log(`Patient is on line ${patientCurrentLine} of therapy`);
    
    // Use PostgreSQL array contains operator
    query = query.contains('line_of_therapy', [patientCurrentLine]);
    
    // Filter by ECOG score if available
    if (patientData.ecog_score !== null && patientData.ecog_score !== undefined) {
      query = query
        .lte('min_ecog', patientData.ecog_score)
        .gte('max_ecog', patientData.ecog_score);
    }
    
    // Filter by age if available
    if (patientData.age) {
      query = query.or(`age_min.is.null,age_min.lte.${patientData.age}`);
      query = query.or(`age_max.is.null,age_max.gte.${patientData.age}`);
    }
    
    // Filter by sex
    if (patientData.gender) {
      const sex = patientData.gender.toLowerCase();
      query = query.or(`sex_restriction.eq.all,sex_restriction.eq.${sex}`);
    }
    
    // Execute query
    const { data: protocols, error } = await query.limit(100); // Get more candidates for biomarker filtering
    
    if (error) throw error;
    
    console.log(`Found ${protocols.length} candidate protocols after structured filtering`);
    
    // Further filter by biomarkers (in-memory, complex logic)
    const biomarkerMatches = protocols.filter(protocol => {
      if (!patientData.biomarkers || patientData.biomarkers.length === 0) {
        // Patient has no biomarker data
        // Only match if trial has no required biomarkers
        return !protocol.required_biomarkers || protocol.required_biomarkers.length === 0;
      }
      
      return matchesBiomarkerRequirements(
        patientData.biomarkers,
        protocol.required_biomarkers,
        protocol.excluded_biomarkers
      );
    });
    
    console.log(`${biomarkerMatches.length} protocols match biomarker requirements`);
    
    // Score each match
    const scoredMatches = biomarkerMatches.map(protocol => {
      const score = calculateMatchScore(patientData, protocol);
      return {
        protocol,
        trial: protocol.trial,
        matchScore: score.overall,
        scoreDetails: score.details,
        reasons: generateMatchReasons(patientData, protocol, score)
      };
    });
    
    // Filter by minimum score and sort
    const qualifiedMatches = scoredMatches
      .filter(m => m.matchScore >= minMatchScore)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxTrials);
    
    console.log(`${qualifiedMatches.length} qualified matches found`);
    
    return {
      success: true,
      matches: qualifiedMatches,
      stats: {
        candidatesEvaluated: protocols.length,
        biomarkerMatches: biomarkerMatches.length,
        qualifiedMatches: qualifiedMatches.length
      }
    };
    
  } catch (error) {
    console.error('Error finding eligible trials:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate match score (0-100) based on multiple factors
 */
function calculateMatchScore(patientData, protocol) {
  let score = 0;
  const details = {};
  
  // 1. Line of therapy match (25 points)
  const patientLine = (patientData.prior_treatments || []).length + 1;
  if (protocol.line_of_therapy && protocol.line_of_therapy.includes(patientLine)) {
    score += 25;
    details.lineOfTherapy = 25;
  } else {
    details.lineOfTherapy = 0;
  }
  
  // 2. Biomarker match (35 points)
  const biomarkerScore = scoreBiomarkerMatch(patientData.biomarkers, protocol.required_biomarkers);
  score += biomarkerScore;
  details.biomarker = biomarkerScore;
  
  // 3. ECOG score match (15 points)
  if (patientData.ecog_score !== null && patientData.ecog_score !== undefined) {
    if (patientData.ecog_score >= (protocol.min_ecog || 0) && 
        patientData.ecog_score <= (protocol.max_ecog || 5)) {
      score += 15;
      details.ecog = 15;
    } else {
      details.ecog = 0;
    }
  } else {
    details.ecog = 10; // Partial credit if unknown
  }
  
  // 4. Organ function (15 points)
  const organScore = scoreOrganFunction(patientData.organ_function, protocol.organ_requirements);
  score += organScore;
  details.organFunction = organScore;
  
  // 5. No exclusion criteria violations (10 points)
  const exclusionScore = scoreExclusionCriteria(patientData, protocol.exclusion_criteria);
  score += exclusionScore;
  details.exclusion = exclusionScore;
  
  return {
    overall: Math.round(score),
    details
  };
}

/**
 * Score biomarker match
 */
function scoreBiomarkerMatch(patientBiomarkers, requiredBiomarkers) {
  if (!requiredBiomarkers || requiredBiomarkers.length === 0) {
    return 20; // No biomarker requirements = good match
  }
  
  if (!patientBiomarkers || patientBiomarkers.length === 0) {
    return 0; // Patient missing required biomarkers
  }
  
  let matchedCount = 0;
  for (const required of requiredBiomarkers) {
    const patientHas = patientBiomarkers.some(pb => {
      if (pb.gene !== required.gene) return false;
      
      if (required.variant_specificity === 'exact') {
        return required.variants.includes(pb.variant);
      }
      return true; // Gene-level match
    });
    
    if (patientHas) matchedCount++;
  }
  
  // Perfect match = 35 points, partial = proportional
  return Math.round((matchedCount / requiredBiomarkers.length) * 35);
}

/**
 * Score organ function adequacy
 */
function scoreOrganFunction(patientOrgans, requiredOrgans) {
  if (!requiredOrgans) return 15; // No requirements = full points
  if (!patientOrgans) return 5; // Unknown = partial credit
  
  // Simple check: if patient organ function is "normal", assume meets requirements
  const hepaticOk = !patientOrgans.liver || patientOrgans.liver === 'normal';
  const renalOk = !patientOrgans.kidney || patientOrgans.kidney === 'normal';
  const cardiacOk = !patientOrgans.cardiac || patientOrgans.cardiac === 'normal';
  
  const passCount = [hepaticOk, renalOk, cardiacOk].filter(Boolean).length;
  return Math.round((passCount / 3) * 15);
}

/**
 * Score exclusion criteria (check for violations)
 */
function scoreExclusionCriteria(patientData, exclusionCriteria) {
  if (!exclusionCriteria) return 10;
  
  // Simple implementation - in production, do detailed checks
  // For now, assume patient doesn't violate if we don't have specific data
  
  // Check brain metastases
  if (exclusionCriteria.brain_metastases === 'not_allowed') {
    if (patientData.brain_metastases === true) {
      return 0; // Violation
    }
  }
  
  return 10; // No violations detected
}

/**
 * Generate human-readable match reasons
 */
function generateMatchReasons(patientData, protocol, score) {
  const reasons = [];
  
  // Line of therapy
  const patientLine = (patientData.prior_treatments || []).length + 1;
  if (protocol.line_of_therapy && protocol.line_of_therapy.includes(patientLine)) {
    reasons.push(`Appropriate for line ${patientLine} therapy`);
  }
  
  // Biomarkers
  if (protocol.required_biomarkers && protocol.required_biomarkers.length > 0) {
    const matchedGenes = protocol.required_biomarkers
      .filter(req => patientData.biomarkers?.some(pb => pb.gene === req.gene))
      .map(req => req.gene);
    
    if (matchedGenes.length > 0) {
      reasons.push(`Matches required biomarkers: ${matchedGenes.join(', ')}`);
    }
  }
  
  // ECOG
  if (score.details.ecog === 15) {
    reasons.push(`ECOG score ${patientData.ecog_score} meets requirement`);
  }
  
  // Organ function
  if (score.details.organFunction >= 10) {
    reasons.push('Adequate organ function');
  }
  
  return reasons;
}

/**
 * Get detailed eligibility explanation for a specific trial
 */
async function getDetailedEligibilityExplanation(patientData, protocolId) {
  try {
    const { data: protocol, error } = await supabase
      .from('trial_protocols')
      .select(`
        *,
        trial:trials(*)
      `)
      .eq('id', protocolId)
      .single();
    
    if (error || !protocol) {
      return {
        success: false,
        error: 'Protocol not found'
      };
    }
    
    const score = calculateMatchScore(patientData, protocol);
    const reasons = generateMatchReasons(patientData, protocol, score);
    
    // Detailed breakdown
    const explanation = {
      overall_match_score: score.overall,
      recommendation: score.overall >= 80 ? 'Highly Recommended' :
                      score.overall >= 60 ? 'Consider' :
                      score.overall >= 40 ? 'Marginal' : 'Not Recommended',
      
      criteria_met: [],
      criteria_concerns: [],
      score_breakdown: score.details,
      match_reasons: reasons
    };
    
    // Check each criterion
    const patientLine = (patientData.prior_treatments || []).length + 1;
    if (protocol.line_of_therapy && protocol.line_of_therapy.includes(patientLine)) {
      explanation.criteria_met.push(`Line of therapy: Patient is line ${patientLine}, trial accepts ${protocol.line_of_therapy.join(', ')}`);
    } else {
      explanation.criteria_concerns.push(`Line of therapy mismatch: Patient is line ${patientLine}, trial requires ${protocol.line_of_therapy?.join(', ')}`);
    }
    
    // Biomarkers
    if (protocol.required_biomarkers && protocol.required_biomarkers.length > 0) {
      for (const req of protocol.required_biomarkers) {
        const patientHas = patientData.biomarkers?.some(pb => 
          pb.gene === req.gene && (req.variant_specificity === 'gene_level' || req.variants.includes(pb.variant))
        );
        
        if (patientHas) {
          explanation.criteria_met.push(`Required biomarker present: ${req.gene}${req.variant_specificity === 'exact' ? ' ' + req.variants.join('/') : ''}`);
        } else {
          explanation.criteria_concerns.push(`Missing required biomarker: ${req.gene}${req.variant_specificity === 'exact' ? ' ' + req.variants.join('/') : ''}`);
        }
      }
    }
    
    // ECOG
    if (patientData.ecog_score !== null) {
      if (patientData.ecog_score >= (protocol.min_ecog || 0) && 
          patientData.ecog_score <= (protocol.max_ecog || 5)) {
        explanation.criteria_met.push(`ECOG score ${patientData.ecog_score} is within acceptable range (${protocol.min_ecog || 0}-${protocol.max_ecog || 5})`);
      } else {
        explanation.criteria_concerns.push(`ECOG score ${patientData.ecog_score} is outside acceptable range (${protocol.min_ecog || 0}-${protocol.max_ecog || 5})`);
      }
    }
    
    return {
      success: true,
      trial: protocol.trial,
      explanation
    };
    
  } catch (error) {
    console.error('Error getting eligibility explanation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  findEligibleTrials,
  calculateMatchScore,
  getDetailedEligibilityExplanation
};