import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/* Source-level guards for the security checklist: where secrets may be read, and no raw HTML from users. The built bundle is checked by scripts/check-bundle.mjs. */
const root = path.join(__dirname, '..', '..');
const SOURCE_DIRS = ['app', 'components', 'lib', 'emails'];
const sources: { file: string; text: string }[] = [];
const walk = (d: string) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name)) sources.push({ file: path.relative(root, p).replace(/\\/g, '/'), text: fs.readFileSync(p, 'utf8') });
  }
};
for (const d of SOURCE_DIRS) walk(path.join(root, d));
sources.push({ file: 'proxy.ts', text: fs.readFileSync(path.join(root, 'proxy.ts'), 'utf8') });

const SECRETS = ['SUPABASE_SERVICE_ROLE_KEY', 'DELIVERY_SECRET', 'PAYMENT_WEBHOOK_SECRET', 'CRON_SECRET', 'TURNSTILE_SECRET_KEY', 'GUARD_SALT'];
/* The only files that may read a secret. Each is server code. lib/launchCheck.ts only checks whether a secret is set and how long it is, never shows it. */
const CHECK = 'lib/launchCheck.ts';
const ALLOWED: Record<string, string[]> = {
  SUPABASE_SERVICE_ROLE_KEY: ['lib/supabase/server.ts', 'lib/catalog.ts', 'lib/delivery/service.ts', 'app/demo/[id]/[[...path]]/route.ts', CHECK],
  DELIVERY_SECRET: ['lib/delivery/service.ts', CHECK],
  PAYMENT_WEBHOOK_SECRET: ['lib/providers/payment/fake.ts', CHECK],
  CRON_SECRET: ['app/api/cron/orders/route.ts', 'app/api/cron/payouts/route.ts', CHECK],
  TURNSTILE_SECRET_KEY: ['lib/bot/turnstile.ts', CHECK],
  GUARD_SALT: ['lib/guard.ts', CHECK],
};

describe('secrets stay on the server', () => {
  for (const name of SECRETS) {
    it(`${name} is read only where it is allowed`, () => {
      const users = sources.filter((s) => s.text.includes(name)).map((s) => s.file);
      expect(
        users.filter((f) => !ALLOWED[name].includes(f)),
        `unexpected readers of ${name}`,
      ).toEqual([]);
    });
  }
  it('no client component (use client) mentions a secret', () => {
    const bad = sources.filter((s) => /^\s*['"]use client['"]/.test(s.text) && SECRETS.some((n) => s.text.includes(n))).map((s) => s.file);
    expect(bad).toEqual([]);
  });
  it('no secret is exposed with a NEXT_PUBLIC_ name', () => {
    expect(sources.filter((s) => SECRETS.some((n) => s.text.includes('NEXT_PUBLIC_' + n))).map((s) => s.file)).toEqual([]);
    const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
    for (const n of SECRETS) expect(example).not.toContain('NEXT_PUBLIC_' + n);
  });
  it('every file that touches the service-role client is server-only', () => {
    const users = sources.filter((s) => s.file !== 'lib/supabase/server.ts' && /createAdminClient/.test(s.text) && /^import /m.test(s.text));
    const bad = users.filter((s) => /^\s*['"]use client['"]/.test(s.text)).map((s) => s.file);
    expect(bad).toEqual([]);
    expect(fs.readFileSync(path.join(root, 'lib/supabase/server.ts'), 'utf8')).toContain("import 'server-only'");
  });
});

describe('no raw HTML from users', () => {
  it('dangerouslySetInnerHTML is used only by the JSON-LD helper', () => {
    // Allowed in one place only: the JSON-LD helper, which must neutralise every "<" so nothing can close the script tag.
    expect(sources.filter((s) => s.text.includes('dangerouslySetInnerHTML') && s.file !== 'components/JsonLd.tsx').map((s) => s.file)).toEqual([]);
    const ld = sources.find((s) => s.file === 'components/JsonLd.tsx')!;
    expect(ld.text).toContain('.replace(/</g,');
    expect(ld.text).toContain('u003c');
  });
  it('innerHTML is not assigned in app code', () => {
    expect(sources.filter((s) => /\.innerHTML\s*=/.test(s.text)).map((s) => s.file)).toEqual([]);
  });
});

describe('the browser bundle stays free of server-only libraries', () => {
  it('Zod and the request validators are not imported by client components (Zod probes for eval, which the security policy blocks)', () => {
    const clients = sources.filter((s) => /^\s*['"]use client['"]/.test(s.text));
    const bad = clients.filter((s) => /from ['"]zod['"]|lib\/schemas|lib\/validate/.test(s.text)).map((s) => s.file);
    expect(bad).toEqual([]);
  });
});
