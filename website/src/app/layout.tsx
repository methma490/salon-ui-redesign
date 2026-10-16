import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { JsonLd } from '@/components/seo/JsonLd';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
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

export const metadata: Metadata = buildMetadata({
  title: `${APP_NAME} — All-in-One Salon Management Software`,
  description: SITE_DESCRIPTION,
  path: '/',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakartaSans.variable} h-full scroll-smooth`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('dart-salon-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full font-sans antialiased bg-[#fafbfc] dark:bg-[#0d0915] text-slate-900 dark:text-[#f8f6ff] selection:bg-violet-600 selection:text-white transition-colors duration-200">
        <ThemeProvider>
          <JsonLd
            data={[organizationJsonLd(), webSiteJsonLd(), softwareApplicationJsonLd()]}
          />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
