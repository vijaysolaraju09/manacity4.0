import { PRODUCT_LEXICON } from './lexicon';
import { levenshtein } from './distance';
import { guessLanguageFromTokens, splitUtterance, tokenize } from './text';
import type { ParseGuess, ParseResult, ParsedItem, VoiceUnit } from './types';

const MAX_FUZZY_DISTANCE = 2;

const unitSynonyms: Record<VoiceUnit, string[]> = {
  kg: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms', 'kgee', 'keer'],
  g: ['g', 'gram', 'grams', 'gm', 'gms', 'gramm'],
  dozen: ['dozen', 'dazzen', 'dazane'],
  piece: ['piece', 'pieces', 'pc', 'pcs', 'packet', 'pack'],
};

const UNIT_LOOKUP = Object.entries(unitSynonyms).reduce<Record<string, VoiceUnit>>((acc, [unit, aliases]) => {
  aliases.forEach((alias) => {
    acc[alias] = unit as VoiceUnit;
  });
  return acc;
}, {});

const numberWords = new Map<string, number>([
  ['zero', 0],
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
  ['half', 0.5],
  ['quarter', 0.25],
  ['threequarter', 0.75],
  ['threequarters', 0.75],
  ['oneandhalf', 1.5],
  ['onehalf', 1.5],
  ['onepointfive', 1.5],
  ['dozen', 12],
  // Hindi
  ['ek', 1],
  ['do', 2],
  ['teen', 3],
  ['char', 4],
  ['paanch', 5],
  ['panch', 5],
  ['chaar', 4],
  ['sawa', 1.25],
  ['sava', 1.25],
  ['dedh', 1.5],
  ['adhai', 2.5],
  ['aadha', 0.5],
  ['adha', 0.5],
  ['paav', 0.25],
  ['pau', 0.25],
  ['sawaikilo', 1.25],
  ['savaikilo', 1.25],
  // Telugu (romanised)
  ['oka', 1],
  ['okati', 1],
  ['rendu', 2],
  ['rendu kilo', 2],
  ['moodu', 3],
  ['nalugu', 4],
  ['aidu', 5],
  ['ara', 0.5],
  ['aru', 0.5],
  ['ara kilo', 0.5],
  ['pav', 0.25],
  ['pavu', 0.25],
  ['ara kgs', 0.5],
]);

const DECIMAL_SEPARATORS = /[.,]/g;

const clampQuantity = (quantity: number | null | undefined): number => {
  if (!Number.isFinite(quantity) || quantity === null || quantity === undefined) {
    return 1;
  }
  const safe = Math.max(0.01, quantity);
  return Number.isInteger(safe) ? safe : Math.round(safe * 100) / 100;
};

const inferUnit = (tokens: string[]): { unit: VoiceUnit; unitIndex: number } => {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const direct = UNIT_LOOKUP[token];
    if (direct) {
      return { unit: direct, unitIndex: index };
    }
  }
  return { unit: 'piece', unitIndex: -1 };
};

const collectNumberTokens = (tokens: string[]): { value: number | null; consumed: number[] } => {
  let value: number | null = null;
  const consumed: number[] = [];

  tokens.forEach((token, index) => {
    if (UNIT_LOOKUP[token]) {
      return;
    }

    if (/^\d+(?:\.\d+)?$/.test(token)) {
      const parsed = Number(token);
      if (Number.isFinite(parsed)) {
        value = parsed;
        consumed.push(index);
      }
      return;
    }

    const lookup = numberWords.get(token);
    if (lookup !== undefined) {
      value = (value ?? 0) + lookup;
      consumed.push(index);
      return;
    }

    const compressed = token.replace(DECIMAL_SEPARATORS, '');
    const fused = numberWords.get(compressed);
    if (fused !== undefined) {
      value = (value ?? 0) + fused;
      consumed.push(index);
    }
  });

  if (value !== null && value > 0) {
    return { value, consumed };
  }

  return { value: null, consumed: [] };
};

interface ProductMatch {
  name: string;
  score: number;
  alias: string | null;
}

