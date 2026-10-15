import { DEFAULT_FALLBACK_PLANS } from '@/lib/plans';
import type { PublicPlan } from '@/types/plans';

export function getApiBaseUrl(): string {
  const internal = process.env.INTERNAL_API_URL?.replace(/\/$/, '');
  if (internal) return internal;

  const serverApi = process.env.API_URL?.replace(/\/$/, '');
  if (serverApi) return serverApi;

  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (publicUrl) {
    if (
      publicUrl.includes('salon-main-website') ||
      publicUrl === 'http://localhost:3000/api' ||
      publicUrl === 'http://localhost:3000'
    ) {
      return 'https://saloon-server.bc.dartcodes.com/api';
    }
    return publicUrl;
  }

  return 'https://saloon-server.bc.dartcodes.com/api';
}

export function getAppUrl(): string {
  let envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    envUrl = envUrl.replace(/\/(salon\/)?login\/?$/i, '').replace(/\/$/, '');
    if (envUrl) return envUrl;
  }
  return 'https://saloon-client.bc.dartcodes.com';
}

export function signupUrl(planId: string, billingCycle?: string): string {
  const base = `${getAppUrl()}/signup/${planId}`;
  if (billingCycle) {
    return `${base}?cycle=${billingCycle.toLowerCase()}`;
  }
  return base;
}

export function loginUrl(): string {
  return `${getAppUrl()}/salon/login`;
}

/**
 * Resilient request helper for server-side fetches.
 * Avoids Next.js dev server's patched fetch interceptor which can crash
 * on connection failures when WASM source mapping encounters errors.
 */
function requestJson(url: string, timeoutMs: number = 8000): Promise<unknown> {
  if (typeof window === 'undefined') {
    return new Promise((resolve, reject) => {
      try {
        const isHttps = url.startsWith('https:');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { request } = isHttps ? require('node:https') : require('node:http');

        const req = request(
          url,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'User-Agent': 'DartSmartSalon-Website/1.0',
            },
            timeout: timeoutMs,
          },
          (res: import('node:http').IncomingMessage) => {
            const statusCode = res.statusCode ?? 500;
            if (statusCode < 200 || statusCode >= 300) {
              return reject(new Error(`HTTP ${statusCode}`));
            }
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (chunk: string) => {
              body += chunk;
            });
            res.on('end', () => {
              try {
                resolve(JSON.parse(body));
              } catch (e) {
                reject(e);
              }
            });
          }
        );

        req.on('error', (err: Error) => reject(err));
        req.on('timeout', () => {
          req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
        });
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  return fetch(url, { headers: { Accept: 'application/json' } }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}

export async function fetchPublicPlans(): Promise<PublicPlan[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/plans`;

  try {
    const data = await requestJson(url, 8000);
    if (Array.isArray(data) && data.length > 0) {
      return data as PublicPlan[];
    }
    return DEFAULT_FALLBACK_PLANS;
  } catch (error) {
    console.warn(`[Plans API] Note: Using offline/fallback plans catalogue (${(error as Error)?.message || error})`);
    return DEFAULT_FALLBACK_PLANS;
  }
}
