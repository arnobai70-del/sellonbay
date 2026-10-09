import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqList } from '@/components/FaqList';
import { PageHero } from '@/components/PageHero';
import { FAQ_GROUPS } from '@/lib/faq';

export const metadata: Metadata = { title: 'Questions and answers' };

export default function FaqPage() {
  return (
    <>
      <PageHero tone="cobalt" title="Questions people ask" lead="Short answers about buying, selling, money and safety." art={false}>
        {FAQ_GROUPS.map((g) => (
          <a key={g.title} className="hero-link" href={'#' + g.title.toLowerCase().replace(/\W+/g, '-')}>
            {g.title}
          </a>
        ))}
      </PageHero>
      <div className="wrap faq-page">
        {FAQ_GROUPS.map((g) => (
          <section key={g.title} id={g.title.toLowerCase().replace(/\W+/g, '-')}>
            <h2>{g.title}</h2>
            <FaqList items={g.items} />
          </section>
        ))}
        <p className="muted faq-end">
          Still stuck?{' '}
          <Link className="link-u" href="/how-it-works">
            See how it works
          </Link>{' '}
          or{' '}
          <Link className="link-u" href="/find">
            take the quiz
          </Link>
          .
        </p>
      </div>
    </>
  );
}
