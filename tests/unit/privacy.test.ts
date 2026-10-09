import { describe, expect, it } from 'vitest';
import { deletionBlockers, exportData, requestDeletion, stripSecrets } from '@/lib/privacy';

describe('your data', () => {
  it('removes secrets and private links from an export, at any depth', () => {
    const out = stripSecrets({
      name: 'Mira',
      password: 'x',
      nested: { api_key: 'k', token: 't', code_url: 'https://private', trial_url: 'storage:x', payment_ref: 'pay_1', payout_ref: 'GB00', keep: 1, list: [{ secret: 's', ok: true }] },
    });
    expect(out).toEqual({ name: 'Mira', nested: { keep: 1, list: [{ ok: true }] } });
  });
  it('a deletion is refused while money or a dispute is open, and says why in plain words', () => {
    expect(deletionBlockers({ openOrders: 0, openDisputes: 0, pendingPayouts: 0 })).toEqual([]);
    expect(deletionBlockers({ openOrders: 2, openDisputes: 0, pendingPayouts: 0 })[0]).toMatch(/2 order\(s\) are still open/);
    const all = deletionBlockers({ openOrders: 1, openDisputes: 1, pendingPayouts: 1 });
    expect(all).toHaveLength(3);
    expect(all.join(' ')).toMatch(/dispute/);
    expect(all.join(' ')).toMatch(/payout/);
  });
  it('in demo mode there is no account data to export or delete', async () => {
    expect(await exportData('demo:1.1.1.1')).toMatchObject({ note: expect.stringMatching(/demo/) });
    expect(await requestDeletion('demo:1.1.1.1')).toMatchObject({ ok: false, status: 404 });
  });
});
