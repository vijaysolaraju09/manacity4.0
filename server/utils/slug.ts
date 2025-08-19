import { Model } from 'mongoose';

export function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function generateSlug<T extends { slug?: string }>(
  model: Model<T>,
  value: string
): Promise<string> {
  const base = slugify(value);
  let slug = base;
  let i = 0;
  while (await model.exists({ slug })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}
