import type { Metadata } from 'next';
import { AuthClient } from '@/components/AuthClient';
import { SiteNav } from '@/components/SiteNav';
import { supabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Sign in' };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; sent?: string }> }) {
  const { error, next, sent } = await searchParams;
  return (
    <>
      <SiteNav />
      <AuthClient live={supabaseConfigured} error={error} next={next} sent={sent === '1'} />
    </>
  );
}
