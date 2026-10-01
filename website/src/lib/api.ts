import { DEFAULT_FALLBACK_PLANS } from '@/lib/plans';
import type { PublicPlan } from '@/types/plans';

export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!base) {
    return 'http://localhost:3000/api';
  }
  return base;
}

export function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');
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
  const url = `${getApiBaseUrl()}/plans`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

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
      console.warn(`[Plans API] Backend responded with ${res.status} ${res.statusText}. Using fallback plans.`);
      return DEFAULT_FALLBACK_PLANS;
    }

    const data = (await res.json()) as unknown;
    if (Array.isArray(data) && data.length > 0) {
      return data as PublicPlan[];
    }

    return DEFAULT_FALLBACK_PLANS;
  } catch (error) {
    console.warn('[Plans API] Backend fetch error, falling back to local plans catalogue:', error);
    return DEFAULT_FALLBACK_PLANS;
  }
}

