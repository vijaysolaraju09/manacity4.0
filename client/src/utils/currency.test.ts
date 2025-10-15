import { describe, expect, it } from 'vitest';
import { formatINR } from './currency';

describe('formatINR', () => {
  it('formats paise as INR with two decimals', () => {
    expect(formatINR(12345)).toBe('₹123.45');
  });

  it('rounds paise before formatting', () => {
    expect(formatINR(1999.6)).toBe('₹20.00');
    expect(formatINR(250)).toBe('₹2.50');
  });

  it('coerces string inputs and supports negatives', () => {
    expect(formatINR('1500')).toBe('₹15.00');
    expect(formatINR(-501)).toBe('-₹5.01');
  });

  it('handles invalid input by returning zero rupees', () => {
    expect(formatINR(Number.NaN)).toBe('₹0.00');
    expect(formatINR('not-a-number')).toBe('₹0.00');
    expect(formatINR(undefined)).toBe('₹0.00');
  });
});
