/**
 * CORS Origin Validation Utilities
 * Enforces explicit origin whitelisting without wildcards for credentialed requests.
 */

export function parseAllowedOrigins(
  frontendUrl?: string,
  allowedOrigins?: string,
): string[] {
  const configuredFrontendUrl = frontendUrl || '';
  const configuredAllowedOrigins = allowedOrigins || '';

  const origins = [
    ...configuredFrontendUrl.split(','),
    ...configuredAllowedOrigins.split(','),
    'https://saloon-client.bc.dartcodes.com',
  ]
    .map((s) => s.trim().toLowerCase().replace(/\/+$/, ''))
    .filter(Boolean);

  return Array.from(new Set(origins));
}

export function isOriginAllowed(
  origin: string | undefined,
  trustedOrigins: string[],
  isProduction: boolean,
): boolean {
  // Allow non-browser requests (mobile apps, server-to-server, PayHere IPN webhooks)
  if (!origin) {
    return true;
  }

  const normalizedOrigin = origin.trim().toLowerCase().replace(/\/+$/, '');

  // Exact matching against explicit allow-list only
  if (trustedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  // Local development origins allowed ONLY in non-production
  if (!isProduction) {
    try {
      const url = new URL(origin);
      const hostname = url.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.localhost')
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  // Strictly reject arbitrary subdomains and unknown origins
  return false;
}
