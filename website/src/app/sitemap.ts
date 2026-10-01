import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

const routes = [
  '',
  '/features',
  '/pricing',
  '/solutions',
  '/about',
  '/contact',
  '/faq',
  '/privacy',
  '/terms',
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified,
    changeFrequency: path === '' || path === '/pricing' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
