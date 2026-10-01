/** Public marketing site (Next.js) — pricing and home links from the app. */
export function getWebsiteUrl(): string {
  const raw = import.meta.env.VITE_WEBSITE_URL?.trim();
  return (raw || 'http://localhost:3001').replace(/\/$/, '');
}

export function websitePricingUrl(): string {
  return `${getWebsiteUrl()}/pricing`;
}

export function websiteHomeUrl(): string {
  return getWebsiteUrl();
}
