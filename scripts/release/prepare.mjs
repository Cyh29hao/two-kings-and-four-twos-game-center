import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { validateReleaseSource } from './guards.mjs';
import { findSitesPackager } from './sites-helper.mjs';

const settings = JSON.parse(readFileSync('config/release.json', 'utf8'));
const hosting = JSON.parse(readFileSync('.openai/hosting.json', 'utf8'));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
// An unsuccessful attempt must not leave an earlier package marked ready.
mkdirSync('release', { recursive: true });
writeFileSync('release/candidate.json', JSON.stringify({ status: 'preparing', startedAt: new Date().toISOString() }) + '\n');
function validate() {
  return validateReleaseSource({ remote: git('remote', 'get-url', settings.remote), expectedRepo: settings.repository,
    head: git('rev-parse', '--verify', 'HEAD'), main: git('rev-parse', '--verify', `${settings.remote}/${settings.branch}`),
    dirty: Boolean(git('status', '--porcelain', '--untracked-files=normal')), projectId: hosting.project_id, expectedProject: settings.projectId });
}
const remote = git('remote', 'get-url', settings.remote);
if (![ `git@github.com:${settings.repository}.git`, `https://github.com/${settings.repository}.git`, `https://github.com/${settings.repository}` ].includes(remote)) throw Error('发布仓库不匹配。');
execFileSync('git', ['fetch', settings.remote, settings.branch], { stdio: 'inherit' });
const commit = validate();
const helper = findSitesPackager(path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'plugins/cache'));
for (const script of ['check', 'build', 'test:smoke']) {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', script], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Recheck after building, including remote advancement while validation was running.
execFileSync('git', ['fetch', settings.remote, settings.branch], { stdio: 'inherit' });
if (validate() !== commit) throw Error('验收过程中代码发生变化，停止发布。');
const info = JSON.parse(readFileSync('dist/client/build-info.json', 'utf8'));
if (info.commit !== commit || info.dirty) throw Error('构建与待发布源码不一致。');
mkdirSync('release', { recursive: true });
const archive = path.resolve(`release/site-${commit}.tar.gz`);
execFileSync(helper.command, [helper.script, process.cwd(), archive], { stdio: 'inherit' });
const receipt = { status: 'prepared', commit, projectId: hosting.project_id, siteUrl: settings.siteUrl, archive,
  archiveSha256: createHash('sha256').update(readFileSync(archive)).digest('hex'), preparedAt: new Date().toISOString() };
writeFileSync('release/candidate.json', JSON.stringify(receipt, null, 2) + '\n');
console.log('验收与打包完成。尚未上线。接下来由 Codex 按 docs/releasing.md 完成 Sites 发布与核验。');
