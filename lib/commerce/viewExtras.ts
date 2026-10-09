import 'server-only';
import { visibleProduct } from '../catalog';
import { disputeSummary } from '../disputes';
import { heldReason } from '../holdStore';
import type { Order } from '../orders/machine';
import { endsAt, infoOf } from '../productInfo';
import { inviteState, taskOf } from '../repoAccess';
import { reviewSummary } from '../reviews';
import { versionsForOrder } from '../versions';

/* Everything besides the order and its log that the order page shows: the dispute, the review, a safety hold and what the product promised (guide, needs, support, updates). */
async function repoView(o: Order) {
  const [s, t] = await Promise.all([inviteState(o), taskOf(o.id)]);
  return { invitedAt: s?.invitedAt ?? null, expiresAt: s?.expiresAt ?? null, expired: !!s?.expired, resends: s?.resends ?? 0, revoke: t?.revokeState ?? null };
}

export async function viewExtras(o: Order) {
  const prod = o.productKey ? (await visibleProduct(o.productKey))?.product : undefined;
  const i = prod ? infoOf(prod) : null;
  return {
    ...(await disputeSummary(o)),
    ...(await reviewSummary(o)),
    held: !!(await heldReason(o.id)),
    repo: o.deliveryType === 'repo_access' ? await repoView(o) : null,
    info: i
      ? {
          versions: await versionsForOrder(prod!.id, o.fundedAt ?? o.createdAt, i.updateDays),
          requirements: i.requirements ?? null,
          docsUrl: i.docsUrl ?? null,
          supportDays: i.supportDays,
          updateDays: i.updateDays,
          supportUntil: endsAt(o.fundedAt, i.supportDays),
          updateUntil: endsAt(o.fundedAt, i.updateDays),
        }
      : null,
  };
}
