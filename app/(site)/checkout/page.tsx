import type { Metadata } from 'next';
import { CheckoutClient } from '@/components/CheckoutClient';
import { findProduct, isPkg } from '@/lib/data';
import { visibleProduct } from '@/lib/catalog';
import { requireViewer } from '@/lib/supabase/viewer';
import { domainProvider, mayOfferNewDomain } from '@/lib/providers/domain';

export const metadata: Metadata = { title: 'Checkout' };

export default async function Checkout({ searchParams }: { searchParams: Promise<{ id?: string; pkg?: string; domain?: string }> }) {
  const { id, pkg, domain } = await searchParams;
  await requireViewer({ path: '/checkout?' + new URLSearchParams(Object.entries({ id, pkg, domain }).filter(([, v]) => v) as [string, string][]).toString() });
  return <CheckoutClient p={(id && (await visibleProduct(id))?.product) || findProduct(id)} pkg={isPkg(pkg) ? pkg : 'asis'} domain={domain} newDomainsEnabled={mayOfferNewDomain(domainProvider())} />;
}
