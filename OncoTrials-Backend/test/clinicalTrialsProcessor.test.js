const test = require('node:test');
const assert = require('node:assert/strict');

const { _extractBiomarkersFromText } = require('../src/services/clinicalTrialsProcessor');

test('extracts uppercase gene symbols', () => {
    assert.equal(_extractBiomarkersFromText('Patients with MET exon 14 skipping mutations'), 'MET');
    assert.equal(_extractBiomarkersFromText('KIT or PDGFRA mutation required'), 'KIT, PDGFRA');
    assert.equal(_extractBiomarkersFromText('HER2-positive breast cancer'), 'HER2');
});

test('does not match English words that collide with gene symbols', () => {
    // These were the CODE_REVIEW.md §2.2 false positives: ~828 trials tagged
    // "MET" from sentences like this one.
    assert.equal(_extractBiomarkersFromText('All inclusion criteria must be met before enrollment'), null);
    assert.equal(_extractBiomarkersFromText('a specimen collection kit will be provided'), null);
    assert.equal(_extractBiomarkersFromText('patients who met the criteria received a kit'), null);
});

test('deduplicates repeated symbols', () => {
    assert.equal(_extractBiomarkersFromText('EGFR mutation; EGFR amplification'), 'EGFR');
});

test('returns null for empty or non-string input', () => {
    assert.equal(_extractBiomarkersFromText(''), null);
    assert.equal(_extractBiomarkersFromText(null), null);
    assert.equal(_extractBiomarkersFromText(42), null);
});
