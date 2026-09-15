import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const commit = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { encoding: 'utf8' }).trim();
const dirty = Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { encoding: 'utf8' }).trim());
const assets = createHash('sha256').update(readFileSync('lib/motion/asset-manifest.ts')).digest('hex');
writeFileSync('dist/client/build-info.json', JSON.stringify({ commit, dirty, assets }) + '\n');
