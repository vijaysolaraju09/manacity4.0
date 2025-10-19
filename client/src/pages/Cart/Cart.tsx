import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  MinusCircle,
  PlusCircle,
  Shield,
  ShoppingCart,
  Trash2,
} from 'lucide-react';

import CartItemCard from '@/features/cart/components/CartItemCard';
import CartMobileSummary from '@/features/cart/components/CartMobileSummary';
import CartSkeleton from '@/features/cart/components/CartSkeleton';
import CartSummaryCard from '@/features/cart/components/CartSummaryCard';
import EmptyCart from '@/features/cart/components/EmptyCart';
import type { CartDisplayItem } from '@/features/cart/types';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import ErrorCard from '@/components/ui/ErrorCard';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/utils/currency';
import showToast from '@/components/ui/Toast';
import fallbackImage from '@/assets/no-image.svg';
import { paths } from '@/routes/paths';
import {
  clearCart,
  removeItem,
  selectCartItems,
  updateQty,
} from '@/store/slices/cartSlice';

const FREE_SHIPPING_THRESHOLD_PAISE = 49900;

type LoadState = 'loading' | 'ready' | 'error';

type ConfirmState =
  | {
      type: 'remove-single';
      productIds: string[];
      message: string;
    }
  | {
      type: 'remove-bulk';
      productIds: string[];
      message: string;
    }
  | null;

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const rawItems = useSelector(selectCartItems);

  const [status, setStatus] = useState<LoadState>('loading');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [couponCode, setCouponCode] = useState('');
  const [couponState, setCouponState] = useState<'idle' | 'loading' | 'applied' | 'error'>('idle');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  useEffect(() => {
    if (!Array.isArray(rawItems)) {
      setStatus('error');
      return;
    }
    setStatus('ready');
  }, [rawItems]);

  const items: CartDisplayItem[] = useMemo(() => {
    if (!Array.isArray(rawItems)) return [];
    return rawItems.map((item) => {
      const qty = Number.isFinite(item.qty) && item.qty > 0 ? Math.floor(item.qty) : 1;
      const unitPrice = Number.isFinite(item.pricePaise) ? Math.max(0, Math.round(item.pricePaise)) : 0;
      const lineTotal = unitPrice * qty;

      return {
        productId: item.productId,
        shopId: item.shopId,
        name: item.name,
        image: item.image || fallbackImage,
        qty,
        unitPricePaise: unitPrice,
        lineTotalPaise: lineTotal,
        brand: item.shopId ? `Shop ${item.shopId}` : undefined,
        availabilityLabel: 'In stock',
        deliveryMessage: 'Delivery by Tue, Oct 21 • Free above ₹499',
        shippingNote: 'Free above ₹499',
      } satisfies CartDisplayItem;
    });
  }, [rawItems]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<string>();
      items.forEach((item) => {
        if (prev.size === 0 || prev.has(item.productId)) {
          next.add(item.productId);
        }
      });
      return next;
    });
  }, [items]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.productId)),
    [items, selectedIds],
  );

  const subtotalPaise = useMemo(
    () => selectedItems.reduce((total, item) => total + item.lineTotalPaise, 0),
    [selectedItems],
  );

  const totalPaise = subtotalPaise;
  const itemCount = selectedItems.reduce((total, item) => total + item.qty, 0);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map((item) => item.productId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (productId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  };

  const handleQtyChange = (productId: string, qty: number, name: string) => {
    dispatch(updateQty({ productId, qty }));
    showToast(`Updated ${name} to ${qty}`, 'success');
  };

  const handleRemove = (productId: string, name: string) => {
    setConfirmState({
      type: 'remove-single',
      productIds: [productId],
      message: `Remove ${name} from your cart?`,
    });
  };

  const handleBulkRemove = () => {
    if (selectedIds.size === 0) return;
    setConfirmState({
      type: 'remove-bulk',
      productIds: Array.from(selectedIds),
      message: `Remove ${selectedIds.size} selected item${selectedIds.size === 1 ? '' : 's'}?`,
    });
  };

  const handleClear = () => {
    if (items.length === 0) return;
    setConfirmState({
      type: 'remove-bulk',
      productIds: items.map((item) => item.productId),
      message: 'Clear all items from your cart?',
    });
  };

  const handleSaveForLater = (name: string) => {
    showToast(`${name} saved for later • Coming soon`, 'info');
  };

  const handleBulkSave = () => {
    if (selectedItems.length === 0) return;
    showToast('Saved selected items for later • Coming soon', 'info');
  };

  const handleContinueShopping = () => {
    if (typeof paths.products?.list === 'function') {
      navigate(paths.products.list());
      return;
    }
    navigate(paths.home?.() ?? '/');
  };

  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      showToast('Select items to checkout', 'info');
      return;
    }
    navigate(paths.checkout?.() ?? paths.cart());
  };

  const handleApplyCoupon = async (code: string) => {
    setCouponState('loading');
    setCouponError(null);
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (code.length < 4) {
      const message = 'Coupon codes must be at least 4 characters.';
      setCouponState('error');
      setCouponError(message);
      throw new Error(message);
    }
    setCouponCode(code.toUpperCase());
    setCouponState('applied');
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponState('idle');
    setCouponError(null);
  };

  const executeRemoval = () => {
    if (!confirmState) return;
    if (confirmState.productIds.length === items.length) {
      dispatch(clearCart());
      setSelectedIds(new Set());
      showToast('Cart cleared', 'success');
    } else {
      confirmState.productIds.forEach((productId) => dispatch(removeItem(productId)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        confirmState.productIds.forEach((id) => next.delete(id));
        return next;
      });
      showToast('Item removed', 'info');
    }
    setConfirmState(null);
  };

  const cartContainerClasses = 'min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900';

  if (status === 'loading') {
    return (
      <main className={cartContainerClasses} aria-busy="true">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <CartSkeleton />
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className={cartContainerClasses}>
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <ErrorCard
            title="We couldn't load your cart"
            message="Please refresh to try again."
            onRetry={() => window.location.reload()}
          />
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className={cartContainerClasses}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-col items-start gap-6 pb-10">
            <Button variant="ghost" className="inline-flex items-center gap-2 px-0 text-slate-600 dark:text-slate-300" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>
          </div>
          <EmptyCart onContinue={handleContinueShopping} />
        </div>
      </main>
    );
  }

  const allSelected = selectedIds.size === items.length && items.length > 0;

  return (
    <main className={cartContainerClasses}>
      <div className="mx-auto max-w-7xl px-4 pb-32 pt-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  className="h-10 w-10 rounded-full border border-slate-200/60 bg-white/80 text-slate-600 shadow-sm hover:border-blue-200 hover:text-blue-600 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-300"
                  onClick={() => navigate(-1)}
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">Shopping cart</h1>
                  <p className="text-sm text-slate-500 dark:text-slate-300">
                    {items.length} item{items.length === 1 ? '' : 's'} curated from neighbourhood shops
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                <Shield className="h-4 w-4" aria-hidden="true" />
                Secure checkout • Trusted shops
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded-full border border-slate-300 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700"
                  checked={allSelected}
                  onChange={(event) => handleSelectAll(event.target.checked)}
                  aria-label="Select all items"
                />
                Select all
              </label>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span aria-live="polite">{selectedItems.length} selected</span>
                <span className="hidden h-4 w-px bg-slate-200 sm:inline-block dark:bg-slate-700" />
                <span className="font-semibold text-slate-900 dark:text-white">{formatINR(subtotalPaise)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={handleBulkSave}
                  disabled={selectedItems.length === 0}
                >
                  <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                  Save for later
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-500/20"
                  onClick={handleBulkRemove}
                  disabled={selectedItems.length === 0}
                >
                  <MinusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                  Remove selected
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={handleClear}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Clear cart
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <section aria-labelledby="cart-items" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 id="cart-items" className="text-xl font-semibold text-slate-900 dark:text-white">
                  Items in your cart
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                  onClick={handleContinueShopping}
                >
                  Continue shopping
                </Button>
              </div>
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <CartItemCard
                    key={item.productId}
                    item={item}
                    selected={selectedIds.has(item.productId)}
                    onSelectChange={(checked) => handleSelectItem(item.productId, checked)}
                    onQtyChange={(qty) => handleQtyChange(item.productId, qty, item.name)}
                    onRemove={() => handleRemove(item.productId, item.name)}
                    onSaveForLater={() => handleSaveForLater(item.name)}
                  />
                ))}
              </AnimatePresence>
            </section>
            <aside className="space-y-4">
              <CartSummaryCard
                subtotalPaise={subtotalPaise}
                discountPaise={0}
                shippingPaise={0}
                onCheckout={handleCheckout}
                disabled={selectedItems.length === 0}
                couponCode={couponCode}
                onApplyCoupon={handleApplyCoupon}
                onRemoveCoupon={handleRemoveCoupon}
                couponState={couponState}
                couponError={couponError}
                itemCount={itemCount}
                freeShippingThresholdPaise={FREE_SHIPPING_THRESHOLD_PAISE}
              />
              <div className="hidden rounded-3xl border border-slate-200/80 bg-white/80 p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70 dark:text-slate-300 lg:flex lg:flex-col lg:gap-3">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  We partner with trusted neighbourhood shops for genuine products.
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                  Checkout once, receive consolidated delivery updates.
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <CartMobileSummary
        totalPaise={totalPaise}
        itemCount={itemCount}
        onCheckout={handleCheckout}
        disabled={selectedItems.length === 0}
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        summaryContent={
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-200">
            <div className="flex items-center justify-between text-base font-semibold text-slate-900 dark:text-white">
              <span>Grand total</span>
              <span>{formatINR(totalPaise)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Items</span>
              <span>{itemCount}</span>
            </div>
            <Button
              type="button"
              className="w-full rounded-full py-3 text-sm font-semibold"
              onClick={() => {
                setSummaryOpen(false);
                handleCheckout();
              }}
              disabled={selectedItems.length === 0}
            >
              Proceed to checkout
            </Button>
          </div>
        }
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title="Confirm removal"
        description={confirmState?.message}
        confirmLabel="Remove"
        cancelLabel="Keep"
        destructive
        onConfirm={executeRemoval}
        onCancel={() => setConfirmState(null)}
      />
    </main>
  );
};

export default Cart;
