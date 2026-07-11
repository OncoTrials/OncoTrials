const test = require('node:test');
const assert = require('node:assert/strict');

const { purgeCdnCache, _purgeTargets } = require('../src/services/cdnPurge');

function withEnv(vars, fn) {
    const saved = {};
    for (const k of Object.keys(vars)) { saved[k] = process.env[k]; }
    Object.assign(process.env, vars);
    // delete keys explicitly set to undefined
    for (const [k, v] of Object.entries(vars)) { if (v === undefined) delete process.env[k]; }
    try { return fn(); }
    finally {
        for (const k of Object.keys(vars)) {
            if (saved[k] === undefined) delete process.env[k];
            else process.env[k] = saved[k];
        }
    }
}

test('purge targets default to the two list endpoints under PUBLIC_API_ORIGIN', () => {
    withEnv({ PUBLIC_API_ORIGIN: 'https://api.trialsonco.com', CDN_PURGE_URLS: undefined }, () => {
        assert.deepEqual(_purgeTargets(), [
            'https://api.trialsonco.com/trials?limit=all',
            'https://api.trialsonco.com/trials/stream',
        ]);
    });
});

test('explicit CDN_PURGE_URLS overrides the defaults', () => {
    withEnv({ CDN_PURGE_URLS: 'https://a.test/x, https://a.test/y' }, () => {
        assert.deepEqual(_purgeTargets(), ['https://a.test/x', 'https://a.test/y']);
    });
});

test('no targets when neither env var is set', () => {
    withEnv({ PUBLIC_API_ORIGIN: undefined, CDN_PURGE_URLS: undefined }, () => {
        assert.deepEqual(_purgeTargets(), []);
    });
});

test('purge is a safe no-op when Cloudflare is not configured', async () => {
    const result = await withEnv(
        { CLOUDFLARE_API_TOKEN: undefined, CLOUDFLARE_ZONE_ID: undefined },
        () => purgeCdnCache()
    );
    assert.equal(result.purged, false);
    assert.equal(result.reason, 'cloudflare_not_configured');
});
