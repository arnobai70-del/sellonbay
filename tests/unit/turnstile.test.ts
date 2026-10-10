import { describe, expect, it } from 'vitest';
import { hasNonTestTurnstileKeys } from '@/lib/bot/turnstile';

describe('Turnstile production credentials gate', () => {
  it('rejects missing or partial credentials', () => {
    expect(hasNonTestTurnstileKeys('', '')).toBe(false);
    expect(hasNonTestTurnstileKeys('0xreal-site-key', '')).toBe(false);
    expect(hasNonTestTurnstileKeys('', '0xreal-secret-key')).toBe(false);
  });

  it('rejects all standard Cloudflare TEST key families even when set in env', () => {
    const sampleSites = ['1x00000000000000000000AA', '2x00000000000000000000AB', '3x00000000000000000000FF'];
    const sampleSecrets = ['1x0000000000000000000000000000000AA', '2x0000000000000000000000000000000AA'];
    for (const site of sampleSites) expect(hasNonTestTurnstileKeys(site, '0xreal-secret-key')).toBe(false);
    for (const secret of sampleSecrets) expect(hasNonTestTurnstileKeys('0xreal-site-key', secret)).toBe(false);
  });

  it('accepts configured non-test-shaped keys for provider verification (not proof of validity)', () => {
    expect(hasNonTestTurnstileKeys('0xreal-site-key', '0xreal-secret-key')).toBe(true);
  });
});
