import Link from 'next/link';
import { SiteNav } from '@/components/SiteNav';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main id="main" className="center-page">
        <div>
          <h1>Page not found</h1>
          <p>The page you wanted moved or never existed. Browse the sites instead.</p>
          <Link className="btn btn-blue btn-lg" href="/browse">
            Browse sites
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
