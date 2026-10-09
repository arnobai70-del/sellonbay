import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { PayForm } from '@/components/PayForm';
import { orderFor } from '@/lib/commerce/access';

export const metadata: Metadata = { title: 'Pay', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Pay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await orderFor(id);
  if (!o) notFound();
  if (o.fundedAt) redirect(`/orders/${id}`);
  const back = o.kind !== 'product' ? `/developers/${o.devKey}` : `/checkout?id=${o.productKey}`;
  return <PayForm id={o.id} title={o.title} lines={o.lines} totalCents={o.priceCents} back={back} />;
}
