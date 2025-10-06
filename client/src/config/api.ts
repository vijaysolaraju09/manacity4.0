const raw = import.meta.env.VITE_API_URL;

if (typeof raw !== 'string' || !raw.trim()) {
  throw new Error('VITE_API_URL environment variable is required');
}

const normalized = raw.trim();

export const API_BASE = normalized.endsWith('/') ? normalized : `${normalized}/`;
