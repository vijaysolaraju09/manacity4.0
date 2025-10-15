import { Types } from 'mongoose';
import { CartModel, CartAttrs } from '../models/Cart';

export async function seedSampleCarts(
  userIds: Types.ObjectId[],
  productId: Types.ObjectId
) {
  const carts: CartAttrs[] = [] as any;
  for (const userId of userIds) {
    const cart = new CartModel({
      userId,
      items: [{ productId, qty: 1, unitPrice: 10000 }],
      currency: 'INR',
    } as Partial<CartAttrs>);
    await cart.save();
    carts.push(cart);
  }
  return carts;
}

export default seedSampleCarts;

