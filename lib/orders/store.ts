import 'server-only';
import { supabaseConfigured } from '../supabase/env';
import { createAdminClient } from '../supabase/server';
import type { Order, OrderEvent, OrderState } from './machine';

/*
 * Where orders are kept. With Supabase and migration 0015 applied they are rows in `orders` (+ the append-only `order_events`).
 * Without Supabase, or before the migration, they live in memory (lost on restart), so the whole flow can still be tried.
 * Both behave the same: a change is applied only if the order is still in the state the caller saw, together with its event.
 */
export interface OrderStore {
  readonly kind: 'postgres' | 'memory';
  insert(o: Order, created: OrderEvent): Promise<void>;
  get(id: string): Promise<Order | null>;
  /* Change state and log the event in one step. False if somebody else changed the order first. */
  apply(prev: Order, next: Order, event: OrderEvent): Promise<boolean>;
  /* Change fields without a change of state and without an event (for example payment attempts). */
  patch(prev: Order, next: Order): Promise<boolean>;
  events(id: string): Promise<OrderEvent[]>;
  /* A buyer's trial orders with one developer, for the trial credit. */
  trials(buyerId: string, devKey: string): Promise<Order[]>;
  /* Is this trial already credited to an order? */
  creditClaimed(trialId: string): Promise<boolean>;
  /* Orders where this person is the buyer or the seller, newest first. */
  forUser(userId: string): Promise<Order[]>;
  /* Orders in any of these states (the payout batch looks for payout_pending). */
  byState(states: string[]): Promise<Order[]>;
  /* Orders that could have something due: funded or in delivery, delivered, or accepted. */
  open(): Promise<Order[]>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isOrderId = (id: string) => UUID.test(id);

// ---------- memory ----------
type Mem = { orders: Map<string, Order>; events: OrderEvent[] };
const mem: Mem = ((globalThis as { __orderMem?: Mem }).__orderMem ??= { orders: new Map(), events: [] });

export const memoryStore: OrderStore = {
  kind: 'memory',
  async insert(o, created) {
    mem.orders.set(o.id, { ...o });
    mem.events.push(created);
  },
  async get(id) {
    const o = mem.orders.get(id);
    return o ? { ...o } : null;
  },
  async apply(prev, next, event) {
    const cur = mem.orders.get(prev.id);
    if (!cur || cur.state !== prev.state) return false;
    mem.orders.set(next.id, { ...next });
    mem.events.push(event);
    return true;
  },
  async patch(prev, next) {
    const cur = mem.orders.get(prev.id);
    if (!cur || cur.state !== prev.state) return false;
    mem.orders.set(next.id, { ...next });
    return true;
  },
  async events(id) {
    return mem.events.filter((e) => e.orderId === id);
  },
  async forUser(userId) {
    return [...mem.orders.values()]
      .filter((o) => o.buyerId === userId || o.sellerId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((o) => ({ ...o }));
  },
  async byState(states) {
    return [...mem.orders.values()].filter((o) => states.includes(o.state)).map((o) => ({ ...o }));
  },
  async trials(buyerId, devKey) {
    return [...mem.orders.values()].filter((o) => o.kind === 'trial' && o.buyerId === buyerId && o.devKey === devKey).map((o) => ({ ...o }));
  },
  async creditClaimed(trialId) {
    return [...mem.orders.values()].some((o) => o.trialCreditFor === trialId && o.state !== 'cancelled' && o.state !== 'refunded');
  },
  async open() {
    return [...mem.orders.values()].filter((o) => ['funded', 'in_delivery', 'delivered', 'accepted'].includes(o.state)).map((o) => ({ ...o }));
  },
};

// ---------- postgres ----------
type Col = { key: keyof Order; col: string; time?: boolean };
const COLS: Col[] = [
  { key: 'state', col: 'status' },
  { key: 'feeCents', col: 'fee_cents' },
  { key: 'refundedCents', col: 'refunded_cents' },
  { key: 'priceCents', col: 'price_cents' },
  { key: 'dueAt', col: 'due_at', time: true },
  { key: 'deliveredAt', col: 'delivered_at', time: true },
  { key: 'reviewEndsAt', col: 'review_ends_at', time: true },
  { key: 'acceptedAt', col: 'accepted_at', time: true },
  { key: 'payoutAfter', col: 'payout_after', time: true },
  { key: 'bugfixUntil', col: 'bugfix_until', time: true },
  { key: 'fundedAt', col: 'funded_at', time: true },
  { key: 'cancelledAt', col: 'cancelled_at', time: true },
  { key: 'attempts', col: 'attempts' },
  { key: 'domain', col: 'domain' },
  { key: 'githubUsername', col: 'github_username' },
  { key: 'lines', col: 'lines' },
  { key: 'licence', col: 'licence' },
];
const iso = (ms: number | undefined) => (ms === undefined ? null : new Date(ms).toISOString());
const ms = (v: string | null | undefined) => (v ? Date.parse(v) : undefined);

/* Only the columns that changed, in the shape the database function expects. */
function diff(prev: Order, next: Order): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const c of COLS) {
    const a = prev[c.key],
      b = next[c.key];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    patch[c.col] = c.time ? iso(b as number | undefined) : (b ?? null);
  }
  if (JSON.stringify(prev.payment) !== JSON.stringify(next.payment)) {
    patch.payment_ref = next.payment?.ref ?? null;
    patch.payment_brand = next.payment?.brand ?? null;
    patch.payment_last4 = next.payment?.last4 ?? null;
  }
  return patch;
}

