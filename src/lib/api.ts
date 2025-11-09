// Central API base configuration with sensible defaults
// Prefer env var VITE_API_BASE (without trailing slash), fallback to production domain
let RAW_BASE = (import.meta as any).env?.VITE_API_BASE || 'https://tou-event.ddns.net/api';
// If running on Vercel (or any hosted domain) and no explicit base provided, use relative '/api' to leverage vercel.json proxy and avoid CORS
try {
  const onHosted = typeof window !== 'undefined' && /\.vercel\.app$/.test(window.location.hostname);
  const explicitlySet = Boolean((import.meta as any).env?.VITE_API_BASE);
  if (onHosted && !explicitlySet) RAW_BASE = '/api';
} catch {}
export const API_BASE = String(RAW_BASE).replace(/\/$/, '');
export const API_V1 = `${API_BASE}/v1`;

// Optional tiny helper for JSON requests
export async function httpJson<T = any>(url: string, init: RequestInit = {}): Promise<{ data: T; res: Response }>{
  const res = await fetch(url, init);
  const ct = res.headers.get('content-type') || '';
  const isJson = ct.includes('application/json');
  const data = (isJson ? await res.json().catch(() => (null as any)) : await res.text().catch(() => (null as any))) as T;
  if (!res.ok) {
    const err: any = new Error((data as any)?.message || `HTTP ${res.status}`);
    err.responseBody = isJson ? JSON.stringify(data) : String(data);
    throw err;
  }
  return { data, res };
}

// Generate headers with telegram-id (always string) and optional Authorization (for legacy endpoints)
export function tgHeaders(telegramId?: string, opts: { includeAuthorization?: boolean } = {}): Record<string,string> {
  if (!telegramId) return {};
  const tid = String(telegramId);
  const h: Record<string,string> = { 'telegram-id': tid };
  if (opts.includeAuthorization) h['Authorization'] = tid;
  return h;
}
