import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const config = JSON.parse(readFileSync('config/release.json', 'utf8'));
const receipt = JSON.parse(readFileSync('release/candidate.json', 'utf8'));
if (receipt.status !== 'prepared' || receipt.siteUrl !== config.siteUrl || receipt.projectId !== config.projectId || !/^[a-f0-9]{40}$/.test(receipt.commit)) throw Error('发布回执不匹配。');
const { MOTION_ASSETS } = await import('../../lib/motion/asset-manifest.ts');
const failures = [];
async function get(path) {
  const response = await fetch(config.siteUrl + path, { cache: 'no-store', signal: AbortSignal.timeout(20_000), redirect: 'error' });
  if (!response.ok) throw Error(`${path}: HTTP ${response.status}`);
  return response;
}
try {
  const live = await (await get('/build-info.json')).json();
  if (live.commit !== receipt.commit || live.dirty) throw Error('线上版本与待发布版本不一致');
  for (const route of ['/', '/mahjong', '/holdem', '/history', '/emotes']) {
    const response = await get(route);
    if (!(await response.text()).includes('</html>')) throw Error(`${route}: 不是应用页面`);
  }
  const entries = Object.entries(MOTION_ASSETS);
  // Three concurrent asset reads; no gameplay or private API requests.
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (entries.length) {
      const [src, asset] = entries.shift();
      try {
        const response = await get(src + '?v=' + asset.revision);
        if (!response.headers.get('content-type')?.startsWith('image/webp')) throw Error('返回内容不是图片');
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length !== asset.bytes || createHash('sha256').update(bytes).digest('hex').slice(0, 20) !== asset.revision) throw Error('素材内容不一致');
      } catch (error) { failures.push(`${src}: ${error.message}`); }
    }
  }));
} catch (error) { failures.push(error.message); }
writeFileSync('release/online-verification.json', JSON.stringify({ commit: receipt.commit, siteUrl: config.siteUrl, status: failures.length ? 'incomplete' : 'passed', checkedAt: new Date().toISOString(), failures }, null, 2) + '\n');
if (failures.length) throw Error('线上检查尚未通过：\n' + failures.join('\n'));
console.log('线上版本、五个入口和全部动画素材通过检查。实际点击与手机布局按 docs/testing.md 检查。');
