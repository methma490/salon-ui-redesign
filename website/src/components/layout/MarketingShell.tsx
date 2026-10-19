import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { WhatsAppWidget } from '@/components/ui/WhatsAppWidget';
import { ScrollToTop } from '@/components/ui/ScrollToTop';

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pt-18 sm:pt-20">{children}</main>
      <Footer />
      <WhatsAppWidget />
      <ScrollToTop />
    </>
  );
}
