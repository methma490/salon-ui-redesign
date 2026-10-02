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
      process.env.NODE_ENV === 'production' &&
      (publicUrl === 'http://localhost:3000/api' || publicUrl === 'http://localhost:3000')
    ) {
      return 'https://saloon-server.bc.dartcodes.com/api';
    }
    return publicUrl;
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://saloon-server.bc.dartcodes.com/api';
  }
  return 'http://localhost:3000/api';
}

export function getAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (envUrl) return envUrl;
  if (process.env.NODE_ENV === 'production') {
    return 'https://saloon-client.bc.dartcodes.com';
  }
  return 'http://localhost:5173';
}

export function signupUrl(planId: string, billingCycle?: string): string {
  const base = `${getAppUrl()}/signup/${planId}`;
  if (billingCycle) {
    return `${base}?cycle=${billingCycle.toLowerCase()}`;
  }
  return base;
}

export function loginUrl(): string {
  return `${getAppUrl()}/login`;
}

export async function fetchPublicPlans(): Promise<PublicPlan[]> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/plans`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      next: { revalidate: 60 },
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Plans API] Backend responded with ${res.status} ${res.statusText} from ${url}. Using fallback plans.`);
      return DEFAULT_FALLBACK_PLANS;
    }

    const data = (await res.json()) as unknown;
    if (Array.isArray(data) && data.length > 0) {
      return data as PublicPlan[];
    }

    return DEFAULT_FALLBACK_PLANS;
  } catch (error) {
    console.warn(`[Plans API] Backend fetch error from ${url}, falling back to local plans catalogue:`, error);
    return DEFAULT_FALLBACK_PLANS;
  }
}

