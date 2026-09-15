import path from 'node:path';
import { parseArgs } from 'node:util';
export function localOptions(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: { port: { type: 'string', default: '8787' }, state: { type: 'string', default: '.wrangler/state' } } });
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('端口需在 1024–65535 之间。');
  const state = path.resolve(values.state);
  const root = path.resolve('.wrangler');
  if (!state.startsWith(root + path.sep)) throw Error('测试数据库必须放在本项目 .wrangler/ 内。');
  return { port, state };
}
