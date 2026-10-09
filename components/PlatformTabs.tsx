import Link from 'next/link';
import { SHELVES, shelfHref, type Platform } from '@/lib/apps';

const ORDER: Platform[] = ['web', 'android', 'ios', 'webapp', 'desktop', 'digital'];

/* One switch between the five shelves, shown on top of each of them. */
export function PlatformTabs({ kind }: { kind: Platform }) {
  return (
    <nav className="ptabs" aria-label="What are you looking for">
      {ORDER.map((k) => (
        <Link key={k} href={shelfHref(k)} aria-current={k === kind ? 'page' : undefined}>
          {k === 'web' ? 'Websites' : SHELVES[k].label}
        </Link>
      ))}
    </nav>
  );
}
