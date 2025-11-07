import { useMemo, useState, type FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import showToast from '@/components/ui/Toast';
import fallbackImage from '@/assets/no-image.svg';
import {
  selectCartItems,
  selectSubtotalPaise,
  updateItemQty,
  removeItem,
  clearCart,
} from '@/store/slices/cartSlice';
import { formatINR } from '@/utils/currency';
import type { AppDispatch } from '@/store';
import { checkoutCart } from '@/store/orders';
import { fetchNotifs } from '@/store/notifs';

const Cart: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const cartItems = useSelector(selectCartItems);
  const subtotalPaise = useSelector(selectSubtotalPaise);
  const [shippingAddress, setShippingAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasItems = cartItems.length > 0;
  const formattedSubtotal = formatINR(subtotalPaise);

  const checkoutPayload = useMemo(
    () =>
      cartItems.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        shopId: item.shopId,
        variantId: item.variantId,
      })),
    [cartItems],
  );

  const handleIncrement = (productId: string, shopId: string, currentQty: number, variantId?: string) => {
    const nextQty = currentQty + 1;
    dispatch(updateItemQty({ productId, shopId, variantId, qty: nextQty }));
  };

  const handleDecrement = (productId: string, shopId: string, currentQty: number, variantId?: string) => {
    const nextQty = currentQty - 1;
    dispatch(updateItemQty({ productId, shopId, variantId, qty: nextQty }));
  };

  const handleRemove = (productId: string, shopId: string, variantId?: string) => {
    dispatch(removeItem({ productId, shopId, variantId }));
  };

  const handleCheckout = async () => {
    if (!hasItems || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const shipping = shippingAddress.trim()
        ? {
            address1: shippingAddress.trim(),
          }
        : undefined;

      await dispatch(
        checkoutCart({
          items: checkoutPayload,
          shippingAddress: shipping,
        }),
      ).unwrap();

      dispatch(clearCart());
      showToast('Checkout successful! Your order has been placed.', 'success');
      void dispatch(fetchNotifs({ page: 1 }));
      navigate('/orders');
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'We were unable to process your checkout. Please try again.';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Cart</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Review the products and services you intend to purchase before checking out.
        </p>
      </header>

      <section className="flex flex-col gap-6 rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm">
        {!hasItems ? (
          <p className="text-sm text-slate-500">Your cart is empty. Add items to proceed to checkout.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {cartItems.map((item) => {
              const lineTotalPaise = item.pricePaise * item.qty;
              return (
                <article
                  key={`${item.productId}-${item.shopId}-${item.variantId ?? 'default'}`}
                  id={`cart-item-${item.productId}-${item.variantId ?? 'default'}`}
                  className="flex flex-col gap-4 rounded-xl border border-slate-200/60 bg-white/70 p-4 shadow-sm"
                >
                  <div className="flex gap-4">
                    <img
                      src={item.image || fallbackImage}
                      alt={item.name}
                      className="h-20 w-20 shrink-0 rounded-lg border border-slate-200 object-cover"
                      loading="lazy"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h2 className="text-base font-semibold text-slate-900">{item.name}</h2>
                          {item.variantId ? (
                            <p className="text-xs text-slate-500">Variant: {item.variantId}</p>
                          ) : null}
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{formatINR(item.pricePaise)}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                            onClick={() => handleDecrement(item.productId, item.shopId, item.qty, item.variantId)}
                            aria-label={`Decrease quantity for ${item.name}`}
                          >
                            −
                          </button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold text-slate-700">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-lg font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                            onClick={() => handleIncrement(item.productId, item.shopId, item.qty, item.variantId)}
                            aria-label={`Increase quantity for ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-slate-800">
                            {formatINR(lineTotalPaise)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemove(item.productId, item.shopId, item.variantId)}
                            className="text-sm font-medium text-rose-600 transition hover:text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Delivery address</h2>
          <p className="mt-1 text-sm text-slate-500">
            Provide a shipping address or special instructions for the order.
          </p>
        </div>
        <Textarea
          value={shippingAddress}
          onChange={(event) => setShippingAddress(event.target.value)}
          placeholder="Apartment 4B, MG Road, Bengaluru"
          className="min-h-[120px] resize-none"
        />
      </section>

      <footer className="sticky bottom-0 left-0 right-0 z-10 mx-auto flex w-full max-w-4xl flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-slate-500">Subtotal</span>
          <span className="text-xl font-semibold text-slate-900">{formattedSubtotal}</span>
        </div>
        <Button
          type="button"
          onClick={handleCheckout}
          disabled={!hasItems || isSubmitting}
          className="h-12 rounded-xl text-base font-semibold"
        >
          {isSubmitting ? 'Processing…' : 'Proceed to Checkout'}
        </Button>
      </footer>
    </main>
  );
};

export default Cart;
