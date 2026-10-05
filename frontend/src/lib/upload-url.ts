export function resolveUploadUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const url = new URL(path);
      const spacesHost = url.hostname.match(/^(.+)\.([a-z0-9-]+)(\.cdn)?\.digitaloceanspaces\.com$/i);
      if (spacesHost?.[1].includes('.')) {
        const bucketName = spacesHost[1];
        const region = spacesHost[2];
        return `https://${region}.digitaloceanspaces.com/${bucketName}${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      return path;
    }
    return path;
  }

  const defaultApiBase = import.meta.env.DEV
    ? 'http://localhost:3000/api'
    : 'https://saloon-server.bc.dartcodes.com/api';

  const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  let apiBase = (
    rawApiBase && rawApiBase !== '' && rawApiBase !== '/api'
      ? rawApiBase
      : defaultApiBase
  ).replace(/\/$/, '');
  if (!apiBase.endsWith('/api')) {
    apiBase = `${apiBase}/api`;
  }
  return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
}
