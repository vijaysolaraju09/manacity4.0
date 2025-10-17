import { describe, expect, it } from 'vitest';
import { formatINR } from '@/utils/currency';

const normalize = (value: string) => value.replace(/\u00A0/g, ' ');

describe('formatINR', () => {
  it('formats integer paise into rupees with currency symbol', () => {
    const result = normalize(formatINR(12345));
    expect(result).toBe('₹ 123.45');
  });

  it('sanitizes non-numeric inputs gracefully', () => {
    expect(normalize(formatINR('2500'))).toBe('₹ 25.00');
    expect(normalize(formatINR(null))).toBe('₹ 0.00');
    expect(normalize(formatINR(undefined))).toBe('₹ 0.00');
  });

  it('rounds paise to the nearest whole number before formatting', () => {
    const formatted = normalize(formatINR(199));
    expect(formatted).toBe('₹ 1.99');

    const rounded = normalize(formatINR(99.6));
    expect(rounded).toBe('₹ 1.00');
  });
});
