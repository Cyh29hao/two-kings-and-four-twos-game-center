import { MOTION_ASSETS } from './asset-manifest.ts';
import { MOTION_CACHE_POLICY } from './cache-policy.ts';

export const MOTION_CACHE_NAME = 'yule-motion-images-v1';
type Manifest = Record<string, { revision: string; bytes: number }>;
type ImageCache = Pick<Cache, 'match' | 'put' | 'delete' | 'keys'>;
type CacheResult = { blob: Blob; persisted: boolean };
type Entry = { bytes: number; touched: number };
type Environment = {
  origin: string;
  openCache: () => Promise<ImageCache | null>;
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  now?: () => number;
  diskBytes?: number;
  exclusive?: <T>(work: () => Promise<T>) => Promise<T>;
};

/** Public image bytes only. This store never intercepts API or login requests. */
export function createMotionAssetStore(manifest: Manifest, env: Environment) {
  const pending = new Map<string, Promise<CacheResult>>();
  const inventory = new Map<string, Entry>();
  const now = env.now ?? Date.now;
  const budget = env.diskBytes ?? MOTION_CACHE_POLICY.diskBytes;
  let cachePromise: Promise<ImageCache | null> | undefined;
  let writes: Promise<unknown> = Promise.resolve();
  let storageFull = false;
  const cache = () => cachePromise ??= env.openCache().catch(() => null);
  const exclusive = <T>(work: () => Promise<T>) => {
    const next = writes.then(() => env.exclusive ? env.exclusive(work) : work());
    writes = next.catch(() => {});
    return next;
  };

  function key(src: string) {
    if (!Object.hasOwn(manifest, src) || !/^\/(?:emotes|effects)\/[a-zA-Z0-9_/-]+\.webp$/.test(src)) throw Error('未知动画素材');
    const url = new URL(src, env.origin);
    url.searchParams.set('v', manifest[src].revision);
    return url.href;
  }

  async function imageBlob(response: Response, src: string) {
    if (response.status !== 200 || !/^image\/webp(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw Error('动画素材暂不可用');
    const blob = await response.blob();
    if (blob.size !== manifest[src].bytes) throw Error('动画素材尚未更新完成');
    return blob;
  }

  async function remove(storage: ImageCache, url: string) {
    await storage.delete(url);
    inventory.delete(url);
  }

  // Read metadata for new keys only; do not read every image body after each save.
  async function scan(storage: ImageCache) {
    const keys = new Set((await storage.keys()).map(request => request.url));
    for (const url of inventory.keys()) if (!keys.has(url)) inventory.delete(url);
    for (const url of keys) {
      if (inventory.has(url)) continue;
      const response = await storage.match(url);
      if (!response) continue;
      const parsed = new URL(url), known = manifest[parsed.pathname];
      const expected = known?.revision === parsed.searchParams.get('v') ? known.bytes : undefined;
      const bytes = Number(response.headers.get('X-Yule-Bytes')) || expected || (await response.blob()).size;
      const touched = Number(response.headers.get('X-Yule-Used')) || 0;
      inventory.set(url, { bytes, touched });
    }
  }

  async function trim(storage: ImageCache, needed = 0, protectedUrl?: string) {
    await scan(storage);
    // Recently used retired entries get a grace period for older open tabs.
    for (const [url, entry] of inventory) {
      const parsed = new URL(url), asset = manifest[parsed.pathname];
      const current = parsed.origin === env.origin && asset?.revision === parsed.searchParams.get('v');
      if (!current && now() - entry.touched > MOTION_CACHE_POLICY.retiredGraceMs) await remove(storage, url);
    }
    let bytes = [...inventory].reduce((sum, [url, entry]) => sum + (url === protectedUrl ? 0 : entry.bytes), 0);
    for (const [url, entry] of [...inventory].sort((a, b) => a[1].touched - b[1].touched)) {
      if (bytes + needed <= budget) break;
      if (url === protectedUrl) continue;
      await remove(storage, url);
      bytes -= entry.bytes;
    }
  }

  async function persist(storage: ImageCache, url: string, blob: Blob) {
    if (storageFull || blob.size > budget) return false;
    try {
      return await exclusive(async () => {
        await trim(storage, blob.size, url);
        const touched = now();
        await storage.put(url, new Response(blob, { headers: {
          'Content-Type': 'image/webp', 'X-Yule-Bytes': String(blob.size), 'X-Yule-Used': String(touched),
        } }));
        inventory.set(url, { bytes: blob.size, touched });
        return true;
      });
    } catch (error) {
      // Stop background write attempts for this page after a real quota failure.
      if ((error as Error)?.name === 'QuotaExceededError') storageFull = true;
      return false;
    }
  }

  async function load(src: string): Promise<CacheResult> {
    const url = key(src), storage = await cache();
    if (storage) {
      const hit = await storage.match(url).catch(() => undefined);
      if (hit) {
        try {
          const touched = Number(hit.headers.get('X-Yule-Used')) || 0;
          const blob = await imageBlob(hit, src);
          inventory.set(url, { bytes: blob.size, touched: now() });
          // Touches are throttled so a frequently rendered cover does not churn storage.
          if (now() - touched > MOTION_CACHE_POLICY.touchIntervalMs) await persist(storage, url, blob);
          return { blob, persisted: true };
        } catch { await storage.delete(url).catch(() => false); inventory.delete(url); }
      }
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), MOTION_CACHE_POLICY.fetchTimeoutMs);
    let blob: Blob;
    try { blob = await imageBlob(await env.fetch(url, { credentials: 'omit', cache: 'force-cache', signal: controller.signal }), src); }
    finally { clearTimeout(timer); }
    return { blob, persisted: storage ? await persist(storage, url, blob) : false };
  }

  return {
    supports: (src: string) => Object.hasOwn(manifest, src),
    url: key,
    get(src: string) {
      let promise = pending.get(src);
      if (promise) return promise;
      promise = load(src);
      pending.set(src, promise);
      void promise.finally(() => { if (pending.get(src) === promise) pending.delete(src); }).catch(() => {});
      return promise;
    },
    async available() { return !!await cache(); },
    canPersist: () => !storageFull,
    retryStorage: () => { storageFull = false; },
    async maintain() {
      const storage = await cache();
      if (storage) await exclusive(() => trim(storage)).catch(() => {});
    },
    async cached() {
      const storage = await cache();
      if (!storage) return new Set<string>();
      const keys = new Set((await storage.keys().catch(() => [])).map(request => request.url));
      return new Set(Object.keys(manifest).filter(src => keys.has(key(src))));
    },
    async invalidate(src: string) {
      const storage = await cache();
      if (storage) await exclusive(() => remove(storage, key(src))).catch(() => {});
    },
  };
}

export type MotionAssetStore = ReturnType<typeof createMotionAssetStore>;
let browserStore: MotionAssetStore | undefined;
export function motionAssetStore() {
  return browserStore ??= createMotionAssetStore(MOTION_ASSETS, {
    origin: window.location.origin,
    openCache: async () => { try { return await window.caches.open(MOTION_CACHE_NAME); } catch { return null; } },
    fetch: (url, options) => window.fetch(url, options),
    exclusive: async work => await (navigator.locks ? navigator.locks.request(MOTION_CACHE_NAME, work) : work()),
  });
}
