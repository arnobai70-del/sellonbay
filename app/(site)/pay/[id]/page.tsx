import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { PayForm } from '@/components/PayForm';
import { canUseDemoPayment } from '@/lib/commerce/demoPaymentPolicy';
import { orderFor } from '@/lib/commerce/access';

export const metadata: Metadata = { title: 'Pay', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function Pay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await orderFor(id);
  if (!o) notFound();
  if (o.fundedAt) redirect(`/orders/${id}`);
  const back = o.kind !== 'product' ? `/developers/${o.devKey}` : `/checkout?id=${o.productKey}`;
  if (!canUseDemoPayment(o)) {
    return (
      <div className="wrap" style={{ paddingBlock: 80, maxWidth: 700 }}>
        <h1>Checkout is not available yet</h1>
        <p className="muted" style={{ marginTop: 16 }}>
          This is a real seller or developer order. SellOnBay does not yet have a verified payment provider connected.
          Test cards cannot be used to pay for real orders, and no money has been collected.
        </p>
        <p className="muted" style={{ marginTop: 12 }}>
          Your order is awaiting payment and will not be delivered or funded until a real checkout is available.
        </p>
        <Link href={back} className="btn btn-blue" style={{ marginTop: 24 }}>Return to listing</Link>
      </div>
    );
  }
  return <PayForm id={o.id} title={o.title} lines={o.lines} totalCents={o.priceCents} back={back} />;
}
