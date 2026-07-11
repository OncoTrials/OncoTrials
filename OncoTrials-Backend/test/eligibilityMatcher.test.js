const test = require('node:test');
const assert = require('node:assert/strict');

const EligibilityMatcher = require('../src/services/eligibilityMatcher');

test('extractStageTokens uses word boundaries, not substrings', () => {
    // "stage iv" must NOT also register as stage i/ii/iii (the old substring
    // matching meant 'stage i' fired on every staged trial).
    const tokens = EligibilityMatcher.extractStageTokens('Patients with stage iv disease');
    assert.ok(tokens.has('iv'));
    assert.ok(!tokens.has('i'));
    assert.ok(!tokens.has('ii'));
    assert.ok(!tokens.has('iii'));
});

test('extractStageTokens maps arabic numerals and equivalences', () => {
    const tokens = EligibilityMatcher.extractStageTokens('Stage 4 or metastatic disease');
    assert.ok(tokens.has('iv'));
    assert.ok(tokens.has('metastatic'));
});

test('checkCancerStage fails a clear mismatch', () => {
    const result = EligibilityMatcher.checkCancerStage(
        { cancerStage: 'Stage I' },
        { study_description: 'This study enrolls patients with stage iv metastatic disease.' },
        []
    );
    assert.ok(result.failed, 'expected a failed check');
});

test('checkCancerStage passes a genuine match', () => {
    const result = EligibilityMatcher.checkCancerStage(
        { cancerStage: 'Stage IV' },
        { study_description: 'Enrolling metastatic patients.' },
        []
    );
    assert.ok(result.met, 'expected a met check');
});

test('checkCancerStage reports nothing detected when trial has no stage language', () => {
    const result = EligibilityMatcher.checkCancerStage(
        { cancerStage: 'Stage II' },
        { study_description: 'A study of a new imaging agent.' },
        []
    );
    assert.ok(result.note);
});

test('benign notes do not block LIKELY_ELIGIBLE', () => {
    const status = EligibilityMatcher.determineStatus({
        score: 90,
        hardFailure: false,
        reasons: {
            met_inclusion: ['x'], failed_inclusion: [], triggered_exclusion: [],
            missing_information: [], notes: ['Trial does not restrict sex.'],
        },
    });
    assert.equal(status, EligibilityMatcher.STATUS.LIKELY_ELIGIBLE);
});

test('missing information still blocks LIKELY_ELIGIBLE', () => {
    const status = EligibilityMatcher.determineStatus({
        score: 90,
        hardFailure: false,
        reasons: {
            met_inclusion: ['x'], failed_inclusion: [], triggered_exclusion: [],
            missing_information: ['ECOG missing'], notes: [],
        },
    });
    assert.notEqual(status, EligibilityMatcher.STATUS.LIKELY_ELIGIBLE);
});

test('extractCancerKeywords keeps discriminating tokens, drops stopwords', () => {
    const kws = EligibilityMatcher.extractCancerKeywords('Malignant neoplasm of prostate (disorder)');
    assert.deepEqual(kws, ['prostate']);
});

test('convertAgeToYears handles units', () => {
    assert.equal(EligibilityMatcher.convertAgeToYears('18 Years'), 18);
    assert.equal(EligibilityMatcher.convertAgeToYears('6 Months'), 0.5);
    assert.equal(EligibilityMatcher.convertAgeToYears('garbage'), null);
});
