import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAnonKey, supabaseConfigured, supabaseUrl } from '@/lib/supabase/env';
import { cannotAct } from './lib/accounts';

const SIGNED_IN = ['/dashboard', '/messages', '/checkout', '/sell/new'];
const STAFF = ['/dashboard/seller', '/dashboard/admin', '/sell/new']; // sellers and admins need 2FA

/* Every visitor gets a random device id once. It is only used to spot many accounts on one device (lib/guard.ts) and is stored as a hash. */
export async function proxy(req: NextRequest) {
  const res = await handle(req);
  if (!req.cookies.get('lb_dev'))
    res.cookies.set('lb_dev', crypto.randomUUID(), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 });
  return res;
}

async function handle(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  if (!supabaseConfigured) return res;

  // If the provider sent the auth code to the site root (redirect URL not allow-listed), forward it to the callback.
  if (req.nextUrl.pathname === '/' && req.nextUrl.searchParams.has('code')) {
    const to = new URL('/auth/callback', req.url);
    to.searchParams.set('code', req.nextUrl.searchParams.get('code')!);
    to.searchParams.set('next', '/reset-password');
    return NextResponse.redirect(to);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser(); // validates the token with Supabase
  const path = req.nextUrl.pathname;
  const go = (to: string) => NextResponse.redirect(new URL(to, req.url));

  if (!user) return SIGNED_IN.some((p) => path.startsWith(p)) ? go('/login?next=' + encodeURIComponent(path)) : res;

  const { data: profile } = await supabase.from('profiles').select('role, banned, suspended_until').eq('id', user.id).single();
  if (profile && cannotAct(profile)) return go('/login?error=banned');

  const role = profile?.role ?? 'buyer';
  if (path.startsWith('/dashboard/admin') && role !== 'admin') return go('/dashboard/' + (role === 'seller' ? 'seller' : 'buyer'));
  if (path.startsWith('/dashboard/seller') && role === 'buyer') return go('/dashboard/buyer');

  if (role !== 'buyer' && STAFF.some((p) => path.startsWith(p))) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== 'aal2') return go('/login/mfa?next=' + encodeURIComponent(path));
  }
  return res;
}

// /demo serves untrusted seller files and does its own access check, so the proxy stays out of the way (and out of every asset request).
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|demo/|.*\.(?:svg|png|jpg|ico)$).*)'] };
