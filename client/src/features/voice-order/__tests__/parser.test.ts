import { describe, expect, it } from 'vitest';
import { parseUtterance } from '../parser';

const toSnapshot = (input: string) => {
  const result = parseUtterance(input);
  return {
    items: result.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
    })),
    guesses: result.guesses.map((guess) => guess.name),
    language: result.languageHint,
  };
};

describe('voice order parser', () => {
  it('parses telugu quantities', () => {
    expect(toSnapshot('oka kg tomatolu')).toEqual({
      items: [
        {
          name: 'tomato',
          quantity: 1,
          unit: 'kg',
        },
      ],
      guesses: [],
      language: 'te',
    });
  });

  it('parses english quantities and units', () => {
    expect(toSnapshot('2 kg bendakayalu')).toEqual({
      items: [
        {
          name: 'okra',
          quantity: 2,
          unit: 'kg',
        },
      ],
      guesses: [],
      language: 'mixed',
    });
  });

  it('supports fractional quantities', () => {
    expect(toSnapshot('half kilo tomato')).toEqual({
      items: [
        {
          name: 'tomato',
          quantity: 0.5,
          unit: 'kg',
        },
      ],
      guesses: [],
      language: 'en',
    });
  });

  it('resolves dozens with hindi numerals', () => {
    expect(toSnapshot('do dozen eggs')).toEqual({
      items: [
        {
          name: 'eggs',
          quantity: 2,
          unit: 'dozen',
        },
      ],
      guesses: [],
      language: 'hi',
    });
  });

  it('handles comma separated multi item phrases', () => {
    const snapshot = toSnapshot('2 kg bendakayalu, oka kilo tomatolu');
    expect(snapshot.items).toEqual([
      { name: 'okra', quantity: 2, unit: 'kg' },
      { name: 'tomato', quantity: 1, unit: 'kg' },
    ]);
    expect(snapshot.language === 'mixed' || snapshot.language === 'te').toBe(true);
  });

  it('suggests guesses when nothing parsed', () => {
    const snapshot = toSnapshot('benda kaya please');
    expect(snapshot.items).toHaveLength(0);
    expect(snapshot.guesses).toContain('okra');
  });
});
