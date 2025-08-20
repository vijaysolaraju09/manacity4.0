import mongoose from 'mongoose';
import { slugify, generateSlug } from '../utils/slug';

describe('slug utilities', () => {
  it('slugify converts text to slug', () => {
    expect(slugify(' Hello World! ')).toBe('hello-world');
  });

  it('generateSlug appends increment when slug exists', async () => {
    const exists = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const model = { exists } as unknown as mongoose.Model<any>;
    const slug = await generateSlug(model, 'Test Value');
    expect(slug).toBe('test-value-1');
    expect(exists).toHaveBeenCalledTimes(2);
  });
});
