const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));

test('publishes the canonical package contract', () => {
  assert.equal(pkg.name, 'react-mediaslide');
  assert.match(pkg.description, /Responsive React media browser/);
  assert.equal(pkg.peerDependencies.react, '>=18 <20');
  assert.ok(pkg.files.includes('dist'));
});

test('documents modes, preflight and problems', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  for (const mode of ['List', 'Details', 'Thumbnails', 'Slide']) assert.match(readme, new RegExp(mode));
  assert.match(readme, /latest stable official release/i);
  assert.match(readme, /Potential problems/);
});

test('keeps model data project-local and ignored', () => {
  const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(ignore, /^models\/$/m);
});
