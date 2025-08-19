import { Types } from 'mongoose';
import { ProductModel, ProductAttrs } from '../models/Product';

export async function seedSampleProducts(
  shopIds: Types.ObjectId[],
  count = 10
) {
  const products: Partial<ProductAttrs>[] = [];
  for (const shopId of shopIds) {
    for (let i = 0; i < count; i++) {
      products.push({
        shopId,
        title: `Sample Product ${i + 1}`,
        description: '',
        images: [],
        category: 'general',
        tags: [],
        ratingAvg: 0,
        ratingCount: 0,
        pricing: { mrp: 100, price: 90, currency: 'USD' },
        status: 'active',
      });
    }
  }
  return ProductModel.insertMany(products);
}

export default seedSampleProducts;

