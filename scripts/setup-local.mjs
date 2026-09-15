import './sites-env.mjs';
import { spawnSync } from 'node:child_process';
import { localOptions } from './local-options.mjs';
const { state } = localOptions();
const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'migrations', 'apply', 'DB', '--local', '--config', 'config/local-db.json', '--persist-to', state], { stdio: ['ignore', 'inherit', 'inherit'] });
if (result.error) throw result.error;
if (result.status !== 0) {
  console.error('本地迁移未完成。没有连接线上数据库。如果旧本地库曾手工建表，请查阅 docs/local-development.md，不要删除数据库。');
  process.exit(result.status ?? 1);
}
console.log('本地数据库已就绪。运行 npm run dev，然后打开 http://localhost:5173/ 注册测试账号。');
