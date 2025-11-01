import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addItem, updateItemQty, removeItem, clearCart as clearCartAction } from '@/store/slices/cartSlice';
import { buildCartItem, type ProductInput } from '@/lib/cartItem';

export const useCartActions = () => {
  const dispatch = useDispatch();

  const addToCart = useCallback(
    (product: ProductInput, quantity = 1) => {
      const cartItem = buildCartItem({ product, quantity });
      dispatch(addItem(cartItem));
      return cartItem;
    },
    [dispatch],
  );

  const updateCartQuantity = useCallback(
    ({ productId, shopId, variantId, qty }: { productId: string; shopId: string; qty: number; variantId?: string }) => {
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
