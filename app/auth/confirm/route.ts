import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safeNext';

const TYPES: EmailOtpType[] = ['signup', 'recovery', 'email_change', 'invite', 'magiclink', 'email'];

/*
 * Email link return point that works in any browser: the link carries a token hash instead of a code tied to the browser that asked.
 * Used when the Supabase email templates link to /auth/confirm?token_hash={{ .TokenHash }}&type=... (see docs/RUNBOOK.md).
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const failed = `${origin}/login?error=${encodeURIComponent('That link has expired or was already used. Request a new one.')}`;
  if (!tokenHash || !type || !TYPES.includes(type)) return NextResponse.redirect(failed);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error || !data.user) return NextResponse.redirect(failed);
  if (type === 'recovery') return NextResponse.redirect(`${origin}/reset-password`);
  const next = safeNext(searchParams.get('next'));
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
  return NextResponse.redirect(origin + (next || '/dashboard/' + (profile?.role ?? 'buyer')));
}
