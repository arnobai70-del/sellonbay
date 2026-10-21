import { SiteNavByPath } from '@/components/SiteNavByPath';
import { EarlyBar } from '@/components/EarlyBar';
import { Footer } from '@/components/Footer';
import { VisitTracker } from '@/components/VisitTracker';
import { Suspense } from 'react';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EarlyBar />
      <SiteNavByPath />
      <main id="main">{children}</main>
      <Footer />
      <Suspense fallback={null}>
        <VisitTracker />
      </Suspense>
    </>
  );
}
