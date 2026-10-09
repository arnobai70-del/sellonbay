import 'server-only';
import { audit } from './admin/audit';
import { DAY_MS } from './config';
import { acct, payoutBatch, sellerKey, split } from './ledger';
import { ledgerStore } from './ledgerStore';
import { notify } from './notify';
import { listExtras } from './orders/extra';
import { move } from './orders/service';
import { orderStore } from './orders/store';
import type { Order } from './orders/machine';
import { createAdminClient } from './supabase/server';
import { claimReserves, releasedUnpaid, reservesOutstanding, unclaimReserves } from './reserve';

/*
 * Weekly payouts, paid by hand. The batch (one per seller per week, Sunday) lists what each seller is owed from orders whose 7-day hold has ended.
 * An admin downloads the CSV, sends the money through Payoneer, Wise or the bank, then marks each payout paid with the transfer reference.
 * Marking paid is what moves the money in the ledger (seller_available -> payout_out) and the orders to paid_out. Nothing here talks to a payment company.
 */
export type PayoutStatus = 'scheduled' | 'exported' | 'paid' | 'failed';
export type Payout = {
  id: string;
  sellerId: string;
  sellerName: string;
  method: string;
  account: string; // where to send it (the seller's own payout details)
  amountCents: number;
  weekStart: string; // YYYY-MM-DD, the Sunday
  status: PayoutStatus;
  reference?: string;
  orderIds: string[];
  createdAt: number;
  exportedAt?: number;
  paidAt?: number;
};
export type Skipped = { sellerId: string; reason: string; amountCents: number };

/* The Sunday on or before this moment (UTC), as a date string. */
export const weekStartOf = (ms: number) => {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  d.setTime(d.getTime() - d.getUTCDay() * DAY_MS);
  return d.toISOString().slice(0, 10);
};

/* What the seller earns from one order: their share, plus their share of funded extra work, minus any dispute refund. Matches the ledger. */
export async function sellerEarnings(o: Order): Promise<number> {
  const { sellerNet } = split(o.lines, o.feeCents);
  const extras = (await listExtras(o.id)).filter((c) => c.state === 'funded');
  return sellerNet + extras.reduce((s, c) => s + c.priceCents - c.feeCents, 0) - o.refundedCents;
}

/* ---------- storage ---------- */
type Mem = { payouts: Map<string, Payout>; sellers: Map<string, { name: string; method: string; account: string }> };
const mem: Mem = ((globalThis as { __payoutMem?: Mem }).__payoutMem ??= { payouts: new Map(), sellers: new Map() });
/* Memory mode has no seller accounts. Tests and the demo register their payout details here. */
export const registerSellerPayout = (sellerId: string, name: string, method: string, account: string) => mem.sellers.set(sellerId, { name, method, account });

