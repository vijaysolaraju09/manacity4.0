export interface CountdownParts {
  d: number;
  h: number;
  m: number;
  s: number;
}

const toTimestamp = (value?: string | number | Date | null): number => {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
};

export const formatCountdown = (dateIso?: string | number | Date | null): CountdownParts => {
  const target = toTimestamp(dateIso);
  if (!Number.isFinite(target)) {
    return { d: 0, h: 0, m: 0, s: 0 };
  }
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { d: days, h: hours, m: minutes, s: seconds };
};

export default formatCountdown;
