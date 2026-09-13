/** Salon owner / staff login (public marketing link). */
export const SALON_LOGIN_PATH = '/salon/login';

/**
 * Platform (super admin) login — use this direct URL; not linked from public marketing.
 * Override with VITE_PLATFORM_LOGIN_PATH in production if desired.
 */
export const SUPER_ADMIN_LOGIN_PATH =
  import.meta.env.VITE_PLATFORM_LOGIN_PATH?.trim() || '/platform/access';
