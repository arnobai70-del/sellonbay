import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SiteNav } from '@/components/SiteNav';
import { MfaClient } from '@/components/MfaClient';
import { supabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Two-step sign in' };

export default async function Mfa({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (supabaseConfigured) {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    if (!user) redirect('/login?next=' + encodeURIComponent('/login/mfa'));
  }
  return (
    <>
      <SiteNav />
      <MfaClient next={next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard/seller'} />
    </>
  );
}
