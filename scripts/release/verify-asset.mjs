import { createHash } from 'node:crypto';

export function validatePublishedWebp(contentType, bytes, asset) {
  // Sites may serve binary assets as octet-stream. Verify their actual bytes.
  const mime = (contentType || '').split(';')[0].trim().toLowerCase();
  if (!['image/webp', 'application/octet-stream'].includes(mime)) throw Error('返回内容不是图片');
  if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw Error('返回内容不是 WebP');
  if (bytes.length !== asset.bytes || createHash('sha256').update(bytes).digest('hex').slice(0, 20) !== asset.revision) throw Error('素材内容不一致');
}
