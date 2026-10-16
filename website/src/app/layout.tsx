import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans, Caveat } from 'next/font/google';
import { JsonLd } from '@/components/seo/JsonLd';
import { APP_NAME, SITE_DESCRIPTION } from '@/lib/constants';
import {
  buildMetadata,
  organizationJsonLd,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from '@/lib/seo';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
});

export const metadata: Metadata = buildMetadata({
  title: APP_NAME,
  description: SITE_DESCRIPTION,
  path: '/',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakartaSans.variable} ${caveat.variable} h-full scroll-smooth`}
    >
      <body className="min-h-full font-sans antialiased bg-[#F9FAFB] text-[#0F172A] selection:bg-[#E9D5FF] selection:text-[#7C3AED]">
        <JsonLd
          data={[organizationJsonLd(), webSiteJsonLd(), softwareApplicationJsonLd()]}
        />
        {children}
      </body>
    </html>
  );
}
