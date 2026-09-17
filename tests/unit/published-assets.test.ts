import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MOTION_ASSETS } from '../../lib/motion/asset-manifest.ts';
import { validatePublishedWebp } from '../../scripts/release/verify-asset.mjs';

test('published WebP accepts Sites binary MIME only with exact deployed asset bytes', () => {
  const [src, asset] = Object.entries(MOTION_ASSETS)[0];
  const bytes = readFileSync(new URL('../../public' + src, import.meta.url));
  assert.doesNotThrow(() => validatePublishedWebp('image/webp', bytes, asset));
  assert.doesNotThrow(() => validatePublishedWebp('application/octet-stream', bytes, asset));
  assert.throws(() => validatePublishedWebp('text/html', bytes, asset), /不是图片/);
  assert.throws(() => validatePublishedWebp('application/octet-stream', Buffer.from('<html>challenge</html>'), asset), /不是 WebP/);
  const corrupted = Buffer.from(bytes);
  corrupted[corrupted.length - 1] ^= 1;
  assert.throws(() => validatePublishedWebp('application/octet-stream', corrupted, asset), /内容不一致/);
  assert.throws(() => validatePublishedWebp('image/webp', bytes.subarray(0, 12), asset), /内容不一致/);
});
