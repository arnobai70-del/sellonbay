'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from './Logo';
import { signOut } from '@/app/(bare)/login/actions';

export type Role = 'buyer' | 'seller' | 'admin';
type IconName = 'grid' | 'bag' | 'chat' | 'shield' | 'plus' | 'home' | 'user';

const ICON: Record<IconName, React.ReactNode> = {
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  bag: <path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  home: <path d="M4 11l8-7 8 7v9H4z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </>
  ),
};
const Ico = ({ n }: { n: IconName }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {ICON[n]}
  </svg>
);

type Item = { label: string; href: string; icon: IconName; key: string };
const DASH: Record<Role, { name: string; label: string; initial: string; items: Item[]; extra: Omit<Item, 'key'>[] }> = {
  buyer: {
    name: 'Your account',
    label: 'Buyer',
    initial: 'U',
    items: [
      { label: 'Overview', href: '/dashboard/buyer', icon: 'grid', key: 'buyer' },
      { label: 'Messages', href: '/messages', icon: 'chat', key: 'messages' },
    ],
    extra: [
      { label: 'Browse sites', href: '/browse', icon: 'bag' },
      { label: 'Back to site', href: '/', icon: 'home' },
    ],
  },
  seller: {
    name: 'Your account',
    label: 'Seller',
    initial: 'U',
    items: [
      { label: 'Overview', href: '/dashboard/seller', icon: 'grid', key: 'seller' },
      { label: 'Messages', href: '/messages', icon: 'chat', key: 'messages' },
    ],
    extra: [
      { label: 'List a new site', href: '/sell/new', icon: 'plus' },
      { label: 'Back to site', href: '/', icon: 'home' },
    ],
  },
  admin: {
    name: 'Admin',
    label: 'Admin',
    initial: 'U',
    items: [
      { label: 'Overview', href: '/dashboard/admin', icon: 'shield', key: 'admin' },
      { label: 'Disputes', href: '/dashboard/admin/disputes', icon: 'chat', key: 'admin-disputes' },
      { label: 'Payouts', href: '/dashboard/admin/payouts', icon: 'bag', key: 'admin-payouts' },
      { label: 'Accounts', href: '/dashboard/admin/users', icon: 'user', key: 'admin-users' },
      { label: 'Abuse reports', href: '/dashboard/admin/abuse', icon: 'shield', key: 'admin-abuse' },
      { label: 'Security', href: '/dashboard/admin/security', icon: 'shield', key: 'admin-security' },
      { label: 'Settings', href: '/dashboard/admin/settings', icon: 'grid', key: 'admin-settings' },
      { label: 'Launch check', href: '/dashboard/admin/launch', icon: 'shield', key: 'admin-launch' },
      { label: 'Risk', href: '/dashboard/admin/risk', icon: 'grid', key: 'admin-risk' },
      { label: 'New versions', href: '/dashboard/admin/versions', icon: 'grid', key: 'admin-versions' },
      { label: 'Repository access', href: '/dashboard/admin/repo', icon: 'shield', key: 'admin-repo' },
      { label: 'Audit log', href: '/dashboard/admin/audit', icon: 'grid', key: 'admin-audit' },
      { label: 'Messages', href: '/messages', icon: 'chat', key: 'messages' },
    ],
    extra: [{ label: 'Back to site', href: '/', icon: 'home' }],
  },
};

export function DashShell({
  role,
  active,
  title,
  children,
  name,
  signedIn = false,
  viewerRole,
}: {
  role: Role;
  active: string;
  title: string;
  children: React.ReactNode;
  name?: string;
  signedIn?: boolean;
  viewerRole?: Role;
}) {
  const [open, setOpen] = useState(false);
  const d = DASH[role];
  const shown = name || d.name;
  // Signed in: only list dashboards this person can open, and show their real role. Demo mode lists all three.
  const can: Role[] = !signedIn || !viewerRole ? ['buyer', 'seller', 'admin'] : viewerRole === 'admin' ? ['admin', 'seller', 'buyer'] : viewerRole === 'seller' ? ['seller', 'buyer'] : ['buyer'];
  const roleLabel = signedIn && viewerRole ? viewerRole[0].toUpperCase() + viewerRole.slice(1) : d.label;
  return (
    <div className={'dash' + (open ? ' open' : '')}>
      <aside className="side" aria-label="Dashboard">
        <Logo />
        {d.items.map((i) => (
          <Link key={i.key} className="it" href={i.href} aria-current={i.key === active ? 'page' : undefined}>
            <Ico n={i.icon} />
            <span>{i.label}</span>
          </Link>
        ))}
        <div className="grp">Go to</div>
        {d.extra.map((i) => (
          <Link key={i.href} className="it" href={i.href}>
            <Ico n={i.icon} />
            <span>{i.label}</span>
          </Link>
        ))}
        {can.some((r) => r !== role) && <div className="grp">Switch view</div>}
        {can
          .filter((r) => r !== role)
          .map((r) => (
            <Link key={r} className="it" href={`/dashboard/${r}`}>
              <Ico n="user" />
              <span>{r[0].toUpperCase() + r.slice(1)} view</span>
            </Link>
          ))}
        <div className="who">
          <span className="av">{shown[0]?.toUpperCase() ?? d.initial}</span>
          <div className="nm">
            <b title={shown}>{shown}</b>
            <small>{roleLabel} account</small>
          </div>
        </div>
        {signedIn && (
          <form action={signOut}>
            <button className="signout" type="submit">
              Sign out
            </button>
          </form>
        )}
      </aside>
      <div className="main" id="main">
        <div className="top">
          <button className="menu-btn" aria-label="Open menu" onClick={() => setOpen((o) => !o)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <h1>{title}</h1>
          <label className="search">
            <span className="sr">Search</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5E6485" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <input placeholder="Search orders, sites, people" />
          </label>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
