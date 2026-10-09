import { NextResponse } from 'next/server';
import { isFundedState } from '@/lib/orders/machine';
import { getOrder } from '@/lib/orders/service';
import { decideRelease, releaseConfigFromEnv } from '@/lib/delivery/policy';
import { baseEvent, filenameFromUrl, sendBuffer, sendUpstream } from '@/lib/delivery/serve';
import { allow, clientIp, deliverySecret, dummyFile, ensureLicense } from '@/lib/delivery/service';
import { safeFetch } from '@/lib/delivery/ssrf';
import { verifyToken } from '@/lib/delivery/token';
import { createAdminClient } from '@/lib/supabase/server';
import { flags } from '@/lib/flags';
import { getViewerId } from '@/lib/supabase/viewer';
import { CONFIG, HOUR_MS } from '@/lib/config';
import { tokenParam } from '@/lib/validate';
import { HELD_TEXT, heldReason } from '@/lib/holds';
import { fileForOrder } from '@/lib/versions';

export const runtime = 'nodejs';
export const maxDuration = 60;

const no = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'cache-control': 'no-store' } });

/* Opens a signed download link. The link must be genuine and not expired, and the order is checked again every single time. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const t = tokenParam.safeParse((await params).token);
  const token = t.success ? t.data : '';
  if (!allow(`dl-ip:${clientIp(req)}`, CONFIG.download.ipPerHour, HOUR_MS)) return no('Too many downloads from this address. Try again later.', 429);
  const v = verifyToken(deliverySecret(), token);
  if (!v.ok) return v.error === 'expired' ? no('This download link has expired. Open your order and get a new one.', 410) : no('This download link is not valid.', 403);
  const { o: orderId, u: userId, k } = v.claims;

  if (k === 'trial') {
    if (!flags.trialCopy) return no('This download is not available.', 403);
    if (!userId || userId !== (await getViewerId())) return no('Sign in with the account that asked for this trial.', 403);
    const admin = createAdminClient();
    const { data: p } = await admin.from('products').select('id, slug, status, trial_url').eq('id', orderId).maybeSingle();
    if (!p || p.status !== 'live' || !p.trial_url) return no('This trial is no longer available.', 404);
    if (p.trial_url.startsWith('storage:')) {
      const { data: blob } = await admin.storage.from('demos').download(p.trial_url.slice(8));
      if (!blob) return no('The trial file could not be reached. Try again soon.', 502);
      return sendBuffer(req, Buffer.from(await blob.arrayBuffer()), `trial-${p.slug ?? 'download'}.${p.trial_url.split('.').pop()}`, baseEvent(req, p.id, 'trial', userId));
    }
    try {
      const upstream = await safeFetch(p.trial_url, AbortSignal.timeout(20_000));
      if (!upstream.ok || !upstream.body) return no('The trial file could not be reached. Try again soon.', 502);
      return sendUpstream(upstream, `trial-${filenameFromUrl(p.trial_url, p.slug ?? 'download')}`, baseEvent(req, p.id, 'trial', userId));
    } catch {
      return no('The trial file could not be reached. Try again soon.', 502);
    }
  }

  if (k === 'demo') {
    const order = await getOrder(orderId);
    if (!order || !isFundedState(order.state)) return no('Your files are available once your payment is held in escrow.', 403);
    if (order.buyerId && order.buyerId !== (await getViewerId())) return no('This download link is not for your account.', 403);
    const key = await ensureLicense(orderId);
    return sendBuffer(req, dummyFile(order.title, key), 'sellonbay-demo-file.txt', baseEvent(req, orderId, 'demo', order.buyerId ?? null));
  }

  if (!userId || userId !== (await getViewerId())) return no('Sign in with the account that bought this.', 403);
  const admin = createAdminClient();
  const { data: order } = await admin.from('orders').select('id, product_id, buyer_id, status, price_cents, created_at, funded_at').eq('id', orderId).single();
  if (!order || order.buyer_id !== userId) return no('Order not found.', 404);
  if (await heldReason(orderId)) return no(HELD_TEXT, 403);
  const { data: profile } = await admin.from('profiles').select('created_at, flagged').eq('id', userId).single();
  const d = decideRelease(
    {
      status: order.status,
      fundedAtMs: Date.parse(order.funded_at ?? order.created_at),
      nowMs: Date.now(),
      buyerCreatedAtMs: profile?.created_at ? Date.parse(profile.created_at) : undefined,
      buyerFlagged: !!profile?.flagged,
      priceCents: order.price_cents,
    },
    releaseConfigFromEnv(),
  );
  if (!d.allowed) return no('Your files are not available right now.', 403); // refunded, cancelled, not funded, or still in the short release delay
  const { data: product } = await admin.from('products').select('code_url, slug').eq('id', order.product_id).single();
  if (!product?.code_url) return no('No files on this listing.', 404);
  // The newest version this buyer is entitled to (their update period), or the first file.
  const file = await fileForOrder(order.product_id, product.code_url, Date.parse(order.funded_at ?? order.created_at));

  let upstream: Response;
  try {
    upstream = await safeFetch(file.url, AbortSignal.timeout(20_000));
  } catch {
    return no('The seller file could not be reached. Try again soon, or message the seller.', 502);
  }
  if (!upstream.ok || !upstream.body) return no('The seller file could not be reached. Try again soon, or message the seller.', 502);
  return sendUpstream(upstream, filenameFromUrl(file.url, `${product.slug ?? 'download'}${file.version ? '-' + file.version : ''}.zip`), baseEvent(req, orderId, 'real', userId));
}
