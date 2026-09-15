const MiB = 1024 * 1024;

/** Change budgets here, not independently in the picker, games or gallery. */
export const MOTION_CACHE_POLICY = {
  diskBytes: 128 * MiB,
  automaticBytes: 32 * MiB,
  idleDecodedBytes: 32 * MiB,
  maxAssetBytes: 4 * MiB,
  maxSheetPixels: 4096 * 4096,
  fetchTimeoutMs: 12_000,
  retiredGraceMs: 7 * 24 * 60 * 60 * 1000,
  touchIntervalMs: 60_000,
} as const;

export function planAnimationDownloads(sources: readonly string[], sizes: Record<string, { bytes: number }>, saved: Set<string>, budget: number) {
  const selected: string[] = [];
  let bytes = 0;
  for (const src of sources) {
    if (saved.has(src)) continue;
    if (bytes + sizes[src].bytes > budget) continue;
    selected.push(src);
    bytes += sizes[src].bytes;
  }
  return { sources: selected, bytes };
}
