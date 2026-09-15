import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const walk = root => readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(root, entry.name)) : entry.name.endsWith('.md') ? [path.join(root, entry.name)] : []);
const files = ['README.md', 'AGENTS.md', ...walk('docs')];
const missing = [];
for (const file of files) {
  for (const match of readFileSync(file, 'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^\w+:/.test(target) || target.startsWith('/')) continue;
    if (!existsSync(path.resolve(path.dirname(file), decodeURIComponent(target)))) missing.push(`${file} -> ${target}`);
  }
}
if (missing.length) throw Error('文档链接不存在：\n' + missing.join('\n'));
console.log(`${files.length} 份文档的本地链接通过检查。`);
