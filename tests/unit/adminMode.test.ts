import { describe, expect, it } from 'vitest';
import { mayUseDemoAdmin } from '@/lib/admin/mode';

describe('admin auth fail-closed configuration', () => {
  it('denies unauthenticated admin fallback when production DB is missing', () => {
    expect(mayUseDemoAdmin({ NODE_ENV: 'production' })).toBe(false);
    expect(mayUseDemoAdmin({ NODE_ENV: 'production', LAUNCHBAY_DEMO: '0' })).toBe(false);
    expect(mayUseDemoAdmin({ NODE_ENV: 'production', LAUNCHBAY_DEMO: '' })).toBe(false);
  });
  it('allows explicitly isolated demo mode and local prototypes', () => {
    expect(mayUseDemoAdmin({ NODE_ENV: 'production', LAUNCHBAY_DEMO: '1' })).toBe(true);
    expect(mayUseDemoAdmin({ NODE_ENV: 'development' })).toBe(true);
    expect(mayUseDemoAdmin({ NODE_ENV: 'test' })).toBe(true);
  });
});
