import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BrowseClient, type Initial } from '@/components/BrowseClient';
import { SHELVES, SLUG_TO_PLATFORM, appsFor } from '@/lib/apps';
import { getLiveDbProducts } from '@/lib/catalog';
import { showExamples } from '@/lib/examples';

type Props = { params: Promise<{ platform: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const DESC = {
  android: 'Ready-made Android apps, rebranded and published to your own Google Play account in 1 to 7 days.',
  ios: 'Ready-made iPhone and iPad apps, rebranded and sent to your own App Store account in 1 to 7 days.',
  webapp: 'Ready-made web apps, rebranded and deployed on your own domain in 1 to 7 days.',
  desktop: 'Ready-made desktop apps for Windows, Mac and Linux, rebranded and sent as installers in 1 to 7 days.',
  digital: 'Figma kits, no-code templates, plugins, scripts, AI automations, chatbots, AI prompts and video templates. Files right after payment, money held in escrow for 48 hours.',
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pl = SLUG_TO_PLATFORM[(await params).platform];
  return pl ? { title: SHELVES[pl].label, description: DESC[pl] } : {};
}

/* Seller apps depend on the database, so this shelf renders per request like the website one. */
export const dynamic = 'force-dynamic';

export default async function Apps({ params, searchParams }: Props) {
  const pl = SLUG_TO_PLATFORM[(await params).platform];
  if (!pl) notFound();
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const initial: Initial = { cat: one('cat'), q: one('q'), feat: one('feat'), min: one('min'), max: one('max'), days: one('days'), rating: one('rating'), sort: one('sort'), saved: one('saved') };
  return <BrowseClient initial={initial} items={[...(await getLiveDbProducts(pl)), ...((await showExamples()) ? appsFor(pl) : [])]} kind={pl} />;
}
