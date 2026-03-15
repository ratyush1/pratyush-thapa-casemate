export function getAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = (import.meta.env.VITE_API_URL || window.location.origin.replace(/:\d+$/, ':5000')).replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