let ready: { ok: boolean; at: number } | undefined;
async function pg() {
  if ((await orderStore()).kind !== 'postgres') return false;
  if (!ready || (!ready.ok && Date.now() - ready.at > 30_000)) {
    const { error } = await createAdminClient().from('payout_items').select('order_id').limit(1);
    ready = { ok: !error, at: Date.now() };
  }
  return ready.ok;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sellerInfo(ids: string[]): Promise<Map<string, { name: string; method: string; account: string }>> {
  const out = new Map<string, { name: string; method: string; account: string }>();
  for (const id of ids) {
    const m = mem.sellers.get(id);
    if (m) out.set(id, m);
  }
  const real = ids.filter((i) => UUID.test(i));
  if (real.length && (await pg())) {
    const db = createAdminClient();
    const [{ data: sp }, { data: pr }] = await Promise.all([
      db.from('seller_profiles').select('user_id, display_name, payout_method, payout_ref').in('user_id', real),
      db.from('profiles').select('id, full_name').in('id', real),
    ]);
    for (const id of real) {
      const s = sp?.find((x) => x.user_id === id);
      const name = s?.display_name || pr?.find((x) => x.id === id)?.full_name || 'Seller';
      out.set(id, { name, method: s?.payout_method ?? '', account: s?.payout_ref ?? '' });
    }
  }
  return out;
}

type Row = Record<string, unknown>;
const toPayout = (r: Row, items: string[], info?: { name: string; method: string; account: string }): Payout => ({
  id: r.id as string,
  sellerId: r.seller_id as string,
  sellerName: info?.name ?? 'Seller',
  method: (r.method as string) ?? info?.method ?? '',
  account: info?.account ?? '',
  amountCents: r.amount_cents as number,
  weekStart: (r.week_start as string) ?? '',
  status: r.status as PayoutStatus,
  reference: (r.reference as string) ?? undefined,
  orderIds: items,
  createdAt: Date.parse(r.created_at as string),
  exportedAt: r.exported_at ? Date.parse(r.exported_at as string) : undefined,
  paidAt: r.paid_at ? Date.parse(r.paid_at as string) : undefined,
});

export async function listPayouts(opts: { weekStart?: string; status?: PayoutStatus[] } = {}): Promise<Payout[]> {
  let list: Payout[];
  if (await pg()) {
    const db = createAdminClient();
    let q = db.from('payouts').select('*').order('created_at', { ascending: false }).limit(500);
    if (opts.weekStart) q = q.eq('week_start', opts.weekStart);
    const { data } = await q;
    const rows = data ?? [];
    const { data: items } = rows.length
      ? await db
          .from('payout_items')
          .select('order_id, payout_id')
          .in(
            'payout_id',
            rows.map((r) => r.id),
          )
      : { data: [] as { order_id: string; payout_id: string }[] };
    const info = await sellerInfo([...new Set(rows.map((r) => r.seller_id as string))]);
    list = rows.map((r) =>
      toPayout(
        r,
        (items ?? []).filter((i) => i.payout_id === r.id).map((i) => i.order_id),
        info.get(r.seller_id),
      ),
    );
  } else {
    list = [...mem.payouts.values()].filter((p) => !opts.weekStart || p.weekStart === opts.weekStart).sort((a, b) => b.createdAt - a.createdAt);
  }
  return opts.status ? list.filter((p) => opts.status!.includes(p.status)) : list;
}

async function getPayout(id: string): Promise<Payout | null> {
  if (await pg()) {
    const { data } = await createAdminClient().from('payouts').select('*').eq('id', id).maybeSingle();
    if (!data) return null;
    const { data: items } = await createAdminClient().from('payout_items').select('order_id').eq('payout_id', id);
    return toPayout(
      data,
      (items ?? []).map((i) => i.order_id),
      (await sellerInfo([data.seller_id])).get(data.seller_id),
    );
  }
  return mem.payouts.get(id) ?? null;
}

/*
 * Makes this week's batch. For each seller: the orders whose hold ended and that are in no payout yet, added up.
 * Skipped (and said so): a seller with no payout method or account on file. A seller whose orders are in dispute is not affected, because a disputed
 * order never reaches the end of its hold, so it is simply not in the list yet.
 */
export async function planPayouts(now = Date.now(), adminId: string | null = null): Promise<{ created: Payout[]; skipped: Skipped[]; weekStart: string }> {
  const weekStart = weekStartOf(now);
  const store = await orderStore();
  const taken = new Set((await listPayouts()).filter((p) => p.status !== 'failed').flatMap((p) => p.orderIds));
  const ready = (await store.byState(['payout_pending'])).filter((o) => !taken.has(o.id));
  const bySeller = new Map<string, Order[]>();
  for (const o of ready) bySeller.set(sellerKey(o.sellerId), [...(bySeller.get(sellerKey(o.sellerId)) ?? []), o]);
  // A seller whose reserve was let go has money to be paid even when no new order is ready.
  const released = await releasedUnpaid();
  for (const r of released) if (!bySeller.has(r.sellerId)) bySeller.set(r.sellerId, []);
  const held = await reservesOutstanding(ready.map((o) => o.id)); // the part of an order still kept in reserve is not paid yet

  const info = await sellerInfo([...bySeller.keys()]);
  const L = await ledgerStore();
  const created: Payout[] = [];
  const skipped: Skipped[] = [];
  const existing = await listPayouts({ weekStart });
  for (const [sellerId, allOrders] of bySeller) {
    // What each order pays now: its earnings less the part still in reserve. An order that is all reserve waits for the release.
    const earned = await Promise.all(allOrders.map(sellerEarnings));
    const items = allOrders.map((o, k) => ({ o, cents: earned[k] - (held.get(o.id) ?? 0) })).filter((x) => x.cents > 0);
    const orders = items.map((x) => x.o);
    const amounts = items.map((x) => x.cents);
    const mine = released.filter((r) => r.sellerId === sellerId);
    const total = amounts.reduce((s, a) => s + a, 0) + mine.reduce((s, r) => s + r.cents, 0);
    if (total <= 0) continue;
    const i = info.get(sellerId);
    if (!i || !i.method || !i.account) {
      skipped.push({ sellerId, reason: 'no payout method on file', amountCents: total });
      continue;
    }
    if (existing.some((p) => p.sellerId === sellerId && p.status !== 'failed')) {
      skipped.push({ sellerId, reason: 'already has a payout this week', amountCents: total });
      continue;
    }
    // The ledger must agree: what we are about to pay cannot be more than the seller has available.
    const available = (await L.balances(acct.available(sellerId))).find((b) => b.account === acct.available(sellerId))?.holds ?? 0;
    const open = (await listPayouts()).filter((p) => p.sellerId === sellerId && (p.status === 'scheduled' || p.status === 'exported')).reduce((s, p) => s + p.amountCents, 0);
    if (total > available - open) {
      skipped.push({ sellerId, reason: 'ledger does not cover it, check this seller', amountCents: total });
      continue;
    }
    const p: Payout = {
      id: crypto.randomUUID(),
      sellerId,
      sellerName: i.name,
      method: i.method,
      account: i.account,
      amountCents: total,
      weekStart,
      status: 'scheduled',
      orderIds: orders.map((o) => o.id),
      createdAt: now,
    };
    if (await pg()) {
      const db = createAdminClient();
      const { error } = await db.from('payouts').insert({
        id: p.id,
        seller_id: sellerId,
        amount_cents: total,
        method: i.method,
        status: 'scheduled',
        scheduled_for: weekStart,
        week_start: weekStart,
        order_count: orders.length,
        created_at: new Date(now).toISOString(),
      });
      if (error) {
        skipped.push({ sellerId, reason: 'could not save: ' + error.message, amountCents: total });
        continue;
      }
      const ins = orders.length ? await db.from('payout_items').insert(orders.map((o, k) => ({ order_id: o.id, payout_id: p.id, amount_cents: amounts[k] }))) : { error: null };
      if (ins.error) {
        await db.from('payouts').delete().eq('id', p.id);
        skipped.push({ sellerId, reason: 'could not save items: ' + ins.error.message, amountCents: total });
        continue;
      }
    } else mem.payouts.set(p.id, p);
    await claimReserves(
      mine.map((r) => r.orderId),
      p.id,
    );
    created.push(p);
    await audit(adminId, 'payout_scheduled', 'payout', p.id, { sellerId, amountCents: total, orders: orders.length, weekStart });
  }
  return { created, skipped, weekStart };
}

/* ---------- the CSV ---------- */
/* A cell that starts with = + - @ is read as a formula by spreadsheets. A leading apostrophe keeps it text. */
export const csvCell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export const payoutsCsv = (rows: Payout[]) =>
  [
    ['Payout ID', 'Week starting', 'Seller', 'Seller ID', 'Method', 'Send to', 'Amount (USD)', 'Orders', 'Status'],
    ...rows.map((p) => [p.id, p.weekStart, p.sellerName, p.sellerId, p.method, p.account, (p.amountCents / 100).toFixed(2), p.orderIds.length, p.status]),
  ]
    .map((r) => r.map(csvCell).join(','))
    .join('\r\n') + '\r\n';

/* Locks the week's scheduled payouts as exported and returns them for the CSV. Already exported ones are included again (a re-download). */
export async function exportPayouts(weekStart: string, adminId: string | null, now = Date.now()): Promise<Payout[]> {
  const rows = await listPayouts({ weekStart, status: ['scheduled', 'exported'] });
  for (const p of rows.filter((x) => x.status === 'scheduled')) {
    if (await pg())
      await createAdminClient()
        .from('payouts')
        .update({ status: 'exported', exported_at: new Date(now).toISOString() })
        .eq('id', p.id)
        .eq('status', 'scheduled');
    else mem.payouts.set(p.id, { ...p, status: 'exported', exportedAt: now });
    p.status = 'exported';
    p.exportedAt = now;
    await audit(adminId, 'payout_exported', 'payout', p.id, { amountCents: p.amountCents, weekStart });
  }
  if (rows.length) await audit(adminId, 'payout_csv_downloaded', 'payout_week', weekStart, { count: rows.length });
  return rows;
}

export type PayResult = { ok: true; payout: Payout } | { ok: false; status: number; error: string };
const fail = (status: number, error: string): PayResult => ({ ok: false, status, error });

/* The admin sent the money and says so, with the transfer reference. Moves the ledger and the orders. Only once. */
export async function markPaid(id: string, reference: string, adminId: string | null, now = Date.now()): Promise<PayResult> {
  const p = await getPayout(id);
  if (!p) return fail(404, 'Payout not found.');
  if (p.status === 'paid') return fail(409, 'This payout is already marked paid.');
  if (p.status === 'failed') return fail(409, 'This payout was marked failed.');
  if (p.status === 'scheduled') return fail(409, 'Download the CSV first, then mark it paid after you send the money.');
  const ref = reference.trim();
  if (ref.length < 3 || ref.length > 120) return fail(400, 'Write the transfer reference (3 to 120 characters).');
  const L = await ledgerStore();
  try {
    await L.post(payoutBatch(p.sellerId, p.amountCents, p.id));
  } catch (e) {
    return fail(409, 'The ledger refused this payout: ' + (e instanceof Error ? e.message : 'unknown'));
  }
  for (const orderId of p.orderIds) {
    const r = await move(orderId, 'paid_out', { actorId: adminId, event: 'paid_out', meta: { payoutId: p.id, reference: ref } });
    if (!r.ok && r.status !== 409) console.error('payout: could not move order', orderId, r.error);
  }
  if (await pg())
    await createAdminClient()
      .from('payouts')
      .update({ status: 'paid', reference: ref, paid_at: new Date(now).toISOString(), marked_paid_by: adminId })
      .eq('id', p.id)
      .eq('status', 'exported');
  else mem.payouts.set(p.id, { ...p, status: 'paid', reference: ref, paidAt: now });
  await audit(adminId, 'payout_marked_paid', 'payout', p.id, { amountCents: p.amountCents, reference: ref });
  await notify(p.sellerId, 'payout_sent', { amount: `$${(p.amountCents / 100).toFixed(2)}`, method: p.method });
  return { ok: true, payout: { ...p, status: 'paid', reference: ref, paidAt: now } };
}

/* The transfer did not go through. The orders are free to be in the next batch. */
export async function markFailed(id: string, adminId: string | null, note: string): Promise<PayResult> {
  const p = await getPayout(id);
  if (!p) return fail(404, 'Payout not found.');
  if (p.status === 'paid') return fail(409, 'A paid payout cannot be marked failed.');
  if (p.status === 'failed') return fail(409, 'Already marked failed.');
  if (await pg()) {
    await createAdminClient().from('payout_items').delete().eq('payout_id', id);
    await createAdminClient().from('payouts').update({ status: 'failed' }).eq('id', id);
  } else mem.payouts.set(p.id, { ...p, status: 'failed', orderIds: [] });
  await unclaimReserves(id); // released reserves in this payout go into the next one
  await audit(adminId, 'payout_marked_failed', 'payout', id, { note: note.slice(0, 300) });
  return { ok: true, payout: { ...p, status: 'failed' } };
}
