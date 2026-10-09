import { SiteNavByPath } from '@/components/SiteNavByPath';
import { EarlyBar } from '@/components/EarlyBar';
import { Footer } from '@/components/Footer';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <EarlyBar />
      <SiteNavByPath />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
