import { Request, Response } from 'express';
import { z } from 'zod';
import { ProductModel, ProductDoc } from '../models/Product';
import { createProductSchema, updateProductSchema, CreateProductDTO, UpdateProductDTO } from '../validators/productSchemas';

interface ProductResponseDTO {
  id: string;
  slug: string;
  title: string;
  images: any[];
  ratings: { average: number; count: number };
  pricing: ProductDoc['pricing'];
  availability: 'active' | 'archived';
}

const normalizeProduct = (p: ProductDoc): ProductResponseDTO => ({
  id: p._id.toString(),
  slug: p.slug,
  title: p.title,
  images: p.images || [],
  ratings: { average: p.ratingAvg, count: p.ratingCount },
  pricing: p.pricing,
  availability: p.status,
});

export const createProduct = async (req: Request, res: Response) => {
  const parsed = createProductSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }
  try {
    const product = await ProductModel.create(parsed.data as CreateProductDTO);
    res.status(201).json(normalizeProduct(product));
  } catch (err) {
    res.status(500).json({ error: 'Failed to add product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const bodyResult = updateProductSchema.safeParse(req.body);
  const paramResult = z.object({ id: z.string() }).safeParse(req.params);
  if (!bodyResult.success || !paramResult.success) {
    const errors = {
      ...(bodyResult.success ? {} : bodyResult.error.flatten().fieldErrors),
      ...(paramResult.success ? {} : paramResult.error.flatten().fieldErrors),
    };
    return res.status(400).json({ errors });
  }
  try {
    const product = await ProductModel.findById(paramResult.data.id);
    if (!product || product.isDeleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    Object.assign(product, bodyResult.data as UpdateProductDTO);
    await product.save();
    res.json(normalizeProduct(product));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  const querySchema = z.object({
    shopId: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(['active', 'archived']).optional(),
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().optional().default(20),
  });
  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten().fieldErrors });
  }
  const { shopId, category, status, page, pageSize } = result.data;
  const filter: any = { isDeleted: false };
  if (shopId) filter.shopId = shopId;
  if (category) filter.category = category;
  if (status) filter.status = status;
  const skip = (page - 1) * pageSize;
  try {
    const [items, total] = await Promise.all([
      ProductModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(pageSize),
      ProductModel.countDocuments(filter),
    ]);
    res.json({ items: items.map(normalizeProduct), total });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  const result = z.object({ id: z.string() }).safeParse(req.params);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten().fieldErrors });
  }
  try {
    const product = await ProductModel.findOne({ _id: result.data.id, isDeleted: false });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(normalizeProduct(product));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};
