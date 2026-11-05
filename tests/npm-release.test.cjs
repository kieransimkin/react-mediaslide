const assert = require('node:assert/strict');
const test = require('node:test');
const { runNpmRelease } = require('../scripts/npm-release.cjs');

const version = '1.1.27';
const integrity = 'sha512-release';
const missing = () => new Response(null, { status: 404 });
const published = (digest = integrity) => Response.json({
  name: 'react-mediaslide', version, dist: { integrity: digest },
});

function registrySequence(...responses) {
  return async url => {
    assert.equal(url, `https://registry.npmjs.org/react-mediaslide/${version}`);
    const response = responses.shift();
    if (!response) throw new Error('Unexpected registry request');
    return response();
  };
}

test('publish issues one upload for an absent version and leaves read-back to the next job', async () => {
  let uploads = 0;
  await runNpmRelease('publish', version, integrity, {
    fetchRegistry: registrySequence(missing),
    publish: () => { uploads += 1; },
  });
  assert.equal(uploads, 1);
});

test('publish skips an existing version with matching integrity', async () => {
  await runNpmRelease('publish', version, integrity, {
    fetchRegistry: registrySequence(published),
    publish: () => assert.fail('Must not publish an existing version'),
  });
});

test('both jobs reject an existing version with different integrity', async () => {
  for (const mode of ['publish', 'verify']) {
    await assert.rejects(runNpmRelease(mode, version, integrity, {
      fetchRegistry: registrySequence(() => published('sha512-different')),
      publish: () => assert.fail('Must not publish a conflicting version'),
    }), /does not match the release tarball/);
  }
});

test('verification waits through missing and temporarily unavailable registry responses', async () => {
  let pauses = 0;
  await runNpmRelease('verify', version, integrity, {
    fetchRegistry: registrySequence(
      missing, () => new Response(null, { status: 503 }), missing, published,
    ),
    publish: () => assert.fail('Verification must never publish'),
    pause: async () => { pauses += 1; },
    attempts: 4,
  });
  assert.equal(pauses, 3);
});

test('a failed network preflight does not authorize a new upload', async () => {
  await assert.rejects(runNpmRelease('publish', version, integrity, {
    fetchRegistry: registrySequence(
      () => { throw new TypeError('Network unavailable'); },
      () => new Response(null, { status: 429 }),
    ),
    publish: () => assert.fail('Must not publish when the registry state is unknown'),
    pause: async () => {},
    attempts: 2,
  }), /Timed out/);
});

test('verification times out cleanly when npm has not indexed an accepted upload', async () => {
  await assert.rejects(runNpmRelease('verify', version, integrity, {
    fetchRegistry: registrySequence(missing, missing),
    publish: () => assert.fail('Verification must never publish'),
    pause: async () => {},
    attempts: 2,
  }), /Timed out/);
});
