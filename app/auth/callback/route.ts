import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* OAuth return point: swap the code for a session, then send the user to their dashboard. */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  const n = searchParams.get('next') ?? '';
  const next = n.startsWith('/') && !n.startsWith('//') ? n : '';
  if (!code) return NextResponse.redirect(`${origin}/login?error=Sign-in failed. Try again.`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=Sign-in failed. Try again.`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  return NextResponse.redirect(origin + (next || '/dashboard/' + (profile?.role ?? 'buyer')));
}
