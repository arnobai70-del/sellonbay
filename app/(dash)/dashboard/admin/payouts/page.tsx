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
              <a key={w} className="btn btn-gold btn-sm" href={`/api/admin/payouts/csv?week=${w}`} style={{ marginRight: 8 }}>
                Download CSV for {w}
              </a>
            ))}
          </p>
        )}
        {all.length === 0 && <p className="muted">No payouts yet. They appear once an accepted order has passed its 7-day hold.</p>}
        {weeks.map((w) => (
          <div key={w} className="adm-table-wrap">
            <h3 style={{ marginTop: 18 }}>Week starting {w}</h3>
            <table className="adm-table">
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
                      <td>{p.sellerName}</td>
                      <td>{p.method}</td>
                      <td>{p.account}</td>
                      <td>
                        <b>{money(p.amountCents)}</b>
                      </td>
                      <td>{p.orderIds.length}</td>
                      <td>
                        {p.status}
                        {p.reference ? ` (${p.reference})` : ''}
                      </td>
                      <td>
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
