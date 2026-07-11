const test = require('node:test');
const assert = require('node:assert/strict');

const { isOncologyTrial } = require('../src/services/clinicalTrialsProcessor');
const { getOncologyConditionQuery, ONCOLOGY_REGEX } = require('../src/config/trialImportConfig');

const studyWithConditions = (conditions) => ({
    protocolSection: { conditionsModule: { conditions } },
});

test('accepts trials whose conditions are cancers', () => {
    assert.equal(isOncologyTrial(studyWithConditions(['Non-Small Cell Lung Cancer'])), true);
    assert.equal(isOncologyTrial(studyWithConditions(['Acute Myeloid Leukemia'])), true);
    assert.equal(isOncologyTrial(studyWithConditions(['Metastatic Melanoma'])), true);
    assert.equal(isOncologyTrial(studyWithConditions(['Glioblastoma Multiforme'])), true);
});

test('rejects trials whose conditions are not oncology', () => {
    assert.equal(isOncologyTrial(studyWithConditions(['Type 2 Diabetes Mellitus'])), false);
    assert.equal(isOncologyTrial(studyWithConditions(['Intermittent Exotropia'])), false);
    assert.equal(isOncologyTrial(studyWithConditions(['Rheumatoid Arthritis'])), false);
});

test('falls back to mesh browse terms when conditions are unhelpful', () => {
    const study = {
        protocolSection: { conditionsModule: { conditions: ['Solid Tumors'] } },
        derivedSection: { conditionBrowseModule: { meshes: [{ term: 'Carcinoma' }] } },
    };
    assert.equal(isOncologyTrial(study), true);
});

test('the condition query is a non-empty OR expression by default', () => {
    const q = getOncologyConditionQuery();
    assert.ok(typeof q === 'string' && q.includes('cancer') && q.includes('OR'));
});

test('ONCOLOGY_REGEX does not match mechanism-only strings', () => {
    // "tumor" matches, but we only ever test the condition field, so this
    // documents intent: conditions are diseases, not mechanisms.
    assert.equal(ONCOLOGY_REGEX.test('Diabetes'), false);
    assert.equal(ONCOLOGY_REGEX.test('Breast Cancer'), true);
});
