const test = require('node:test');
const assert = require('node:assert/strict');

const { normalize, _ageFromBirthDate } = require('../src/services/patientNormalizer');

function bundleWith(overrides = {}) {
    return {
        patient: { gender: 'female', birthDate: '1980-06-01' },
        conditions: [],
        observations: [],
        medicationRequests: [],
        procedures: [],
        ...overrides,
    };
}

test('biomarker comes from coded observation fields', () => {
    const p = normalize(bundleWith({
        observations: [{
            code: { text: 'EGFR mutation analysis', coding: [{ display: 'EGFR gene mutation' }] },
        }],
    }));
    assert.equal(p.mutationBiomarker, 'EGFR');
});

test('biomarker ignores narrative English like "goal met"', () => {
    // The old implementation regex-scanned JSON.stringify(observation) case-
    // insensitively, so "goal met" produced mutationBiomarker: "MET".
    const p = normalize(bundleWith({
        observations: [{
            code: { text: 'Care plan progress', coding: [{ display: 'Treatment goal met' }] },
            valueString: 'goal met, patient stable, home kit provided',
        }],
    }));
    assert.equal(p.mutationBiomarker, null);
});

test('biomarker ignores gene names outside coded fields', () => {
    const p = normalize(bundleWith({
        observations: [{
            code: { text: 'Clinical note' },
            note: [{ text: 'family history includes BRAF-mutant melanoma' }],
        }],
    }));
    assert.equal(p.mutationBiomarker, null);
});

test('lineOfTreatment is null — not derivable from MedicationRequest counts', () => {
    const p = normalize(bundleWith({
        medicationRequests: [
            { intent: 'order', status: 'completed', medicationCodeableConcept: { text: 'ondansetron' } },
            { intent: 'order', status: 'active',    medicationCodeableConcept: { text: 'ibuprofen' } },
        ],
    }));
    assert.equal(p.lineOfTreatment, null);
});

test('cancer type picked from most recent cancer-like condition', () => {
    const p = normalize(bundleWith({
        conditions: [
            { code: { text: 'Hypertension' }, recordedDate: '2025-01-01' },
            { code: { text: 'Malignant neoplasm of breast' }, recordedDate: '2024-05-01' },
        ],
    }));
    assert.equal(p.cancerType, 'Malignant neoplasm of breast');
});

test('age computes from birthDate and rejects implausible values', () => {
    assert.equal(_ageFromBirthDate('1980-06-01', '2026-06-02'), 46);
    assert.equal(_ageFromBirthDate('1900-01-01', '2026-01-01'), null);  // >100 → null
    assert.equal(_ageFromBirthDate('not-a-date'), null);
    assert.equal(_ageFromBirthDate(null), null);
});
