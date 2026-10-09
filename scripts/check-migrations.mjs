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
process.exit(failed ? 1 : 0);
