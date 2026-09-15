import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReleaseSource } from '../../scripts/release/guards.mjs';
import { localOptions } from '../../scripts/local-options.mjs';
const valid = { remote: 'git@github.com:owner/repo.git', expectedRepo: 'owner/repo', head: 'a'.repeat(40), main: 'a'.repeat(40), dirty: false, projectId: 'site-a', expectedProject: 'site-a' };
test('release accepts only clean current main from the expected repository and site', () => {
  assert.equal(validateReleaseSource(valid), valid.head);
  for (const change of [{ dirty: true }, { main: 'b'.repeat(40) }, { remote: 'git@github.com:other/repo.git' }, { projectId: 'site-b' }, { head: 'unknown' }]) assert.throws(() => validateReleaseSource({ ...valid, ...change }));
});
test('local tooling rejects outside database paths, remote flags and invalid ports', () => {
  assert.equal(localOptions([]).port, 8787);
  assert.equal(localOptions(['--port', '5173']).port, 5173);
  for (const args of [['--state', '/tmp/production'], ['--remote'], ['--port', 'https://example.com'], ['--port', '0']]) assert.throws(() => localOptions(args));
});
