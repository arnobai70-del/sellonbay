import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './server';
import { supabaseConfigured } from './env';
import { cannotAct } from '@/lib/accounts';

export type ViewerRole = 'buyer' | 'seller' | 'admin';

/* The signed-in person, or null in demo mode / signed out. */
export async function getViewer() {
  if (!supabaseConfigured) return null;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: p } = await sb.from('profiles').select('full_name, role').eq('id', user.id).single();
  return { name: p?.full_name || user.email || 'You', role: (p?.role ?? 'buyer') as ViewerRole };
}

/*
 * Server-side page guard. proxy.ts also checks this, but a Server Action redirect (for example right after sign in)
 * renders the next page without going through the proxy, so every protected page must check for itself.
 * Demo mode (no Supabase keys) lets everything through.
 * roles: who may open this page. Sellers and admins must also have passed the authenticator code (aal2).
 */
export async function requireViewer(opts: { path: string; roles?: ViewerRole[] }) {
  if (!supabaseConfigured) return null;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login?next=' + encodeURIComponent(opts.path));

  const { data: p } = await sb.from('profiles').select('full_name, role, banned, suspended_until').eq('id', user.id).single();
  if (!p || cannotAct(p)) redirect('/login?error=' + encodeURIComponent('This account cannot sign in.'));
  const role = (p.role ?? 'buyer') as ViewerRole;

  if (opts.roles && !opts.roles.includes(role)) redirect('/dashboard/' + role);

  if (role !== 'buyer') {
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== 'aal2') redirect('/login/mfa?next=' + encodeURIComponent(opts.path));
  }
  return { name: p.full_name || user.email || 'You', role };
}

/* Just the signed-in user's id (or undefined), for pages that show a draft only to its owner. */
export async function getViewerId(): Promise<string | undefined> {
  if (!supabaseConfigured) return undefined;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return user?.id;
}