type Row = Record<string, unknown>;
const toRow = (o: Order): Row => ({
  id: o.id,
  kind: o.kind,
  pkg: o.pkg,
  delivery_type: o.deliveryType,
  status: o.state,
  title: o.title,
  buyer_id: o.buyerId,
  seller_id: o.sellerId,
  product_id: o.productId,
  product_key: o.productKey,
  dev_key: o.devKey,
  brief: o.brief ?? null,
  lines: o.lines,
  price_cents: o.priceCents,
  fee_cents: o.feeCents,
  refunded_cents: o.refundedCents,
  currency: o.currency,
  days: o.days,
  express: o.express,
  instant: o.instant,
  demo: o.demo,
  domain: o.domain ?? null,
  app_name: o.appName ?? null,
  oses: o.oses ?? null,
  github_username: o.githubUsername ?? null,
  licence: o.licence ?? null,
  payment_ref: o.payment?.ref ?? null,
  payment_brand: o.payment?.brand ?? null,
  payment_last4: o.payment?.last4 ?? null,
  attempts: o.attempts,
  trial_credit_for: o.trialCreditFor ?? null,
  created_at: iso(o.createdAt),
  funded_at: iso(o.fundedAt),
  due_at: iso(o.dueAt),
  delivered_at: iso(o.deliveredAt),
  review_ends_at: iso(o.reviewEndsAt),
  accepted_at: iso(o.acceptedAt),
  payout_after: iso(o.payoutAfter),
  bugfix_until: iso(o.bugfixUntil),
  cancelled_at: iso(o.cancelledAt),
});
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const fromRow = (r: Row): Order => ({
  id: r.id as string,
  kind: r.kind as Order['kind'],
  pkg: r.pkg as Order['pkg'],
  deliveryType: r.delivery_type as Order['deliveryType'],
  state: r.status as OrderState,
  title: (r.title as string) ?? '',
  buyerId: (r.buyer_id as string) ?? null,
  sellerId: (r.seller_id as string) ?? null,
  productId: (r.product_id as string) ?? null,
  productKey: (r.product_key as string) ?? null,
  devKey: (r.dev_key as string) ?? null,
  brief: str(r.brief),
  lines: (r.lines as Order['lines']) ?? [],
  priceCents: r.price_cents as number,
  feeCents: r.fee_cents as number,
  refundedCents: (r.refunded_cents as number) ?? 0,
  currency: (r.currency as string) ?? 'USD',
  days: r.days as number,
  express: !!r.express,
  instant: !!r.instant,
  demo: !!r.demo,
  domain: (r.domain as Order['domain']) ?? undefined,
  appName: str(r.app_name),
  oses: (r.oses as string[]) ?? undefined,
  githubUsername: str(r.github_username),
  licence: str(r.licence),
  payment: r.payment_ref ? { ref: r.payment_ref as string, brand: (r.payment_brand as string) ?? '', last4: (r.payment_last4 as string) ?? '' } : undefined,
  attempts: (r.attempts as number) ?? 0,
  trialCreditFor: str(r.trial_credit_for),
  createdAt: Date.parse(r.created_at as string),
  fundedAt: ms(str(r.funded_at)),
  dueAt: ms(str(r.due_at)),
  deliveredAt: ms(str(r.delivered_at)),
  reviewEndsAt: ms(str(r.review_ends_at)),
  acceptedAt: ms(str(r.accepted_at)),
  payoutAfter: ms(str(r.payout_after)),
  bugfixUntil: ms(str(r.bugfix_until)),
  cancelledAt: ms(str(r.cancelled_at)),
});
const eventRow = (e: OrderEvent) => ({ order_id: e.orderId, actor_id: e.actorId, event: e.event, from_state: e.from, to_state: e.to, meta: e.meta, created_at: iso(e.at) });

