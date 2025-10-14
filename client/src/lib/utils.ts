export type ClassValue = string | false | null | undefined;

export const cn = (...values: ClassValue[]): string => {
  return values.filter(Boolean).join(' ');
};
