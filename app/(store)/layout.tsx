import { EarlyBar } from '@/components/EarlyBar';
import { StoreSide } from '@/components/StoreSide';
import { StoreTop } from '@/components/StoreTop';
import { StoreFoot } from '@/components/StoreFoot';

/* The store-style shell: its own side menu and top bar instead of the site's top bar and footer. */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="st-shell">
      <StoreSide />
      <div className="st-body">
        <EarlyBar />
        <StoreTop />
        <main id="main">{children}</main>
        <StoreFoot />
      </div>
    </div>
  );
}
