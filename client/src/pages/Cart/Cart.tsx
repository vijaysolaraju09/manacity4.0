import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, ShoppingCart, Trash2 } from 'lucide-react';

import CartSkeleton from '@/features/cart/components/CartSkeleton';
import CouponField from '@/features/cart/components/CouponField';
import EmptyCart from '@/features/cart/components/EmptyCart';
import FreeShippingBar from '@/features/cart/components/FreeShippingBar';
import type { CartDisplayItem } from '@/features/cart/types';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import ErrorCard from '@/components/ui/ErrorCard';
import { Button } from '@/components/ui/button';
import QuantityStepper from '@/components/ui/QuantityStepper/QuantityStepper';
import { formatINR } from '@/utils/currency';
import showToast from '@/components/ui/Toast';
import fallbackImage from '@/assets/no-image.svg';
import { paths } from '@/routes/paths';
import { cn } from '@/lib/utils';
import styles from '@/styles/PageShell.module.scss';
import cartStyles from './Cart.module.scss';
import { selectCartItems } from '@/store/slices/cartSlice';
import type { CartItem as StoreCartItem } from '@/store/slices/cartSlice';
import { useCartActions } from '@/hooks/useCartActions';

const FREE_SHIPPING_THRESHOLD_PAISE = 49900;

type LoadState = 'loading' | 'ready' | 'error';

type CartItemIdentifiers = {
  productId: string;
  shopId: string;
  variantId?: string;
};

type DisplayCartItem = CartDisplayItem & {
  key: string;
  identifiers: CartItemIdentifiers;
};

type ConfirmState =
  | {
      type: 'remove-single';
      itemKeys: string[];
      message: string;
    }
  | {
      type: 'remove-bulk';
      itemKeys: string[];
      message: string;
    }
  | null;

const normalizeVariantId = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const buildItemKey = ({ productId, shopId, variantId }: CartItemIdentifiers): string => {
  return [productId, shopId, normalizeVariantId(variantId) ?? ''].join('::');
};

const sectionMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
} as const;

const itemMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const Cart = () => {
  const navigate = useNavigate();
  const rawItems = useSelector(selectCartItems);
  const { updateCartQuantity, removeFromCart, clearCart: clearEntireCart } = useCartActions();

  const [status, setStatus] = useState<LoadState>('loading');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [couponCode, setCouponCode] = useState('');
  const [couponState, setCouponState] = useState<'idle' | 'loading' | 'applied' | 'error'>('idle');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  useEffect(() => {
    if (!Array.isArray(rawItems)) {
      setStatus('error');
      return;
    }
    setStatus('ready');
  }, [rawItems]);

  const items = useMemo<DisplayCartItem[]>(() => {
    if (!Array.isArray(rawItems)) return [];
    return rawItems.map((item) => {
      const qty = Number.isFinite(item.qty) && item.qty > 0 ? Math.floor(item.qty) : 1;
      const unitPrice = Number.isFinite(item.pricePaise) ? Math.max(0, Math.round(item.pricePaise)) : 0;
      const lineTotal = unitPrice * qty;
      const mrpInput = (item as { mrpPaise?: number }).mrpPaise;
      const mrpPaise = Number.isFinite(mrpInput) ? Math.max(unitPrice, Math.round(mrpInput as number)) : undefined;
      const variantId = normalizeVariantId(item.variantId ?? undefined);
      const identifiers: CartItemIdentifiers = {
        productId: item.productId,
        shopId: item.shopId,
        variantId,
      };

      return {
        productId: item.productId,
        shopId: item.shopId,
        name: item.name,
        image: item.image || fallbackImage,
        qty,
        unitPricePaise: unitPrice,
        lineTotalPaise: lineTotal,
        mrpPaise,
        brand: item.shopId ? `Shop ${item.shopId}` : undefined,
        availabilityLabel: 'In stock',
        deliveryMessage: 'Delivery by Tue, Oct 21 • Free above ₹499',
        shippingNote: 'Free above ₹499',
        variantId,
        key: buildItemKey(identifiers),
        identifiers,
      } satisfies DisplayCartItem;
    });
  }, [rawItems]);

  const displayLookup = useMemo(() => {
    const map = new Map<string, DisplayCartItem>();
    items.forEach((item) => {
      map.set(item.key, item);
    });
    return map;
  }, [items]);

  const itemLookup = useMemo(() => {
    const map = new Map<string, StoreCartItem>();
    if (!Array.isArray(rawItems)) return map;
    rawItems.forEach((item) => {
      const key = buildItemKey({
        productId: item.productId,
        shopId: item.shopId,
        variantId: normalizeVariantId(item.variantId ?? undefined),
      });
      map.set(key, item);
    });
    return map;
  }, [rawItems]);

  useEffect(() => {
    setSelectedKeys((prev) => {
      const next = new Set<string>();
      items.forEach((item) => {
        if (prev.size === 0 || prev.has(item.key)) {
          next.add(item.key);
        }
      });
      return next;
    });
  }, [items]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedKeys.has(item.key)),
    [items, selectedKeys],
  );

  const subtotalPaise = useMemo(
    () => selectedItems.reduce((total, item) => total + item.lineTotalPaise, 0),
    [selectedItems],
  );

  const totalPaise = subtotalPaise;
  const itemCount = selectedItems.reduce((total, item) => total + item.qty, 0);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeys(new Set(items.map((item) => item.key)));
    } else {
      setSelectedKeys(new Set());
    }
  };

  const handleSelectItem = (key: string, checked: boolean) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const handleQtyChange = useCallback(
    (item: DisplayCartItem, qty: number) => {
      const sanitizedQty = Number.isFinite(qty) ? Math.max(1, Math.floor(qty)) : 1;
      const key = item.key;
      const currentQty = itemLookup.get(key)?.qty;

      if (currentQty === sanitizedQty) {
        return;
      }

      updateCartQuantity({ ...item.identifiers, qty: sanitizedQty });
      showToast(`Updated ${item.name} to ${sanitizedQty}`, 'success');
    },
    [itemLookup, updateCartQuantity],
  );

  const handleRemove = (item: DisplayCartItem) => {
    setConfirmState({
      type: 'remove-single',
      itemKeys: [item.key],
      message: `Remove ${item.name} from your cart?`,
    });
  };

  const handleBulkRemove = () => {
    if (selectedKeys.size === 0) return;
    setConfirmState({
      type: 'remove-bulk',
      itemKeys: Array.from(selectedKeys),
      message: `Remove ${selectedKeys.size} selected item${selectedKeys.size === 1 ? '' : 's'}?`,
    });
  };

  const handleClear = () => {
    if (items.length === 0) return;
    setConfirmState({
      type: 'remove-bulk',
      itemKeys: items.map((item) => item.key),
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
    if (typeof paths.shops === 'function') {
      navigate(paths.shops());
      return;
    }
    if (typeof paths.home === 'function') {
      navigate(paths.home());
      return;
    }
    navigate('/shops');
  };

  const handleViewOrders = () => {
    if (typeof paths.orders?.mine === 'function') {
      navigate(paths.orders.mine());
      return;
    }
    navigate('/orders/mine');
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
    const keys = confirmState.itemKeys;
    if (keys.length === 0) {
      setConfirmState(null);
      return;
    }

    if (keys.length === items.length) {
      clearEntireCart();
      setSelectedKeys(new Set());
      showToast('Cart cleared', 'success');
    } else {
      keys.forEach((key) => {
        const item = displayLookup.get(key);
        if (item) {
          removeFromCart(item.identifiers);
        }
      });
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((id) => next.delete(id));
        return next;
      });
      showToast('Item removed', 'info');
    }
    setConfirmState(null);
  };

  const cartContainerClasses = cn(
    styles.pageShell,
    'bg-transparent text-slate-900 dark:text-slate-100',
  );

  if (status === 'loading') {
    return (
      <main className={cartContainerClasses} aria-busy="true">
        <div className={cn(styles.pageShell__inner, 'mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8')}>
          <CartSkeleton />
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className={cartContainerClasses}>
        <div className={cn(styles.pageShell__inner, 'mx-auto max-w-2xl px-4 py-16 sm:px-6')}>
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
        <div className={cn(styles.pageShell__inner, 'mx-auto max-w-6xl px-4 py-16 sm:px-6')}>
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

  const allSelected = selectedKeys.size === items.length && items.length > 0;
  return (
    <main className={cartContainerClasses}>
      <div className={cn(styles.pageShell__inner, 'mx-auto max-w-7xl px-4 pb-32 pt-12 sm:px-6 lg:px-8')}>
        <div className="flex flex-col gap-10">
          <motion.section
            initial={sectionMotion.initial}
            animate={sectionMotion.animate}
            transition={sectionMotion.transition}
            className="space-y-6"
          >
            <div className="flex flex-col gap-6 rounded-3xl border border-[var(--border)] bg-white/80 p-6 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <Button
                    variant="ghost"
                    className="h-11 w-11 rounded-full border border-[var(--border)] bg-white text-slate-900 shadow-sm hover:border-blue-600/40 hover:text-blue-600"
                    onClick={() => navigate(-1)}
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <div className="space-y-3">
                    <h1 className="text-3xl font-semibold tracking-tight">Shopping cart</h1>
                    <p className="text-sm text-slate-600">
                      {items.length} item{items.length === 1 ? '' : 's'} curated from neighbourhood shops.
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm font-semibold">
                      <button
                        type="button"
                        onClick={handleContinueShopping}
                        className="inline-flex items-center gap-2 text-blue-600 transition hover:text-blue-600/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                      >
                        Continue shopping
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <Button
                        type="button"
                        variant="outline"
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold"
                        onClick={handleViewOrders}
                      >
                        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                        View orders
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
                  Trusted checkout • Secure payments
                </div>
              </div>
              <div className={cn(cartStyles.bulkBar, 'flex-col gap-4 sm:flex-row sm:items-center')}>
                <label className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded-md border border-[var(--border)] text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    checked={allSelected}
                    onChange={(event) => handleSelectAll(event.target.checked)}
                    aria-label="Select all items"
                  />
                  <span>Select all</span>
                  <span className="rounded-full bg-blue-600/10 px-2 py-0.5 text-xs font-semibold text-blue-600">
                    {selectedItems.length} selected
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                  <span className="text-sm text-slate-600">
                    Subtotal:
                    <span className="ml-2 font-semibold text-slate-900">{formatINR(subtotalPaise)}</span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full px-4 py-2 text-xs font-semibold"
                    onClick={handleBulkSave}
                    disabled={selectedItems.length === 0}
                  >
                    Save for later
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full px-4 py-2 text-xs font-semibold text-destructive hover:text-destructive"
                    onClick={handleBulkRemove}
                    disabled={selectedItems.length === 0}
                  >
                    Remove selected
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full px-4 py-2 text-xs font-semibold"
                    onClick={handleClear}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Clear cart
                  </Button>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={sectionMotion.initial}
            animate={sectionMotion.animate}
            transition={{ ...sectionMotion.transition, delay: 0.05 }}
          >
            <div className={cn(cartStyles.layout, 'items-start')}>
              <section aria-labelledby="cart-items" className="space-y-6 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="cart-items" className="text-xl font-semibold">
                    Items in your cart
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">
                    {itemCount} item{itemCount === 1 ? '' : 's'}
                  </span>
                </div>
                <AnimatePresence initial={false} mode="popLayout">
                  {items.map((item) => {
                    const selected = selectedKeys.has(item.key);
                    const savingsPaise = item.mrpPaise ? Math.max(0, item.mrpPaise - item.unitPricePaise) : 0;

                    return (
                      <motion.li
                        key={item.key}
                        layout
                        variants={itemMotion}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={cn(cartStyles.itemCard, 'flex-col gap-4 sm:flex-row sm:items-start')}
                      >
                        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start">
                          <div className="flex items-start gap-3">
                            <label className="pt-1">
                              <input
                                type="checkbox"
                                className="h-5 w-5 rounded-md border border-[var(--border)] text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                checked={selected}
                                onChange={(event) => handleSelectItem(item.key, event.target.checked)}
                                aria-label={`Select ${item.name}`}
                              />
                            </label>
                            <img
                              src={item.image}
                              alt={item.name}
                              loading="lazy"
                              className={cn(cartStyles.itemImg, 'h-24 w-24 border border-[var(--border)] object-cover shadow-sm')}
                            />
                          </div>
                          <div className="flex flex-1 flex-col gap-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                {item.brand ? (
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                    {item.brand}
                                  </p>
                                ) : null}
                                <h3 className="text-base font-semibold leading-tight" title={item.name}>
                                  {item.name}
                                </h3>
                              </div>
                              <div className={cartStyles.priceCluster} aria-live="polite">
                                <span className="current">{formatINR(item.unitPricePaise)}</span>
                                {item.mrpPaise && item.mrpPaise > item.unitPricePaise ? (
                                  <span className="mrp">{formatINR(item.mrpPaise)}</span>
                                ) : null}
                                {savingsPaise > 0 ? (
                                  <span className="savings">You save {formatINR(savingsPaise)}</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 text-xs text-slate-600">
                              <span>{item.availabilityLabel ?? 'In stock'}</span>
                              {item.deliveryMessage ? <span>{item.deliveryMessage}</span> : null}
                              {item.shippingNote ? <span>{item.shippingNote}</span> : null}
                            </div>
                          </div>
                        </div>
                        <div className="w-full border-t border-t-[var(--border)] pt-4 sm:w-auto sm:border-none sm:pt-0">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2" role="group" aria-label={`Update quantity for ${item.name}`}>
                                <span className="text-xs font-semibold uppercase text-slate-600">Qty</span>
                                <QuantityStepper
                                  value={item.qty}
                                  min={1}
                                  onChange={(value) => handleQtyChange(item, value)}
                                  ariaLabel={`Quantity for ${item.name}`}
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                                <button
                                  type="button"
                                  onClick={() => handleSaveForLater(item.name)}
                                  className="rounded-full px-3 py-1 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                                >
                                  Save for later
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemove(item)}
                                  className="rounded-full px-3 py-1 text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-slate-600">Line total</span>
                              <span className="text-lg font-semibold">{formatINR(item.lineTotalPaise)}</span>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </section>

              <aside className={cn(cartStyles.summary, 'space-y-6')} aria-labelledby="cart-summary">
                <div className="space-y-1">
                  <h2 id="cart-summary" className="text-lg font-semibold">
                    Price details
                  </h2>
                  <p className="text-sm text-slate-600">
                    {selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} selected
                  </p>
                </div>

                <CouponField
                  value={couponCode}
                  onApply={handleApplyCoupon}
                  onRemove={handleRemoveCoupon}
                  state={couponState}
                  error={couponError}
                />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Item total</span>
                    <span className="font-semibold text-slate-900">{formatINR(subtotalPaise)}</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-600">
                    <span>Discounts</span>
                    <span>-{formatINR(0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Grand total</span>
                  <span>{formatINR(totalPaise)}</span>
                </div>

                <FreeShippingBar
                  subtotalPaise={subtotalPaise}
                  thresholdPaise={FREE_SHIPPING_THRESHOLD_PAISE}
                />

                <Button
                  type="button"
                  className="w-full rounded-full py-3 text-base font-semibold"
                  onClick={handleCheckout}
                  disabled={selectedItems.length === 0}
                >
                  Proceed to checkout
                </Button>
                <p className="text-center text-xs text-slate-600">Secure checkout powered by Manacity Pay</p>
              </aside>
            </div>
          </motion.section>
        </div>
      </div>

      <div className={cn(cartStyles.bottomSheet, 'lg:hidden')} role="region" aria-label="Cart summary">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Total</span>
          <span className="text-lg font-semibold">{formatINR(totalPaise)}</span>
          <span className="text-xs text-slate-600">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
        </div>
        <Button
          type="button"
          className="rounded-full px-6 py-2 text-sm font-semibold"
          onClick={handleCheckout}
          disabled={selectedItems.length === 0}
        >
          Checkout
        </Button>
      </div>

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
