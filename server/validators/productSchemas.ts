import { z } from 'zod';

export const mediaAssetSchema = z.object({
  url: z.string().url(),
  alt: z.string(),
  width: z.number().int().nonnegative().optional(),
  height: z.number().int().nonnegative().optional(),
  mime: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const pricingSchema = z.object({
  mrp: z.number().positive(),
  price: z.number().positive(),
  currency: z.string().default('USD'),
});

export const createProductSchema = z.object({
  shopId: z.string(),
  title: z.string().min(1),
  description: z.string().default(''),
  images: z.array(mediaAssetSchema).default([]),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  pricing: pricingSchema,
  status: z.enum(['active', 'archived']).default('active'),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
