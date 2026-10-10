// Runs every migration in order against an in-process Postgres (PGlite) with small stand-ins for Supabase (auth, storage, cron, roles).
// Catches SQL mistakes and clashes between migrations without touching any real database. Usage: node scripts/check-migrations.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(import.meta.dirname, '..', 'supabase', 'migrations');
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const db = new PGlite();

await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage; create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint);
  create schema cron; create table cron.job (jobid serial, jobname text);
  create function cron.unschedule(j int) returns boolean language sql as $$ select true $$;
  create function cron.schedule(a text, b text, c text) returns int language sql as $$ select 1 $$;
`);

let failed = false;
for (const f of files) {
  const sql = fs
    .readFileSync(path.join(dir, f), 'utf8')
    .replace(/create extension if not exists pg_cron;/g, '')
    .replace(/create extension if not exists pgcrypto;/g, '');
  try {
    await db.exec(sql);
    console.log('ok  ', f);
  } catch (e) {
    failed = true;
    console.log('FAIL', f, '\n     ', e.message);
    break;
  }
}
if (!failed) {
  const q = async (s) => (await db.query(s)).rows;
  console.log('orders columns:', (await q("select column_name from information_schema.columns where table_name='orders' order by 1")).length);
  console.log('ledger_entries columns:', (await q("select column_name from information_schema.columns where table_name='ledger_entries' order by 1")).map((r) => r.column_name).join(','));
  console.log('order_events columns:', (await q("select column_name from information_schema.columns where table_name='order_events' order by 1")).map((r) => r.column_name).join(','));
}
if (!failed) {
  // Smoke test of the two money functions.
  const t = async (name, fn) => {
    try {
      const r = await fn();
      console.log('ok  ', name, r === undefined ? '' : JSON.stringify(r));
    } catch (e) {
      failed = true;
      console.log('FAIL', name, e.message);
    }
  };
  const id = '11111111-1111-4111-8111-111111111111';
  await db.exec("insert into orders (id, price_cents, fee_cents, status) values ('" + id + "', 5000, 750, 'awaiting_payment')");
  const one = async (s) => Object.values((await db.query(s)).rows[0])[0];
  const ev = (e) => "'" + JSON.stringify({ event: e, from: 'awaiting_payment', to: 'funded', at: new Date().toISOString(), meta: { a: 1 } }) + "'::jsonb";
  await t('order_apply moves state and logs', async () =>
    one("select order_apply('" + id + '\', \'awaiting_payment\', \'{"status":"funded","funded_at":"2026-10-01T10:00:00Z","lines":[["Site",5000]],"payment_ref":"p1"}\'::jsonb, ' + ev('funded') + ')'),
  );
  await t('order_apply refuses a stale writer', async () => one("select order_apply('" + id + "', 'awaiting_payment', '{\"status\":\"accepted\"}'::jsonb, " + ev('stale') + ')'));
  await t('order_apply refuses unknown columns', async () => {
    try {
      await db.query("select order_apply('" + id + "', 'funded', '{\"buyer_id\":null}'::jsonb, " + ev('x') + ')');
      return 'NOT REFUSED';
    } catch {
      return 'refused';
    }
  });
  await t('order_events is append only', async () => {
    try {
      await db.query("update order_events set event='x'");
      return 'NOT REFUSED';
    } catch {
      try {
        await db.query('delete from order_events');
        return 'NOT REFUSED';
      } catch {
        return 'refused';
      }
    }
  });
  await t('events survive: count', async () => one("select count(*) from order_events where order_id='" + id + "'"));
  const lp = (key, lines) => "select ledger_post('" + key + "', '" + id + "', 'm', '" + JSON.stringify(lines) + "'::jsonb)";
  const pay = [
    { account: 'platform_cash', amountCents: 5000, side: 'debit' },
    { account: 'order_escrow:' + id, amountCents: 5000, side: 'credit' },
  ];
  await t('ledger_post once', async () => one(lp('pay:1', pay)));
  await t('ledger_post same key again', async () => one(lp('pay:1', pay)));
  await t('ledger_post unbalanced refused', async () => {
    try {
      await db.query(
        lp('bad', [
          { account: 'a', amountCents: 5, side: 'debit' },
          { account: 'b', amountCents: 4, side: 'credit' },
        ]),
      );
      return 'NOT REFUSED';
    } catch {
      return 'refused';
    }
  });
  await t('ledger_post below zero refused', async () => {
    try {
      await db.query(
        lp('neg', [
          { account: 'order_escrow:' + id, amountCents: 5001, side: 'debit' },
          { account: 'platform_cash', amountCents: 5001, side: 'credit' },
        ]),
      );
      return 'NOT REFUSED';
    } catch (e) {
      return /below zero/.test(e.message) ? 'refused' : 'wrong error: ' + e.message;
    }
  });
  await t('ledger_post: a seller reserve cannot go below zero', async () => {
    try {
      await db.query(
        lp('neg-reserve', [
          { account: 'seller_reserve:s1', amountCents: 100, side: 'debit' },
          { account: 'seller_available:s1', amountCents: 100, side: 'credit' },
        ]),
      );
      return 'NOT REFUSED';
    } catch (e) {
      return /below zero/.test(e.message) ? 'refused' : 'wrong error: ' + e.message;
    }
  });
  await t('ledger_post: a seller debt may be posted (it is what the seller owes)', async () =>
    one(
      lp('debt-1', [
        { account: 'seller_debt:s1', amountCents: 700, side: 'debit' },
        { account: 'platform_cash', amountCents: 700, side: 'credit' },
      ]),
    ),
  );
  await t('ledger_balances', async () => (await db.query('select * from ledger_balances order by account')).rows);
  await t('ledger append only', async () => {
    try {
      await db.query("update ledger_entries set memo='x'");
      return 'NOT REFUSED';
    } catch {
      return 'refused';
    }
  });
  await t('order_consents is append-only, and goes away only with its order', async () => {
    await db.exec("insert into order_consents (order_id, kind, text_version, ip, user_agent) values ('" + id + "', 'accept', 'accept-v1', '203.0.113.9', 'UA')");
    const out = [];
    for (const sql of ["update order_consents set ip = 'x'", 'delete from order_consents', 'truncate order_consents']) {
      try {
        await db.exec(sql);
        out.push('NOT REFUSED');
      } catch {
        out.push('refused');
      }
    }
    return out.join(',');
  });
  await t('deleting the order removes its events (cascade)', async () => {
    await db.exec("delete from orders where id='" + id + "'");
    return one('select (select count(*) from order_events) as events, (select count(*) from order_consents) as consents');
  });
}

// Transactional AI quota smoke tests on the ephemeral PGlite database.
// This is NOT a real Supabase staging test or a multi-session stress test.
if (!failed) {
  try {
    const claim = async (cookie, ip, budget = 2100, limit = 2, reserve = 900) => {
      const sql = 'select ai_reserve_run($1, $2, $3, $4::date, $5::integer, $6::bigint, $7::bigint) as value';
      const x = await db.query(sql, ['site-ideas', cookie, ip, '2026-10-10', limit, budget, reserve]);
      return x.rows[0].value;
    };
    const settle = async (id, tokens) =>
      (await db.query('select ai_settle_run($1::uuid, $2::bigint) as ok', [id, tokens])).rows[0].ok;
    const first = await claim('cookie:user-a', 'ip:same-hash');
    const second = await claim('cookie:user-a', 'ip:same-hash');
    if (!first.allowed || !second.allowed || first.left !== 1 || second.left !== 0) throw new Error('Did not reserve two daily claims');
    const overDaily = await claim('cookie:different', 'ip:same-hash');
    if (overDaily.allowed || overDaily.reason !== 'daily') throw new Error('Parallel IP quota is not enforced');
    const overBudget = await claim('cookie:user-b', 'ip:different');
    if (overBudget.allowed || overBudget.reason !== 'budget') throw new Error('Pending reservations were not counted in global monthly budget');
    if (!(await settle(first.id, 200))) throw new Error('First settlement did not persist');
    if (!(await settle(first.id, 200))) throw new Error('Repeat settlement was not idempotent');
    const spent = (await db.query("select tokens_in from ai_usage where subject='global' and tool='site-ideas' and day='2026-10-10'")).rows[0].tokens_in;
    if (Number(spent) !== 200) throw new Error('Idempotent settlement charged twice');
    const availableAfterSettlement = await claim('cookie:user-b', 'ip:different');
    if (!availableAfterSettlement.allowed) throw new Error('Unused budget not returned after a successful settlement');
    let rejectedTooMuch = false;
    try { await settle(second.id, 901); } catch { rejectedTooMuch = true; }
    if (!rejectedTooMuch) throw new Error('Over-reservation charge silently accepted');
    if (!(await settle(second.id, 900))) throw new Error('Could not settle previous pending reservation');
    const pending = (await db.query("select count(*) as total from ai_run_reservations where state='pending'")).rows[0].total;
    if (Number(pending) !== 1) throw new Error('Unexpected reservation finalization');
    console.log('ok   ai_reserve_run/ai_settle_run: daily counters, pending budget, idempotency and overrun guard');
  } catch (e) {
    failed = true;
    console.log('FAIL atomic AI reservation smoke:', e.message);
  }
}

process.exit(failed ? 1 : 0);
