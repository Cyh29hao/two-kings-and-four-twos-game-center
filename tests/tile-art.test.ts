import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {TILE_ART,tileFaceSrc} from '../lib/mahjong/art.ts';
test('34 normal physical tile identities and a separate back resolve to local, standalone assets',()=>{
 assert.equal(TILE_ART.length,34);assert.equal(new Set(TILE_ART).size,34);
 assert.equal(TILE_ART[0],'Man1');assert.equal(TILE_ART[9],'Pin1');assert.equal(TILE_ART[18],'Sou1');assert.equal(TILE_ART[33],'Haku');
 assert.equal(readdirSync('public/tiles').filter(s=>s.endsWith('.svg')).length,35);
 for(let t=0;t<34;t++){const svg=readFileSync('public'+tileFaceSrc(t),'utf8');assert(svg.includes('viewBox="0 0 300 400"'));assert(!/<(?:script|image|foreignObject)\b/.test(svg));assert(!/(?:href|url)\s*=["']https?:/.test(svg));}
 const white=readFileSync('public/tiles/Haku.svg','utf8');assert(white.includes('<rect'));assert(!white.includes('白'));
 assert.throws(()=>tileFaceSrc(-1));assert.throws(()=>tileFaceSrc(34));assert(readFileSync('public/tiles/LICENSE.txt','utf8').includes('CC0'));
});
