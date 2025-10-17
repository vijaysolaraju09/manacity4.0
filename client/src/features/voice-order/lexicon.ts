import type { ProductLexiconEntry } from './types';
import { normalizeToken, tokenize } from './text';

const productEntries: ProductLexiconEntry[] = [
  {
    name: 'tomato',
    aliases: [
      'tomato',
      'tomatos',
      'tomatoes',
      'tomata',
      'tomatar',
      'tamatar',
      'tomatolu',
      'tomato lu',
      'tamato',
    ],
  },
  {
    name: 'onion',
    aliases: [
      'onion',
      'onions',
      'uligadda',
      'ulli',
      'pyaz',
      'payyalu',
      'pyaaz',
      'erra gadda',
    ],
  },
  {
    name: 'potato',
    aliases: ['potato', 'potatoes', 'alu', 'aloo', 'bangaladumpa'],
  },
  {
    name: 'okra',
    aliases: [
      'okra',
      'bhindi',
      'lady finger',
      'ladyfinger',
      'bendakaya',
      'bendakayalu',
      'bhendi',
      'bendakai',
    ],
  },
  {
    name: 'brinjal',
    aliases: ['brinjal', 'baingan', 'vankaya', 'eggplant'],
  },
  {
    name: 'cabbage',
    aliases: ['cabbage', 'patta gobi'],
  },
  {
    name: 'cauliflower',
    aliases: ['cauliflower', 'gobi', 'phool gobi'],
  },
  {
    name: 'carrot',
    aliases: ['carrot', 'gajar', 'gajar ka'],
  },
  {
    name: 'beans',
    aliases: ['beans', 'green beans', 'bens', 'bean'],
  },
  {
    name: 'spinach',
    aliases: ['spinach', 'palak', 'keerai', 'keerra'],
  },
  {
    name: 'rice',
    aliases: ['rice', 'biyyam', 'chawal', 'beras', 'annam'],
  },
  {
    name: 'sugar',
    aliases: ['sugar', 'shakkar', 'sakkare', 'sakkar'],
  },
  {
    name: 'salt',
    aliases: ['salt', 'uppu', 'namak'],
  },
  {
    name: 'milk',
    aliases: ['milk', 'paal', 'doodh', 'paalu'],
  },
  {
    name: 'eggs',
    aliases: ['egg', 'eggs', 'anda', 'guddu', 'mutta', 'muttai'],
  },
  {
    name: 'banana',
    aliases: ['banana', 'bananas', 'kela', 'arati pandu'],
  },
  {
    name: 'apple',
    aliases: ['apple', 'apples', 'seb'],
  },
  {
    name: 'mango',
    aliases: ['mango', 'mangos', 'mangoes', 'aam', 'mamidipandu'],
  },
  {
    name: 'chicken',
    aliases: ['chicken', 'murgi', 'kozi', 'chikkan'],
  },
  {
    name: 'mutton',
    aliases: ['mutton', 'goat', 'lamb', 'kodi mamsam', 'gosht'],
  },
  {
    name: 'fish',
    aliases: ['fish', 'meen', 'chepa', 'machli'],
  },
  {
    name: 'curd',
    aliases: ['curd', 'dahi', 'perugu', 'yogurt'],
  },
  {
    name: 'butter',
    aliases: ['butter', 'vennai', 'makhan'],
  },
  {
    name: 'bread',
    aliases: ['bread', 'loaf'],
  },
  {
    name: 'atta',
    aliases: ['atta', 'wheat flour', 'godhuma pindi', 'gehun ka atta'],
  },
  {
    name: 'maida',
    aliases: ['maida', 'all purpose flour'],
  },
  {
    name: 'oil',
    aliases: ['oil', 'sunflower oil', 'nune', 'tel', 'telugulo'],
  },
  {
    name: 'ghee',
    aliases: ['ghee', 'neyyi', 'ghi'],
  },
  {
    name: 'tea powder',
    aliases: ['tea', 'tea powder', 'chai', 'chai patti'],
  },
  {
    name: 'coffee',
    aliases: ['coffee', 'filter coffee', 'coffi'],
  },
  {
    name: 'dal',
    aliases: ['dal', 'pappu', 'lentils', 'pappulu'],
  },
  {
    name: 'green gram',
    aliases: ['green gram', 'pesalu', 'moong dal', 'pesara'],
  },
  {
    name: 'black gram',
    aliases: ['black gram', 'urad dal', 'minappappu'],
  },
  {
    name: 'chickpea',
    aliases: ['chickpea', 'chana', 'senagalu', 'chole'],
  },
  {
    name: 'soap',
    aliases: ['soap', 'sabun'],
  },
  {
    name: 'detergent',
    aliases: ['detergent', 'powder', 'soapu powder'],
  },
];

export const PRODUCT_LEXICON: ProductLexiconEntry[] = productEntries.map((entry) => ({
  name: entry.name,
  aliases: Array.from(
    new Set(
      entry.aliases
        .map((alias) => {
          const tokens = tokenize(alias).filter(Boolean);
          if (tokens.length > 0) {
            return tokens.join(' ');
          }
          return normalizeToken(alias);
        })
        .filter(Boolean),
    ),
  ),
}));

export const PRODUCT_LOOKUP = PRODUCT_LEXICON.reduce<Record<string, string>>((acc, entry) => {
  entry.aliases.forEach((alias) => {
    acc[alias] = entry.name;
  });
  return acc;
}, {});
