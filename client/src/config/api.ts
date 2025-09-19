const raw = import.meta.env.VITE_API_URL;
const normalized = typeof raw === 'string' ? raw.trim() : '';
const base = normalized || '/api';

export const API_BASE = base.endsWith('/') ? base : `${base}/`;
