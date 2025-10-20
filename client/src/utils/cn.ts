type ClassValue =
  | string
  | number
  | null
  | undefined
  | boolean
  | ClassDictionary
  | ClassValue[];

type ClassDictionary = Record<string, boolean | null | undefined>;

const toClassString = (value: ClassValue): string => {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(toClassString).filter(Boolean).join(' ');
  return Object.entries(value)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key)
    .join(' ');
};

export const cn = (...values: ClassValue[]): string =>
  values
    .map(toClassString)
    .filter(Boolean)
    .join(' ');

export default cn;