const matchProduct = (tokens: string[]): ProductMatch | null => {
  if (tokens.length === 0) return null;

  const joined = tokens.join(' ');

  let best: ProductMatch | null = null;

  PRODUCT_LEXICON.forEach((entry) => {
    entry.aliases.forEach((alias) => {
      const aliasTokens = alias.split(' ');
      const aliasJoined = aliasTokens.join(' ');
      const includesDirect = joined.includes(aliasJoined);
      let score = 0;

      if (includesDirect) {
        score = aliasTokens.length * 2 + 3;
      } else if (aliasTokens.length === 1) {
        const aliasToken = aliasTokens[0];
        const bestDistance = tokens.reduce((min, token) => {
          const distance = levenshtein(token, aliasToken);
          return Math.min(min, distance);
        }, Number.POSITIVE_INFINITY);
        if (bestDistance <= MAX_FUZZY_DISTANCE) {
          score = aliasTokens.length * 2 + (MAX_FUZZY_DISTANCE - bestDistance);
        }
      } else {
        let matches = 0;
        aliasTokens.forEach((aliasToken) => {
          const distance = tokens.reduce((min, token) => {
            const d = levenshtein(token, aliasToken);
            return Math.min(min, d);
          }, Number.POSITIVE_INFINITY);
          if (distance <= MAX_FUZZY_DISTANCE) {
            matches += 1;
          }
        });
        if (matches > 0) {
          score = matches * 2;
        }
      }

      if (score > 0) {
        const candidate: ProductMatch = { name: entry.name, score, alias };
        if (!best || candidate.score > best.score) {
          best = candidate;
        }
      }
    });
  });

  return best;
};

const sanitizeTokens = (tokens: string[], consumed: number[]): string[] => {
  if (consumed.length === 0) return tokens;
  return tokens.filter((_, index) => !consumed.includes(index));
};

const parseSegment = (segment: string): ParsedItem | null => {
  const tokens = tokenize(segment);
  if (tokens.length === 0) return null;

  const numberData = collectNumberTokens(tokens);
  const residualTokens = sanitizeTokens(tokens, numberData.consumed);

  const { unit } = inferUnit(residualTokens);
  const productTokens = residualTokens.filter((token) => !UNIT_LOOKUP[token]);

  const productMatch = matchProduct(productTokens);
  if (!productMatch) {
    return null;
  }

  const quantity = clampQuantity(numberData.value);

  return {
    name: productMatch.name,
    quantity,
    unit,
    raw: segment.trim(),
  } satisfies ParsedItem;
};

const buildGuesses = (segment: string): ParseGuess[] => {
  const tokens = tokenize(segment);
  if (tokens.length === 0) return [];

  const guesses: ParseGuess[] = [];

  PRODUCT_LEXICON.forEach((entry) => {
    const aliasScore = entry.aliases.reduce((best, alias) => {
      const aliasTokens = alias.split(' ');
      const matches = aliasTokens.filter((aliasToken) =>
        tokens.some((token) => levenshtein(token, aliasToken) <= MAX_FUZZY_DISTANCE),
      ).length;
      return Math.max(best, matches / Math.max(aliasTokens.length, 1));
    }, 0);

    if (aliasScore > 0) {
      guesses.push({ name: entry.name, confidence: Math.min(1, aliasScore), raw: segment.trim() });
    }
  });

  return guesses.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
};

export const parseUtterance = (utterance: string): ParseResult => {
  if (!utterance || !utterance.trim()) {
    return { items: [], guesses: [], languageHint: 'en' } satisfies ParseResult;
  }

  const segments = splitUtterance(utterance);

  const parsed: ParsedItem[] = [];
  const guesses: ParseGuess[] = [];

  segments.forEach((segment) => {
    const item = parseSegment(segment);
    if (item) {
      parsed.push(item);
    } else {
      guesses.push(...buildGuesses(segment));
    }
  });

  const tokens = tokenize(utterance);
  const languageHint = guessLanguageFromTokens(tokens);

  if (parsed.length === 0 && guesses.length === 0) {
    PRODUCT_LEXICON.forEach((entry) => {
      const aliasTokens = entry.aliases.flatMap((alias) => alias.split(' '));
      const hasOverlap = aliasTokens.some((aliasToken) =>
        tokens.some((token) => levenshtein(token, aliasToken) <= MAX_FUZZY_DISTANCE),
      );
      if (hasOverlap) {
        guesses.push({ name: entry.name, confidence: 0.3, raw: utterance.trim() });
      }
    });
  }

  const uniqueGuesses = guesses
    .reduce<ParseGuess[]>((acc, guess) => {
      const existing = acc.find((item) => item.name === guess.name);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, guess.confidence);
      } else {
        acc.push({ ...guess });
      }
      return acc;
    }, [])
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);

  return {
    items: parsed,
    guesses: uniqueGuesses,
    languageHint,
  } satisfies ParseResult;
};

export const parseMultiple = (utterances: string[]): ParseResult => {
  const combined: ParseResult = { items: [], guesses: [], languageHint: 'en' };

  utterances.forEach((utterance) => {
    const result = parseUtterance(utterance);
    combined.items.push(...result.items);
    combined.guesses.push(...result.guesses);
  });

  if (combined.items.length > 0) {
    const tokens = tokenize(combined.items.map((item) => item.raw).join(' '));
    combined.languageHint = guessLanguageFromTokens(tokens);
  }

  if (combined.guesses.length > 0) {
    combined.guesses = combined.guesses
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  return combined;
};
