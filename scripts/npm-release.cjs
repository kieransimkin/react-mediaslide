const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { setTimeout: sleep } = require('node:timers/promises');

const registry = 'https://registry.npmjs.org';
const packageName = 'react-mediaslide';

async function readVersion(version, fetchRegistry) {
  let response;
  try {
    response = await fetchRegistry(`${registry}/${packageName}/${encodeURIComponent(version)}`, {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { state: 'retry' };
  }

  if (response.status === 404) return { state: 'missing' };
  if (response.status === 429 || response.status >= 500) return { state: 'retry' };
  if (!response.ok) throw new Error(`npm registry lookup failed with HTTP ${response.status}`);

  const metadata = await response.json();
  if (metadata.name !== packageName || metadata.version !== version) {
    throw new Error('npm registry returned a different package or version');
  }
  return { state: 'published', integrity: metadata.dist?.integrity };
}

async function runNpmRelease(mode, version, expected, {
  fetchRegistry = fetch,
  publish,
  pause = () => sleep(10000),
  attempts = 40,
} = {}) {
  const spec = `${packageName}@${version}`;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await readVersion(version, fetchRegistry);
    if (result.state === 'published') {
      if (result.integrity !== expected) {
        throw new Error(`Published ${spec} does not match the release tarball`);
      }
      console.log(`Verified ${spec} matches the release tarball`);
      return;
    }
    if (mode === 'publish' && result.state === 'missing') {
      publish();
      return;
    }
    if (attempt < attempts) {
      console.log(`Waiting for npm registry read-back of ${spec} (${attempt}/${attempts})`);
      await pause();
    }
  }

  throw new Error(`Timed out waiting for npm registry read-back of ${spec}`);
}

if (require.main === module) {
  const [mode, version, archive] = process.argv.slice(2);
  if (!['publish', 'verify'].includes(mode) || !version || !archive) {
    throw new Error('Usage: node scripts/npm-release.cjs <publish|verify> <version> <tarball>');
  }
  const expected = 'sha512-' + createHash('sha512').update(readFileSync(archive)).digest('base64');
  runNpmRelease(mode, version, expected, {
    publish: () => execFileSync(
      'npm', ['publish', resolve(archive), '--ignore-scripts', '--access', 'public', '--registry', registry],
      { stdio: 'inherit' },
    ),
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { runNpmRelease };
