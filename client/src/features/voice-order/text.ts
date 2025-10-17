const stripDiacritics = (value: string): string =>
  value.normalize('NFD').replace(/\p{Diacritic}+/gu, '');

export const normalizeToken = (token: string): string => {
  if (!token) return '';
  const trimmed = token.trim().toLowerCase();
  if (!trimmed) return '';
  const stripped = stripDiacritics(trimmed);
  const cleaned = stripped.replace(/[^a-z0-9\u0900-\u097f\u0c00-\u0c7f]+/gu, '');
  return cleaned;
};

const separateNumbers = (input: string) =>
  input
    .replace(/(\d+)([a-zA-Z]+)/g, '$1 $2')
    .replace(/([a-zA-Z]+)(\d+)/g, '$1 $2')
    .replace(/(\d+[,.]\d+)/g, (match) => match.replace(/[,]/g, '.'));

export const tokenize = (input: string): string[] => {
  if (!input) return [];
  const prepared = separateNumbers(input)
    .replace(/[\u2019'"()\[\]{}]+/g, ' ')
    .replace(/[+\-*/=]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!prepared) return [];

  return prepared
    .split(' ')
    .map((piece) => normalizeToken(piece))
    .filter(Boolean);
};

const DEFAULT_SPLIT_REGEX = /(?:,|\bor\b|\bwith\b|\band also\b|\band then\b|\+|\band plus\b|\band please\b|\bమరియు\b|\bమరీ\b|\bమరియు కూడా\b|\bతో పాటు\b|\bతో\b|\bऔर\b|\bऔर भी\b|\bऔऱ\b|\bandar\b|\bఅలాగే\b|\bపాటు\b)/giu;

export const splitUtterance = (input: string): string[] => {
  if (!input) return [];
  const sanitized = input.replace(/[!?]+/g, '.').replace(/\s+/g, ' ').trim();
  if (!sanitized) return [];

  return sanitized
    .split(DEFAULT_SPLIT_REGEX)
    .map((segment) => segment.replace(/[.]+$/g, '').trim())
    .filter(Boolean);
};

export const guessLanguageFromTokens = (tokens: string[]): 'te' | 'hi' | 'en' | 'mixed' => {
  if (tokens.length === 0) return 'en';
  let teScore = 0;
  let hiScore = 0;
  let enScore = 0;

  const teHints = new Set(['oka', 'rendu', 'moodu', 'nalugu', 'aidu', 'ara', 'pav', 'bendakaya', 'tomatolu']);
  const hiHints = new Set(['ek', 'do', 'teen', 'char', 'paanch', 'sawa', 'aadha', 'paav', 'dozen']);
  const enHints = new Set(['one', 'two', 'three', 'four', 'half', 'quarter', 'piece']);

  tokens.forEach((token) => {
    if (/^[\u0c00-\u0c7f]+$/.test(token)) {
      teScore += 2;
    } else if (/^[\u0900-\u097f]+$/.test(token)) {
      hiScore += 2;
    }

    if (teHints.has(token)) teScore += 1;
    if (hiHints.has(token)) hiScore += 1;
    if (enHints.has(token)) enScore += 1;
  });

  const scores = [
    { lang: 'te' as const, score: teScore },
    { lang: 'hi' as const, score: hiScore },
    { lang: 'en' as const, score: enScore },
  ];

  const best = scores.reduce((acc, entry) => (entry.score > acc.score ? entry : acc));

  const significantScores = scores.filter((entry) => entry.score >= best.score - 1 && entry.score > 0);
  if (significantScores.length > 1) return 'mixed';
  return best.score > 0 ? best.lang : 'mixed';
};