export const postgresStore: OrderStore = {
  kind: 'postgres',
  async insert(o, created) {
    const db = createAdminClient();
    const { error } = await db.from('orders').insert(toRow(o));
    if (error) throw new Error('Could not save the order: ' + error.message);
    const ev = await db.from('order_events').insert(eventRow(created));
    if (ev.error) throw new Error('Could not log the order: ' + ev.error.message);
  },
  async get(id) {
    const { data } = await createAdminClient().from('orders').select('*').eq('id', id).maybeSingle();
    return data ? fromRow(data) : null;
  },
  async apply(prev, next, event) {
    const { data, error } = await createAdminClient().rpc('order_apply', {
      p_order: prev.id,
      p_from: prev.state,
      p_patch: diff(prev, next),
      p_event: { actor_id: event.actorId ?? '', event: event.event, from: event.from, to: event.to, meta: event.meta, at: iso(event.at) },
    });
    if (error) throw new Error('Could not change the order: ' + error.message);
    return data === true;
  },
  async patch(prev, next) {
    const p = diff(prev, next);
    if (!Object.keys(p).length) return true;
    const { data, error } = await createAdminClient().from('orders').update(p).eq('id', prev.id).eq('status', prev.state).select('id');
    if (error) throw new Error('Could not change the order: ' + error.message);
    return (data?.length ?? 0) > 0;
  },
  async events(id) {
    const { data } = await createAdminClient().from('order_events').select('order_id, actor_id, event, from_state, to_state, meta, created_at').eq('order_id', id).order('id', { ascending: true });
    return (data ?? []).map((r) => ({ orderId: r.order_id, actorId: r.actor_id, event: r.event, from: r.from_state, to: r.to_state, meta: r.meta ?? {}, at: Date.parse(r.created_at) }));
  },
  async forUser(userId) {
    const { data } = await createAdminClient().from('orders').select('*').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order('created_at', { ascending: false }).limit(100);
    return (data ?? []).map(fromRow);
  },
  async byState(states) {
    const { data } = await createAdminClient().from('orders').select('*').in('status', states).limit(2000);
    return (data ?? []).map(fromRow);
  },
  async trials(buyerId, devKey) {
    const { data } = await createAdminClient().from('orders').select('*').eq('kind', 'trial').eq('buyer_id', buyerId).eq('dev_key', devKey);
    return (data ?? []).map(fromRow);
  },
  async creditClaimed(trialId) {
    const { data } = await createAdminClient().from('orders').select('id').eq('trial_credit_for', trialId).not('status', 'in', '(cancelled,refunded)').limit(1);
    return (data?.length ?? 0) > 0;
  },
  async open() {
    const { data } = await createAdminClient().from('orders').select('*').in('status', ['funded', 'in_delivery', 'delivered', 'accepted']).limit(500);
    return (data ?? []).map(fromRow);
  },
};

// ---------- which one ----------
let ready: { ok: boolean; at: number } | undefined;
/* True once migration 0015 is applied. A negative answer is rechecked every 30 seconds, so applying the migration needs no restart. */
async function ordersV2Ready() {
  if (ready && (ready.ok || Date.now() - ready.at < 30_000)) return ready.ok;
  const db = createAdminClient();
  const [o, e] = await Promise.all([db.from('orders').select('lines, instant').limit(1), db.from('order_events').select('from_state').limit(1)]);
  ready = { ok: !o.error && !e.error, at: Date.now() };
  return ready.ok;
}

export async function orderStore(): Promise<OrderStore> {
  if (!supabaseConfigured) return memoryStore;
  return (await ordersV2Ready()) ? postgresStore : memoryStore;
}
