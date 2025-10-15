const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const sanitizeNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 0;
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatINR = (paise: unknown): string => {
  const value = sanitizeNumber(paise);
  const rounded = Math.round(value);
  return INR_FORMATTER.format(rounded / 100);
};

export const toPaise = (value: unknown): number => {
  const num = sanitizeNumber(value);
  return Math.round(num);
};

export const rupeesToPaise = (value: unknown): number => {
  const num = sanitizeNumber(value);
  return Math.round(num * 100);
};

export const pickPaise = (...values: unknown[]): number | undefined => {
  for (const candidate of values) {
    if (candidate === null || candidate === undefined) continue;
    const num = typeof candidate === 'number' ? candidate : Number(candidate);
    if (Number.isFinite(num)) {
      return Math.round(num);
    }
  }
  return undefined;
};
