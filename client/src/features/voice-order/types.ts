export type VoiceUnit = 'kg' | 'g' | 'dozen' | 'piece';

export interface ParsedItem {
  name: string;
  quantity: number;
  unit: VoiceUnit;
  raw: string;
}

export interface ParseGuess {
  name: string;
  confidence: number;
  raw: string;
}

export interface ParseResult {
  items: ParsedItem[];
  guesses: ParseGuess[];
  languageHint: 'te' | 'hi' | 'en' | 'mixed';
}

export interface ProductLexiconEntry {
  name: string;
  aliases: string[];
}

export interface VoiceProductHit {
  id: string;
  name: string;
  image?: string;
  pricePaise: number;
  shopId: string;
  shopName: string;
  available?: boolean;
  raw: Record<string, unknown>;
}
