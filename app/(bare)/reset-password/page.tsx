import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ResetClient } from '@/components/ResetClient';
import { SiteNav } from '@/components/SiteNav';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Choose a new password' };

export default async function ResetPassword() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user) redirect('/login?error=' + encodeURIComponent('That reset link has expired. Request a new one.'));
  return (
    <>
      <SiteNav />
      <ResetClient />
    </>
  );
}
