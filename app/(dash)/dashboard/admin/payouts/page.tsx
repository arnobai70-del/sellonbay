import type { Metadata } from 'next';
import { AdminForm } from '@/components/AdminForm';
import { DashShell } from '@/components/DashShell';
import { PlanButton } from '@/components/PlanButton';
import { listPayouts, weekStartOf } from '@/lib/payouts';
import { requireViewer } from '@/lib/supabase/viewer';

export const metadata: Metadata = { title: 'Payouts', robots: { index: false } };
export const dynamic = 'force-dynamic';

const money = (c: number) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });

export default async function Payouts() {
  const viewer = await requireViewer({ path: '/dashboard/admin/payouts', roles: ['admin'] });
  const all = await listPayouts();
  const week = weekStartOf(Date.now());
  const weeks = [...new Set(all.map((p) => p.weekStart))].sort().reverse();
  const toExport = all.filter((p) => p.status === 'scheduled' || p.status === 'exported');
  return (
    <DashShell name={viewer?.name} signedIn={!!viewer} viewerRole={viewer?.role} role="admin" active="admin-payouts" title="Payouts">
      <div className="dp">
        <div className="hd">
          <div>
            <h2>Weekly payouts</h2>
            <p className="sub">
              Sellers are paid for orders accepted at least 7 days ago. Make the batch (it also runs every Sunday), download the CSV, send the money with Payoneer, Wise or the bank, then mark each
              payout paid with the transfer reference. Nothing is sent from here.
            </p>
          </div>
        </div>
        <PlanButton week={week} />
        {toExport.length > 0 && (
          <p>
            Waiting weeks:{' '}
            {[...new Set(toExport.map((p) => p.weekStart))].map((w) => (
              <form key={w} method="post" action={`/api/admin/payouts/csv?week=${w}`} style={{ display: 'inline' }}>
                <button type="submit" className="btn btn-gold btn-sm" style={{ marginRight: 8 }}>
                  Download CSV for {w}
                </button>
              </form>
            ))}
          </p>
        )}
        {all.length === 0 && <p className="muted">No payouts yet. They appear once an accepted order has passed its 7-day hold.</p>}
        {weeks.map((w) => (
          <div key={w} className="adm-table-wrap">
            <h3 style={{ marginTop: 18 }}>Week starting {w}</h3>
            <table className="adm-table stack">
              <thead>
                <tr>
                  <th>Seller</th>
                  <th>Method</th>
                  <th>Send to</th>
                  <th>Amount</th>
                  <th>Orders</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {all
                  .filter((p) => p.weekStart === w)
                  .map((p) => (
                    <tr key={p.id}>
                      <td data-label="Seller">{p.sellerName}</td>
                      <td data-label="Method">{p.method}</td>
                      <td data-label="Send to">{p.account}</td>
                      <td data-label="Amount">
                        <b>{money(p.amountCents)}</b>
                      </td>
                      <td data-label="Orders">{p.orderIds.length}</td>
                      <td data-label="Status">
                        {p.status}
                        {p.reference ? ` (${p.reference})` : ''}
                      </td>
                      <td data-label="Action">
                        {p.status === 'exported' && (
                          <>
                            <AdminForm
                              endpoint={`/api/admin/payouts/${p.id}/paid`}
                              openLabel="Mark paid"
                              submit="I sent it"
                              tone="blue"
                              fields={[{ name: 'reference', label: 'Transfer reference from Wise, Payoneer or the bank', kind: 'text', required: true }]}
                            />
                            <AdminForm
                              endpoint={`/api/admin/payouts/${p.id}/fail`}
                              openLabel="Failed"
                              submit="Mark failed"
                              tone="line"
                              fields={[{ name: 'note', label: 'What went wrong', kind: 'textarea' }]}
                            />
                          </>
                        )}
                        {p.status === 'scheduled' && <small className="muted">Download the CSV first</small>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </DashShell>
  );
}
