import './sites-env.mjs';
import { spawn } from 'node:child_process';
import { accessSync } from 'node:fs';
import { localOptions } from './local-options.mjs';
const { port, state } = localOptions();
accessSync('dist/server/wrangler.json');
// 本地验收服务器默认开启开发者模式（人机房商店可授予任意装备、/dev/* 可用）；
// 用 LOCAL_DEV_TOOLS=0 关闭。它只是 wrangler dev 的运行时变量，正式部署不会带上。
const devTools = process.env.LOCAL_DEV_TOOLS === '0' ? '0' : '1';
const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'dist/server/wrangler.json', '--local', '--persist-to', state, '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', '0', '--var', `LOCAL_DEV_TOOLS:${devTools}`], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { throw error; });
child.on('exit', code => { process.exitCode = code ?? 1; });
