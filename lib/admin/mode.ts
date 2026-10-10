/**
 * Local prototypes deliberately have no user database; production must never
 * interpret absent Supabase credentials as a logged-in administrator.
 * A production demo is permitted only when deliberately marked as such.
 */
export function mayUseDemoAdmin(env: { NODE_ENV?: string; LAUNCHBAY_DEMO?: string }): boolean {
  return env.NODE_ENV !== 'production' || env.LAUNCHBAY_DEMO === '1';
}
