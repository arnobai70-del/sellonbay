import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:net';
import { clamavReady, clamavSettings, scanWithClamav } from '@/lib/scan/clamav';

type Reply = 'PONG' | 'stream: OK' | 'stream: Eicar-Test-Signature FOUND' | 'stream: FAILED ERROR';
async function mockDaemon(reply: Reply, cb: (port: number) => Promise<void>) {
  const server = createServer((socket) => {
    let data = Buffer.alloc(0);
    socket.on('data', (chunk: Buffer) => {
      data = Buffer.concat([data, chunk]);
      if (data.subarray(0, 6).toString() === 'zPING\0') {
        socket.end(Buffer.from('PONG\0'));
        return;
      }
      if (data.subarray(0, 10).toString() === 'zINSTREAM\0' && data.length > 14 && data.subarray(-4).equals(Buffer.alloc(4))) {
        socket.end(Buffer.from(reply + '\0'));
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  if (typeof addr !== 'object' || addr === null) throw new Error('No test server address');
  try {
    await cb(addr.port);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve()));
  }
}

afterEach(() => {
  delete process.env.CLAMAV_HOST;
  delete process.env.CLAMAV_PORT;
});

describe('ClamAV scanning (synthetic local protocol fixture)', () => {
  it('does not declare production-ready from missing or invalid settings', () => {
    expect(clamavSettings({})).toBeNull();
    expect(clamavSettings({ CLAMAV_HOST: 'localhost', CLAMAV_PORT: '0' })).toBeNull();
    expect(clamavSettings({ CLAMAV_HOST: 'clamav.internal', CLAMAV_PORT: '3310' })).toEqual({ host: 'clamav.internal', port: 3310 });
  });
  it('accepts a real clamd PONG before declaring ready', async () => {
    await mockDaemon('PONG', async (port) => {
      expect(await clamavReady({ host: '127.0.0.1', port })).toBe(true);
    });
  });
  it('labels clamd OK as clean, FOUND as infected, ERROR as unknown', async () => {
    for (const [reply, expected] of [
      ['stream: OK', 'clean'],
      ['stream: Eicar-Test-Signature FOUND', 'infected'],
      ['stream: FAILED ERROR', 'unknown'],
    ] as const) {
      await mockDaemon(reply, async (port) => {
        const scan = await scanWithClamav(Buffer.from('standard benign test bytes'), { host: '127.0.0.1', port });
        expect(scan.status).toBe(expected);
      });
    }
  });
  it('fails closed if the daemon is unavailable or the scan is empty/oversized', async () => {
    expect((await scanWithClamav(new Uint8Array([]), { host: '127.0.0.1', port: 1 })).status).toBe('unknown');
    expect((await scanWithClamav(Buffer.from('test'), { host: '127.0.0.1', port: 1 })).status).toBe('unknown');
    expect((await scanWithClamav(new Uint8Array(50 * 1024 * 1024 + 1), { host: '127.0.0.1', port: 1 })).status).toBe('unknown');
  });
});
