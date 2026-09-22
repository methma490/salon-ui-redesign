export function resolveUploadUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const defaultApiBase = import.meta.env.DEV
    ? 'http://localhost:3000/api'
    : 'https://saloon-server.bc.dartcodes.com/api';

  const rawApiBase = import.meta.env.VITE_API_BASE_URL;
  const apiBase = (
    rawApiBase && rawApiBase.trim() !== '' && rawApiBase.trim() !== '/api'
      ? rawApiBase
      : defaultApiBase
  ).replace(/\/$/, '');
  return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
}
