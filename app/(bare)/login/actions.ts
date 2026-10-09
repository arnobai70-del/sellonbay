'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { guard, noteAccount } from '@/lib/guard';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const back = (msg: string): never => redirect('/login?error=' + encodeURIComponent(msg));
/* Turns provider errors into plain sentences. */
function friendly(msg: string) {
  if (/rate limit|too many/i.test(msg)) return 'Too many emails were sent in a short time. Wait a few minutes and try again.';
  if (/already registered|already been registered/i.test(msg)) return 'That email already has an account. Sign in instead.';
  if (/password/i.test(msg) && /(weak|short|least|characters)/i.test(msg)) return 'Choose a stronger password with at least 8 characters.';
  if (/invalid/i.test(msg) && /email/i.test(msg)) return 'That email address does not look right.';
  return 'Something went wrong. Please try again.';
}
const safeNext = (n: FormDataEntryValue | null) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '');

/* Explicit sign in or sign up, chosen by the form's mode field. */
export async function authenticate(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const signup = formData.get('mode') === 'signup';
  const wantsSeller = formData.get('role') === 'seller';
  const next = safeNext(formData.get('next'));
  if (!email || password.length < 8) return back('Use a valid email and a password of at least 8 characters.');

  if (signup && !name) return back('Enter your name.');
  const g = await guard(signup ? 'signup' : 'login', null, { email });
  if (!g.ok) return back(g.error);

  const supabase = await createClient();
  let userId: string;

  if (signup) {
    const up = await supabase.auth.signUp({ email, password, options: { data: { full_name: name, terms_accepted_at: new Date().toISOString() } } });
    if (up.error) return back(friendly(up.error.message));
    if (!up.data.session || !up.data.user) return back('Check your email to confirm your account, then sign in.');
    userId = up.data.user.id;
    // Role is set here on the server. The browser can never choose its own role.
    if (wantsSeller) await createAdminClient().from('profiles').update({ role: 'seller' }).eq('id', userId);
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return back('Email or password is wrong.');
    userId = data.user.id;
  }

  await noteAccount(userId, signup ? 'signup' : 'login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  const role = profile?.role ?? 'buyer';
  const dest = next || '/dashboard/' + role;
  // Sellers and admins go straight to the authenticator step so the address bar matches what they see.
  if (role !== 'buyer') redirect('/login/mfa?next=' + encodeURIComponent(dest));
  redirect(dest);
}

export async function signOut() {
  await (await createClient()).auth.signOut();
  redirect('/');
}

/* Sends a reset link. The reply is the same whether or not the email has an account. */
export async function requestReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return back('Enter your email.');
  const h = await headers();
  const origin = h.get('origin') ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;
  await (await createClient()).auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
  redirect('/login?sent=1');
}
