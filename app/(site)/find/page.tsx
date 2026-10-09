import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { SolutionFinder } from '@/components/SolutionFinder';
import { getLiveDbProducts } from '@/lib/catalog';

export const metadata: Metadata = { title: 'Find your site', description: 'Tell us what you do and get the best matching sites straight away.' };

export default async function Find() {
  return (
    <>
      <PageHero tone="violet" art={false} title="Tell us what you do. We pick your site." lead="One click. No sign-up, no long form." />
      <div className="wrap find-body">
        <SolutionFinder extra={await getLiveDbProducts()} />
        <p className="muted find-alt">
          Rather look around yourself?{' '}
          <Link className="link-u" href="/browse">
            Browse all sites
          </Link>
          .
        </p>
      </div>
    </>
  );
}
