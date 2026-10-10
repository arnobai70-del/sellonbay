import { createConnection } from 'node:net';
import { once } from 'node:events';
import type { MalwareResult } from './engine';

/**
 * ClamAV clamd TCP protocol. Operate clamd inside the trusted private
 * application network; NEVER expose its unauthenticated TCP port publicly.
 * Product files are streamed with zINSTREAM, never executed or unpacked here.
 */
export type ClamavSettings = { host: string; port: number };
const MAX_SCAN_BYTES = 50 * 1024 * 1024;
const BLOCK_BYTES = 512 * 1024;

export function clamavSettings(env: { CLAMAV_HOST?: string; CLAMAV_PORT?: string } = process.env): ClamavSettings | null {
  const host = (env.CLAMAV_HOST ?? '').trim();
  const port = Number(env.CLAMAV_PORT || '3310');
  if (!host || /[\/\s@]/.test(host) || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host, port };
}

async function command(settings: ClamavSettings, prefix: Buffer, bytes?: Uint8Array, timeoutMs = 15_000): Promise<string> {
  const socket = createConnection({ host: settings.host, port: settings.port });
  let finished = false;
  let reply = '';
  return new Promise<string>((resolve, reject) => {
    const complete = (value?: string, error?: Error) => {
      if (finished) return;
      finished = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(value ?? '');
    };
    socket.setTimeout(timeoutMs, () => complete(undefined, new Error('clamav_timeout')));
    socket.on('error', () => complete(undefined, new Error('clamav_unavailable')));
    socket.on('close', () => complete(undefined, new Error('clamav_closed')));
    socket.on('data', (chunk: Buffer) => {
      reply += chunk.toString('utf8');
      if (reply.length > 4096) return complete(undefined, new Error('clamav_response_too_large'));
      const end = reply.search(/[\0\n]/);
      if (end >= 0) complete(reply.slice(0, end).trim());
    });
    socket.once('connect', () => {
      void (async () => {
        try {
          const write = async (buf: Buffer) => {
            if (finished) throw new Error('clamav_disconnected');
            if (!socket.write(buf)) await once(socket, 'drain');
          };
          await write(prefix);
          if (bytes) {
            for (let offset = 0; offset < bytes.byteLength; offset += BLOCK_BYTES) {
              const part = Buffer.from(bytes.subarray(offset, offset + BLOCK_BYTES));
              const len = Buffer.alloc(4);
              len.writeUInt32BE(part.byteLength);
              await write(len);
              await write(part);
            }
            await write(Buffer.alloc(4));
          }
        } catch {
          complete(undefined, new Error('clamav_write_failed'));
        }
      })();
    });
  });
}

/** A response from a real clamd, not just presence of environment variables. */
export async function clamavReady(settings: ClamavSettings | null = clamavSettings()): Promise<boolean> {
  if (!settings) return false;
  try {
    return (await command(settings, Buffer.from('zPING\0'), undefined, 2_000)) === 'PONG';
  } catch {
    return false;
  }
}

export async function scanWithClamav(bytes: Uint8Array, settings: ClamavSettings | null = clamavSettings()): Promise<MalwareResult> {
  if (!settings) return { status: 'unknown', detail: ['Real antivirus is not configured.'] };
  if (!bytes.byteLength || bytes.byteLength > MAX_SCAN_BYTES) return { status: 'unknown', detail: ['File is empty or exceeds the antivirus size limit.'] };
  try {
    const response = await command(settings, Buffer.from('zINSTREAM\0'), bytes);
    if (/^stream:\s*OK$/i.test(response)) return { status: 'clean', detail: [] };
    if (/\bFOUND$/i.test(response)) return { status: 'infected', detail: ['ClamAV detected a malicious file.'] };
    return { status: 'unknown', detail: ['ClamAV could not finish scanning this file.'] };
  } catch {
    return { status: 'unknown', detail: ['ClamAV is unavailable or timed out.'] };
  }
}
