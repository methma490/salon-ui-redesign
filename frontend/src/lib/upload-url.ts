export function resolveUploadUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(
    /\/$/,
    '',
  );
  return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
}
