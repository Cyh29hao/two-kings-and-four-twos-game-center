import { MOTION_CATALOG } from './catalog.ts';
import { MOTION_ASSETS } from './asset-manifest.ts';
import { motionAssetStore, type MotionAssetStore } from './asset-cache.ts';
import { MOTION_CACHE_POLICY, planAnimationDownloads } from './cache-policy.ts';

export const ANIMATION_SOURCES = MOTION_CATALOG.filter(asset => asset.active).map(asset => asset.src);
export const ANIMATION_BYTES = ANIMATION_SOURCES.reduce((sum, src) => sum + MOTION_ASSETS[src].bytes, 0);
export type CacheProgress = { status: 'idle' | 'running' | 'done' | 'partial' | 'unavailable'; completed: number; total: number };
const initial: CacheProgress = { status: 'idle', completed: 0, total: ANIMATION_SOURCES.length };
let progress = initial;
const listeners = new Set<() => void>();
function update(next: CacheProgress) { progress = next; for (const listener of listeners) listener(); }
export const animationCacheSnapshot = () => progress;
export const animationCacheServerSnapshot = () => initial;
export function subscribeAnimationCache(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

/** A shared, testable queue. No game creates a downloader of its own. */
export function createAnimationPreloader(sources: readonly string[], sizes: Record<string, { bytes: number }>, env: {
  store: () => MotionAssetStore; idle: () => Promise<void>; publish: (state: CacheProgress) => void;
  automaticBytes?: number; diskBytes?: number;
}) {
  let job: Promise<void> | undefined;
  let automaticStarted = false;
  const total = sources.length;
  const publish = (status: CacheProgress['status'], completed: number) => env.publish({ status, completed, total });
  const count = (saved: Set<string>) => sources.filter(src => saved.has(src)).length;
  return {
    async inspect() {
      if (job) return;
      const store = env.store();
      if (!await store.available()) { publish('unavailable', 0); return; }
      const completed = count(await store.cached());
      if (!job) publish(completed === total ? 'done' : 'idle', completed);
    },
    run(manual = true) {
      if (job) return job;
      if (!manual && automaticStarted) return Promise.resolve();
      automaticStarted = true;
      job = (async () => {
        const store = env.store();
        if (!await store.available()) { publish('unavailable', 0); return; }
        if (manual) store.retryStorage();
        await store.maintain();
        const saved = await store.cached();
        const used = sources.reduce((sum, src) => sum + (saved.has(src) ? sizes[src].bytes : 0), 0);
        const room = Math.max(0, (env.diskBytes ?? MOTION_CACHE_POLICY.diskBytes) - used);
        const budget = manual ? room : Math.min(room, env.automaticBytes ?? MOTION_CACHE_POLICY.automaticBytes);
        const plan = planAnimationDownloads(sources, sizes, saved, budget);
        let completed = count(saved);
        publish('running', completed);
        for (const src of plan.sources) {
          if (!store.canPersist()) break;
          await env.idle();
          try { if ((await store.get(src)).persisted) completed++; }
          catch { /* A missing image cannot stop the remaining pack or the game. */ }
          publish('running', completed);
        }
        completed = count(await store.cached());
        publish(completed === total ? 'done' : 'partial', completed);
      })().catch(() => publish('partial', 0)).finally(() => { job = undefined; });
      return job;
    },
  };
}

async function idle() {
  if (document.hidden) await new Promise<void>(resolve => {
    const visible = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', visible); resolve(); } };
    document.addEventListener('visibilitychange', visible);
    visible();
  });
  await new Promise<void>(resolve => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(() => resolve(), { timeout: 1000 });
    else setTimeout(resolve, 60);
  });
  // The page might have become hidden while waiting for idle time.
  if (document.hidden) await idle();
}
const sharedQueue = createAnimationPreloader(ANIMATION_SOURCES, MOTION_ASSETS, { store: motionAssetStore, idle, publish: update });
export const inspectAnimationCache = () => sharedQueue.inspect();
export const cacheAllAnimations = (manual = true) => sharedQueue.run(manual);
export function allowAutomaticAnimationCache() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType ?? '');
}
