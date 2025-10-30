import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  addItem,
  updateItemQty,
  removeItem,
  clearCart as clearCartAction,
  type CartItem,
} from '@/store/slices/cartSlice';
import { buildCartItemPayload } from '@/lib/cart';

export type CartProductShape = Record<PropertyKey, unknown> | null | undefined;

export const useCartActions = () => {
  const dispatch = useDispatch();

  const addToCart = useCallback(
    (product: CartProductShape, quantity = 1, responseItem?: unknown): CartItem => {
      const payload = buildCartItemPayload({
        product: (product ?? {}) as Record<PropertyKey, unknown>,
        quantity,
        responseItem: responseItem as Record<PropertyKey, unknown> | undefined,
      });

      if (!payload) {
        throw new Error('Unable to add item to cart');
      }

      dispatch(addItem(payload));
      return payload;
    },
    [dispatch],
  );

  const updateCartQuantity = useCallback(
    ({ productId, shopId, variantId, qty }: {
      productId: string;
      shopId: string;
      qty: number;
      variantId?: string;
    }) => {
      dispatch(updateItemQty({ productId, shopId, variantId, qty }));
    },
    [dispatch],
  );

  const removeFromCart = useCallback(
    ({ productId, shopId, variantId }: { productId: string; shopId: string; variantId?: string }) => {
      dispatch(removeItem({ productId, shopId, variantId }));
    },
    [dispatch],
  );

  const clearCart = useCallback(() => {
    dispatch(clearCartAction());
  }, [dispatch]);

  return {
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
  };
};

export type UseCartActionsReturn = ReturnType<typeof useCartActions>;
