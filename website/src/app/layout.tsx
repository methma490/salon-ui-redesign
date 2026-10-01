import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
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

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = buildMetadata({
  title: APP_NAME,
  description: SITE_DESCRIPTION,
  path: '/',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full antialiased">
        <JsonLd
          data={[organizationJsonLd(), webSiteJsonLd(), softwareApplicationJsonLd()]}
        />
        {children}
      </body>
    </html>
  );
}
