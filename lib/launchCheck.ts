import 'server-only';
import { emailProvider } from './providers/email';
import { paymentProvider } from './providers/payment';
import { domainProvider } from './providers/domain';
import { getSettings } from './settings';
import { supabaseConfigured } from './supabase/env';
import { hasNonTestTurnstileKeys } from './bot/turnstile';
import { clamavReady } from './scan/clamav';

/*
 * What is still missing before the live site is safe, read from the running server (keys are never shown, only whether they are set).
 * 'todo' must be done before real buyers come, 'warn' is a known gap the owner has chosen to live with for now, 'ok' is done.
 */
export type Check = { name: string; state: 'ok' | 'todo' | 'warn'; note: string };
const set = (k: string, min = 1) => (process.env[k] ?? '').length >= min;

export async function launchChecks(): Promise<Check[]> {
  const s = await getSettings();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const c = (name: string, ok: boolean, note: string, otherwise: 'todo' | 'warn' = 'todo'): Check => ({ name, state: ok ? 'ok' : otherwise, note });
  return [
    c('Site address', /^https:\/\//.test(site), site ? `NEXT_PUBLIC_SITE_URL is ${site}` : 'Set NEXT_PUBLIC_SITE_URL to https://your-domain (sitemap, share cards, emails).'),
    c('Database', supabaseConfigured && set('SUPABASE_SERVICE_ROLE_KEY'), 'Supabase URL, anon key and service key are set, and demo mode is off.'),
    c('Download link key', set('DELIVERY_SECRET', 32), 'DELIVERY_SECRET: a random value of 32 or more characters signs the download links.'),
    c('Payment webhook key', set('PAYMENT_WEBHOOK_SECRET', 32), 'PAYMENT_WEBHOOK_SECRET: a random value of 32 or more characters.'),
    c('Scheduled jobs', set('CRON_SECRET', 32), 'CRON_SECRET, and a scheduler calling POST /api/cron/orders every 5 to 10 minutes and /api/cron/payouts on Sundays.'),
    c('Abuse hashing salt', set('GUARD_SALT', 32), 'GUARD_SALT: a random value of 32 or more characters. Set it once; changing it later forgets blocks.'),
    c('Bot check (Turnstile)', hasNonTestTurnstileKeys(), 'Cloudflare Turnstile requires a real site key and secret; official 1x/2x/3x test keys do not protect production. Validate real verification in staging.'),
    c('Examples cannot be bought', process.env.EXAMPLE_ORDERS !== '1', 'EXAMPLE_ORDERS must not be set on the live site.'),
    c('Payments', paymentProvider().name !== 'fake', 'Only the test gateway exists (test cards, no real money). Connect a real provider (decision D1) before the market opens.'),
    c('Email', emailProvider().name !== 'fake', 'No email provider is connected: nothing is emailed yet (notifications still show on the site).', 'warn'),
    c('Domain registrar', domainProvider().name !== 'Demo registrar', 'No registrar: domain search shows made-up availability and nothing is registered.', 'warn'),
    c(
      'Virus scan',
      await clamavReady(),
      'ClamAV must answer a real PING on the trusted internal connection. Also verify clean and EICAR test samples in staging before accepting real digital listings.',
    ),
    c('Example listings', !s.showExamples, s.showExamples ? 'Shown, marked Example and not for sale. Hide them in Settings when real sellers have listed enough.' : 'Hidden.', 'warn'),
  ];
}
