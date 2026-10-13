import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminForm, type Field } from '@/components/AdminForm';
import { DashIcon, type IconName } from '@/components/DashIcon';
import { DashShell } from '@/components/DashShell';
import { devQueue, listReports, listingQueue } from '@/lib/admin/queue';
import { openDisputes } from '@/lib/disputes';
import { listPayouts } from '@/lib/payouts';
import { blockedList } from '@/lib/presale/service';
import { requireViewer } from '@/lib/supabase/viewer';

export const metadata: Metadata = { title: 'Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

const REASON_LABEL: Record<string, string> = { email: 'email address', phone: 'phone number', contact_channel: 'other contact channel', link: 'link', outside_payment: 'outside payment' };
const SHORTCUTS: { label: string; text: string; href: string; icon: IconName }[] = [
  { label: 'Write a blog post', text: 'With its own meta title and description', href: '/dashboard/admin/seo/post', icon: 'plus' },
  { label: 'SEO and blog', text: 'Posts, Google title, Search Console', href: '/dashboard/admin/seo', icon: 'search' },
  { label: 'Accounts', text: 'Find, ban or unban a person', href: '/dashboard/admin/users', icon: 'user' },
  { label: 'Risk', text: 'Daily numbers and the emergency switch', href: '/dashboard/admin/risk', icon: 'pulse' },
  { label: 'Settings', text: 'Site switches and limits', href: '/dashboard/admin/settings', icon: 'gear' },
  { label: 'Launch check', text: 'What the live server still needs', href: '/dashboard/admin/launch', icon: 'check' },
];
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
  const counts: { label: string; n: number; href: string; icon: IconName; tone: string }[] = [
    { label: 'Listings to review', n: listings.length, href: '#listings', icon: 'bag', tone: 'blue' },
    { label: 'Developer profiles', n: devs.length, href: '#developers', icon: 'user', tone: 'violet' },
    { label: 'Open disputes', n: disputes.length, href: '/dashboard/admin/disputes', icon: 'scale', tone: 'rose' },
    { label: 'Payouts to send', n: payouts.length, href: '/dashboard/admin/payouts', icon: 'wallet', tone: 'mint' },
    { label: 'Abuse reports', n: reports.length, href: '/dashboard/admin/abuse', icon: 'flag', tone: 'gold' },
  ];
  return (
    <DashShell name={viewer?.name} signedIn={!!viewer} viewerRole={viewer?.role} role="admin" active="admin" title="Admin overview">
      <div className="kpis">
        {counts.map((c) => (
          <Link key={c.label} href={c.href} className={'kpi' + (c.n > 0 ? ' kpi-on' : '')}>
            <span className={'kpi-i ' + c.tone}>
              <DashIcon n={c.icon} />
            </span>
            <small>{c.label}</small>
            <b>{c.n}</b>
            <em>{c.n > 0 ? 'Needs you' : 'All clear'}</em>
          </Link>
        ))}
      </div>

      <div className="dp">
        <div className="hd">
          <div>
            <h2>Shortcuts</h2>
            <p className="sub">The pages you open most.</p>
          </div>
        </div>
        <div className="qlinks">
          {SHORTCUTS.map((q) => (
            <Link key={q.href + q.label} href={q.href} className="qlink">
              <span className="kpi-i">
                <DashIcon n={q.icon} />
              </span>
              <span>
                <b>{q.label}</b>
                <small>{q.text}</small>
              </span>
            </Link>
          ))}
        </div>
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
