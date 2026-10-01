import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
