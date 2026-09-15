import { spawnSync } from 'node:child_process';
for (const script of ['assets:check', 'typecheck', 'test', 'docs:check']) {
  console.log(`\n检查：${script}`);
  const result = spawnSync(process.execPath, [process.env.npm_execpath, 'run', script], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
