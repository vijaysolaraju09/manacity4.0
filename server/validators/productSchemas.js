const { z } = require('zod');

const productBase = {
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  mrp: z.number().positive(),
  category: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  stock: z.number().int().nonnegative().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  shopId: z.string().optional(),
};

const createProductSchema = {
  body: z.object(productBase),
};

const updateProductSchema = {
  body: z
    .object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      price: z.number().positive().optional(),
      mrp: z.number().positive().optional(),
      category: z.string().optional(),
      images: z.array(z.string().url()).optional(),
      stock: z.number().int().nonnegative().optional(),
      status: z.enum(['active', 'inactive']).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
  params: z.object({ id: z.string() }),
};

module.exports = {
  createProductSchema,
  updateProductSchema,
};
