import 'server-only';
import { NextResponse } from 'next/server';
import { cannotAct } from '../accounts';
import { supabaseConfigured } from '../supabase/env';
import { createClient } from '../supabase/server';

/*
 * Every admin route starts here. The person must be signed in, an admin, not banned or suspended, and have passed the authenticator code (aal2).
 * Demo mode (no Supabase keys) has no accounts and lets everything through, like the rest of the prototype.
 */
export type AdminCheck = { ok: true; id: string | null } | { ok: false; res: NextResponse };
const no = (error: string, status: number): AdminCheck => ({ ok: false, res: NextResponse.json({ error }, { status }) });

export async function adminOnly(): Promise<AdminCheck> {
  if (!supabaseConfigured) return { ok: true, id: null };
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return no('Sign in first.', 401);
  const { data: p } = await sb.from('profiles').select('role, banned, suspended_until').eq('id', user.id).single();
  if (!p || cannotAct(p) || p.role !== 'admin') return no('Not allowed.', 403);
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') return no('Enter your authenticator code first.', 403);
  return { ok: true, id: user.id };
}
