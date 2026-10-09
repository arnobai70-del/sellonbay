import 'server-only';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { type DownloadEvent, clientIp, logDownload } from './service';

export const MAX_FILE_BYTES = 500 * 1024 * 1024;

/* Pass a file through unchanged while counting its bytes and hashing it. The log row is written when the last byte has gone out. */
export function hashedStream(body: ReadableStream<Uint8Array>, maxBytes: number, onDone: (hash: string, bytes: number) => void): ReadableStream<Uint8Array> {
  const h = createHash('sha256');
  let bytes = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctl) {
        bytes += chunk.byteLength;
        if (bytes > maxBytes) return ctl.error(new Error('too_big'));
        h.update(chunk);
        ctl.enqueue(chunk);
      },
      flush() {
        onDone(h.digest('hex'), bytes);
      },
    }),
  );
}

const safeName = (s: string) => s.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 80) || 'download';
const headers = (name: string, extra: Record<string, string> = {}) => ({
  'content-type': 'application/octet-stream',
  'content-disposition': `attachment; filename="${safeName(name)}"`,
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  ...extra,
});

export function baseEvent(req: Request, orderId: string, kind: 'real' | 'demo' | 'trial', userId: string | null): Omit<DownloadEvent, 'file_hash' | 'bytes'> {
  return { order_id: orderId, kind, user_id: userId, ip: clientIp(req), user_agent: (req.headers.get('user-agent') ?? '').slice(0, 200) };
}

export async function sendBuffer(req: Request, buf: Buffer, name: string, ev: Omit<DownloadEvent, 'file_hash' | 'bytes'>) {
  await logDownload({ ...ev, file_hash: createHash('sha256').update(buf).digest('hex'), bytes: buf.length });
  return new NextResponse(new Uint8Array(buf), { headers: headers(name, { 'content-length': String(buf.length) }) });
}

export function sendUpstream(upstream: Response, name: string, ev: Omit<DownloadEvent, 'file_hash' | 'bytes'>) {
  const declared = Number(upstream.headers.get('content-length') ?? 0);
  if (declared > MAX_FILE_BYTES) return NextResponse.json({ error: 'That file is too large to deliver here.' }, { status: 413 });
  const body = hashedStream(upstream.body as ReadableStream<Uint8Array>, MAX_FILE_BYTES, (file_hash, bytes) => void logDownload({ ...ev, file_hash, bytes }));
  return new NextResponse(body, { headers: headers(name) });
}

export const filenameFromUrl = (raw: string, fallback: string) => {
  try {
    return decodeURIComponent(new URL(raw).pathname.split('/').filter(Boolean).pop() ?? '') || fallback;
  } catch {
    return fallback;
  }
};
