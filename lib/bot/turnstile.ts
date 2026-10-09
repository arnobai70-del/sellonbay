import 'server-only';

/*
 * Cloudflare Turnstile check. Set TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY for real use.
 * Without them the official Cloudflare TEST keys are used, which pass for everyone: fine for development, NOT a bot check.
 * Before launch, set the real keys (see docs/DECISIONS.md).
 */
export const TEST_SITE_KEY = '1x00000000000000000000AA';
const TEST_SECRET = '1x0000000000000000000000000000000AA';
export const usingTestKeys = () => !process.env.TURNSTILE_SECRET_KEY;

export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY || TEST_SECRET, response: token });
  if (ip && ip !== 'unknown') body.set('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body, signal: AbortSignal.timeout(8000) });
    const j = (await r.json()) as { success?: boolean };
    return !!j.success;
  } catch {
    return false; // if we cannot check, we do not let it through
  }
}
