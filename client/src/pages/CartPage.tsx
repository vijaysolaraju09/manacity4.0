import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShoppingCart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import QuantityStepper from '@/components/ui/QuantityStepper/QuantityStepper';
import showToast from '@/components/ui/Toast';
import { formatINR } from '@/utils/currency';
import { paths } from '@/routes/paths';
import { selectCartItems, selectSubtotalPaise } from '@/store/slices/cartSlice';
import { useCartActions } from '@/hooks/useCartActions';

const CartPage = () => {
  const items = useSelector(selectCartItems);
  const subtotalPaise = useSelector(selectSubtotalPaise);
  const navigate = useNavigate();
  const { updateCartQuantity, removeFromCart, clearCart } = useCartActions();

  const totalItems = useMemo(() => items.reduce((total, item) => total + item.qty, 0), [items]);
  const subtotalLabel = useMemo(() => formatINR(subtotalPaise), [subtotalPaise]);

  const handleQuantityChange = (productId: string, shopId: string, nextQty: number, variantId?: string) => {
    updateCartQuantity({ productId, shopId, qty: nextQty, variantId });
  };

  const handleRemove = (productId: string, shopId: string, variantId?: string) => {
    removeFromCart({ productId, shopId, variantId });
    showToast('Removed from cart', 'info');
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      showToast('Add items to your cart before checking out', 'info');
      return;
    }
    navigate(paths.checkout());
  };

  const handleClear = () => {
    if (items.length === 0) return;
    clearCart();
    showToast('Cart cleared', 'info');
  };

  if (items.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <ShoppingCart className="h-16 w-16 text-slate-400" aria-hidden />
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Your cart is empty</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Discover fresh arrivals and add them to your cart to see them here.
          </p>
        </div>
        <Button onClick={() => navigate(paths.home())}>Start exploring</Button>
      </section>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Shopping cart</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {totalItems} item{totalItems === 1 ? '' : 's'} ready for checkout
          </p>
        </div>
        <Button variant="destructive" onClick={handleClear} className="w-full sm:w-auto">
          <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Clear cart
        </Button>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={[item.productId, item.shopId, item.variantId ?? ''].join('::')}
              className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex items-start gap-4">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-24 w-24 flex-shrink-0 rounded-md object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 dark:bg-slate-800">
                    <ShoppingCart className="h-10 w-10" aria-hidden />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {item.productId}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-base font-medium text-slate-900 dark:text-slate-100">
                      {formatINR(item.pricePaise)}
                    </span>
                    <QuantityStepper
                      value={item.qty}
                      min={1}
                      onChange={(value) => handleQuantityChange(item.productId, item.shopId, value, item.variantId)}
                      aria-label={`Update quantity for ${item.name}`}
                    />
                    <Button
                      variant="ghost"
                      onClick={() => handleRemove(item.productId, item.shopId, item.variantId)}
                      className="text-slate-500 hover:text-red-600"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Order summary</h2>
          <dl className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center justify-between">
              <dt>Subtotal</dt>
              <dd>{subtotalLabel}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Delivery</dt>
              <dd>Calculated at checkout</dd>
            </div>
          </dl>
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-base font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">
            <span>Total due</span>
            <span>{subtotalLabel}</span>
          </div>
          <Button className="w-full" onClick={handleCheckout}>
            Proceed to checkout
          </Button>
        </aside>
      </section>
    </main>
  );
};

export default CartPage;
