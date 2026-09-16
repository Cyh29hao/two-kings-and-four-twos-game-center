import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** Plugin sources can move between distribution channels; never pin a cache version. */
export function findSitesPackager(cacheRoot) {
  for (const channel of ['openai-primary-runtime', 'openai-curated-remote', 'openai-bundled']) {
    const root = path.join(cacheRoot, channel, 'sites');
    if (!existsSync(root)) continue;
    const versions = readdirSync(root, { withFileTypes: true }).filter(entry => entry.isDirectory())
      .map(entry => entry.name).sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
    for (const version of versions) {
      for (const relative of ['scripts/package-site.mjs', 'skills/sites-hosting/scripts/package-site.sh', 'scripts/package-site.sh']) {
        const script = path.join(root, version, relative);
        if (existsSync(script)) return { command: script.endsWith('.mjs') ? process.execPath : 'bash', script };
      }
    }
  }
  throw Error('本机未找到 Sites 打包工具。请在已安装 Sites 的 Codex 中运行发布；GitHub 验收不需要此工具。');
}
