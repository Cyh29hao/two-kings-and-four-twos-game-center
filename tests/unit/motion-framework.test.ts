import test from 'node:test';
import assert from 'node:assert/strict';
import { collectMotionAssets } from '../../lib/motion/catalog.ts';
import { createAnimationPreloader, type CacheProgress } from '../../lib/motion/preload.ts';
import { createMotionAssetStore } from '../../lib/motion/asset-cache.ts';
import { EMOTES, type Emote } from '../../lib/emotes.ts';

function fixture() {
  const entries = new Map<string, Response>();
  const key = (v: RequestInfo | URL) => typeof v === 'string' ? v : v instanceof URL ? v.href : v.url;
  return { entries, async match(v: RequestInfo | URL) { return entries.get(key(v))?.clone(); },
    async put(v: RequestInfo | URL, r: Response) { entries.set(key(v), r.clone()); },
    async delete(v: RequestInfo | URL) { return entries.delete(key(v)); },
    async keys() { return [...entries.keys()].map(url => new Request(url)); } };
}
const response = () => new Response('data', { headers: { 'Content-Type': 'image/webp' } });
const definitions = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`/emotes/next/${i}.webp`, { bytes: 4, revision: 'v1' }]));

test('new packs automatically enter one catalog; history remains readable without preloading', () => {
  const old = { ...EMOTES[0], id: 'old', sendable: false };
  const source = EMOTES.find(e => e.frames)!;
  const next: Emote = { ...source, id: 'new-character', src: '/emotes/new/poster.webp', frames: { ...source.frames!, poster: '/emotes/new/alternate.webp', sheets: [{ ...source.frames!.sheets[0], src: '/emotes/new/sheet.webp' }] } };
  const result = collectMotionAssets([old, next], []);
  assert(result.find(a => a.src === old.src && !a.active));
  for (const src of [next.src, next.frames!.poster, next.frames!.sheets[0].src]) assert(result.find(a => a.src === src && a.active));
  assert.throws(() => collectMotionAssets([next, next], []), /重复/);
  assert.throws(() => collectMotionAssets([{ ...next, src: 'https://evil.example/a.webp' }], []));
  assert.throws(() => collectMotionAssets([{ ...next, frames: { ...next.frames!, frames: [{ sheet: 9, cell: 0, duration: 100 }] } }], []));
});

test('growing packages use bounded, sequential automatic downloads, shared jobs, and manual continuation', async () => {
  const cache = fixture(), defs = definitions(100); let calls = 0, active = 0, maxActive = 0;
  const store = createMotionAssetStore(defs, { origin: 'https://club.example', openCache: async () => cache, fetch: async () => { calls++; active++; maxActive = Math.max(maxActive, active); await Promise.resolve(); active--; return response(); } });
  const states: CacheProgress[] = [];
  const queue = createAnimationPreloader(Object.keys(defs), defs, { store: () => store, idle: async () => {}, publish: s => states.push(s), automaticBytes: 12 });
  const first = queue.run(false); assert.equal(queue.run(false), first); await first;
  assert.equal(calls, 3); assert.equal(states.at(-1)?.status, 'partial');
  await queue.run(false); assert.equal(calls, 3, 'remounts must not restart the automatic budget');
  await queue.run(); assert.equal(calls, 100); assert.equal(maxActive, 1); assert.equal(states.at(-1)?.status, 'done');
  await queue.run(); assert.equal(calls, 100, 'cached files must not redownload');
});

test('disk budget evicts least recently used art and never returns wrong image bytes', async () => {
  const cache = fixture(), defs = definitions(3), sources = Object.keys(defs); let now = 100000;
  const store = createMotionAssetStore(defs, { origin: 'https://club.example', now: () => now, diskBytes: 8, openCache: async () => cache, fetch: async () => response() });
  await store.get(sources[0]); now++; await store.get(sources[1]); now++; await store.get(sources[0]); now++; await store.get(sources[2]);
  const saved = await store.cached(); assert(saved.has(sources[0])); assert(!saved.has(sources[1])); assert(saved.has(sources[2]));
  assert.equal(cache.entries.size, 2);
});

test('retired assets expire, while legacy message assets still in the catalog survive cleanup', async () => {
  const cache = fixture(), defs = definitions(2), sources = Object.keys(defs); let now = 100000;
  const env = { origin: 'https://club.example', now: () => now, openCache: async () => cache, fetch: async () => response() };
  const before = createMotionAssetStore(defs, env); for (const src of sources) await before.get(src);
  now += 8 * 24 * 60 * 60 * 1000;
  const after = createMotionAssetStore({ [sources[0]]: defs[sources[0]] }, env); await after.maintain();
  assert.equal(cache.entries.size, 1); assert((await after.cached()).has(sources[0]));
});

test('quota failure stops background writes; explicit retry can recover later', async () => {
  const cache = fixture(), defs = definitions(4); let full = true, calls = 0;
  const put = cache.put; cache.put = async (key, value) => { if (full) throw new DOMException('Full', 'QuotaExceededError'); await put(key, value); };
  const store = createMotionAssetStore(defs, { origin: 'https://club.example', openCache: async () => cache, fetch: async () => { calls++; return response(); } });
  let state: CacheProgress | undefined;
  const queue = createAnimationPreloader(Object.keys(defs), defs, { store: () => store, idle: async () => {}, publish: next => { state = next; } });
  await queue.run(false); assert.equal(calls, 1); assert.equal(state?.status, 'partial');
  full = false; await queue.run(); assert.equal(state?.status, 'done'); assert.equal((await store.cached()).size, 4);
});

test('manual full-cache progress stays honest when the package outgrows the configured disk budget', async () => {
  const cache = fixture(), defs = definitions(10); let state: CacheProgress | undefined;
  const store = createMotionAssetStore(defs, { origin: 'https://club.example', diskBytes: 12, openCache: async () => cache, fetch: async () => response() });
  const queue = createAnimationPreloader(Object.keys(defs), defs, { store: () => store, diskBytes: 12, idle: async () => {}, publish: next => { state = next; } });
  await queue.run(); assert.equal(state?.completed, 3); assert.equal(state?.status, 'partial'); assert.equal(cache.entries.size, 3);
});
