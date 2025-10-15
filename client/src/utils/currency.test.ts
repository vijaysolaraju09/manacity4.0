import { describe, expect, it } from 'vitest';
import { formatINR } from './currency';

describe('formatINR', () => {
  it('formats paise as INR with two decimals', () => {
    expect(formatINR(12345)).toBe('₹123.45');
  });

  it('rounds paise before formatting', () => {
    expect(formatINR(1999.6)).toBe('₹20.00');
  });

  it('handles invalid input by returning zero rupees', () => {
    expect(formatINR(Number.NaN)).toBe('₹0.00');
    // @ts-expect-error testing runtime coercion
    expect(formatINR('not-a-number' as any)).toBe('₹0.00');
  });
});
