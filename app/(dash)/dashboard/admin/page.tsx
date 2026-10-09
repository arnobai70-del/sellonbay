import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminForm, type Field } from '@/components/AdminForm';
import { DashShell } from '@/components/DashShell';
import { devQueue, listReports, listingQueue } from '@/lib/admin/queue';
import { openDisputes } from '@/lib/disputes';
import { listPayouts } from '@/lib/payouts';
import { blockedList } from '@/lib/presale/service';
import { requireViewer } from '@/lib/supabase/viewer';

export const metadata: Metadata = { title: 'Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

const REASON_LABEL: Record<string, string> = { email: 'email address', phone: 'phone number', contact_channel: 'other contact channel', link: 'link', outside_payment: 'outside payment' };
const money = (c: number) => '$' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: c % 100 ? 2 : 0 });

const decisionFields = (digital: boolean): Field[] => [
  {
    name: 'decision',
    label: 'Decision',
    kind: 'select',
    options: [
      ['approve', 'Approve and publish'],
      ['changes', 'Send back for changes'],
      ['reject', 'Reject'],
    ],
  },
  { name: 'note', label: 'Note for the seller (needed unless you approve)', kind: 'textarea' },
  ...(digital ? [{ name: 'filesChecked', label: 'I opened the files in a sandbox and they are clean (needed to approve a digital product)', kind: 'checkbox' as const }] : []),
];

export default async function AdminDashboard() {
  const viewer = await requireViewer({ path: '/dashboard/admin', roles: ['admin'] });
  const [listings, devs, disputes, payouts, reports, blocked] = await Promise.all([
    listingQueue(),
    devQueue(),
    openDisputes(),
    listPayouts({ status: ['scheduled', 'exported'] }),
    listReports(true),
    blockedList(30),
  ]);
  return (
    <DashShell name={viewer?.name} signedIn={!!viewer} viewerRole={viewer?.role} role="admin" active="admin" title="Admin overview">
      <div className="adm-counts">
        <a href="#listings">
          <small>Listings to review</small>
          <b>{listings.length}</b>
        </a>
        <a href="#developers">
          <small>Developer profiles</small>
          <b>{devs.length}</b>
        </a>
        <Link href="/dashboard/admin/disputes">
          <small>Open disputes</small>
          <b>{disputes.length}</b>
        </Link>
        <Link href="/dashboard/admin/payouts">
          <small>Payouts to send</small>
          <b>{payouts.length}</b>
        </Link>
        <Link href="/dashboard/admin/abuse">
          <small>Abuse reports</small>
          <b>{reports.length}</b>
        </Link>
      </div>

      <div className="dp" id="listings">
        <div className="hd">
          <div>
            <h2>New listings</h2>
            <p className="sub">Read the listing, open the demo and the files, then decide. The seller is told your note. There is no automatic malware scan yet.</p>
          </div>
        </div>
        {listings.length === 0 && <p className="muted">Nothing is waiting for review.</p>}
        {listings.map((l) => (
          <div className="adm-card" key={l.slug}>
            <h3>{l.name}</h3>
            <div className="meta">
              <span>by {l.seller}</span>
              <span>{l.category}</span>
              <span>{l.platform}</span>
              <span>{money(l.priceCents)}</span>
              <span>{l.licence ?? 'no licence type'}</span>
              {l.hasTrial && <span>has a trial copy</span>}
            </div>
            <p>{l.description}</p>
            <ul className="checks">
              {l.includes.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <div className="meta">
              {l.demoUrl && (
                <a href={l.demoUrl} target="_blank" rel="noopener noreferrer nofollow">
                  Demo
                </a>
              )}
              {l.codeUrl && (
                <a href={l.codeUrl} target="_blank" rel="noopener noreferrer nofollow">
                  Files (private link)
                </a>
              )}
              {l.sampleUrl && (
                <a href={l.sampleUrl} target="_blank" rel="noopener noreferrer nofollow">
                  Free sample
                </a>
              )}
              <Link href={`/product/${l.slug}`}>Listing page</Link>
            </div>
            <div className="scan">
              {l.scan ? (
                l.scan.map((c) => (
                  <span key={c.text} className={'chip ' + c.tone}>
                    <i />
                    {c.text}
                  </span>
                ))
              ) : (
                <span className="chip amber">
                  <i />
                  Not scanned yet
                </span>
              )}
            </div>
            <AdminForm endpoint={`/api/admin/listings/${l.slug}/scan`} fields={[]} submit="Run the scan" openLabel="Scan again" tone="line" />
            {l.thirdParty.length > 0 && <p className="muted">Third-party code: {l.thirdParty.map((t) => `${t.name} (${t.licence})`).join(', ')}</p>}
            <AdminForm endpoint={`/api/admin/listings/${l.slug}/decide`} fields={decisionFields(l.digital)} submit="Save decision" openLabel="Decide" tone="gold" />
          </div>
        ))}
      </div>

      <div className="dp" id="developers">
        <div className="hd">
          <div>
            <h2>Developer profiles</h2>
            <p className="sub">Profiles stay hidden until you approve them.</p>
          </div>
        </div>
        {devs.length === 0 && <p className="muted">Nothing is waiting for review.</p>}
        {devs.map((d) => (
          <div className="adm-card" key={d.handle}>
            <h3>{d.name}</h3>
            <p>
              <b>{d.headline}</b>
            </p>
            <p>{d.bio}</p>
            <AdminForm endpoint={`/api/admin/developers/${d.handle}/decide`} fields={decisionFields(false)} submit="Save decision" openLabel="Decide" tone="gold" />
          </div>
        ))}
      </div>

      <div className="dp">
        <div className="hd">
          <div>
            <h2>Blocked messages</h2>
            <p className="sub">Attempts to share contact details or pay outside. Three in 30 days warn the person, five suspend the account.</p>
          </div>
        </div>
        <ul className="lst" data-blocked-list>
          {blocked.length === 0 && (
            <li>
              <div className="grow">
                <small>No blocked messages yet.</small>
              </div>
            </li>
          )}
          {blocked.map((m) => (
            <li key={m.id}>
              <span className="av">{(m.sender_name || m.sender_id)[0]?.toUpperCase()}</span>
              <div className="grow">
                <b>
                  {m.sender_name || 'User ' + String(m.sender_id).slice(0, 8)} · {REASON_LABEL[m.reason] ?? m.reason}
                </b>
                <small>
                  {m.context === 'presale' ? 'Pre-sale question' : m.context === 'presale_reply' ? 'Seller reply' : 'Order chat'}
                  {m.product_key ? ` on ${m.product_key}` : ''}: &ldquo;{(m.body ?? '').slice(0, 140)}&rdquo;
                </small>
              </div>
              <span className="chip rose">
                <i />
                Blocked
              </span>
            </li>
          ))}
        </ul>
      </div>
    </DashShell>
  );
}
