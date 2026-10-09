import type { Metadata } from 'next';
import { BrowseClient, type Initial } from '@/components/BrowseClient';
import { getLiveDbProducts } from '@/lib/catalog';
import { showExamples } from '@/lib/examples';
import { PRODUCTS } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Browse sites',
  description: 'Ready-made websites you can put on your own domain in 1 to 7 days. Filter by what you do, price, speed and rating, and compare side by side.',
};

export default async function Browse({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const initial: Initial = {
    cat: one('cat'),
    q: one('q'),
    feat: one('feat'),
    min: one('min'),
    max: one('max'),
    days: one('days'),
    rating: one('rating'),
    sort: one('sort'),
    saved: one('saved'),
    domain: one('domain'),
  };
  return <BrowseClient initial={initial} items={[...(await getLiveDbProducts('web')), ...((await showExamples()) ? PRODUCTS : [])]} kind="web" />;
}
