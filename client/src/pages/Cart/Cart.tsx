import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Info,
  Package,
  ShoppingBag,
  Trash2,
} from 'lucide-react';

import Shimmer from '@/components/Shimmer';
import EmptyState from '@/components/ui/EmptyState';
import ErrorCard from '@/components/ui/ErrorCard';
import QuantityStepper from '@/components/ui/QuantityStepper/QuantityStepper';
import SkeletonList from '@/components/ui/SkeletonList';
import { Button } from '@/components/ui/button';
import showToast from '@/components/ui/Toast';
import fallbackImage from '@/assets/no-image.svg';
import {
  clearCart,
  removeItem,
  selectCartItems,
  updateQty,
} from '@/store/slices/cartSlice';
import { paths } from '@/routes/paths';
import { formatINR } from '@/utils/currency';

type LoadState = 'loading' | 'ready' | 'error';

type DisplayCartItem = {
  productId: string;
  shopId: string;
  name: string;
  image: string;
  qty: number;
  unitPricePaise: number;
  unitPriceDisplay: string;
  lineTotalPaise: number;
  lineTotalDisplay: string;
};

type ShopGroup = {
  shopId: string;
  label: string;
  items: DisplayCartItem[];
  itemCount: number;
  subtotalPaise: number;
  subtotalDisplay: string;
};

const pageBackgroundStyle: CSSProperties = {
  background:
    'radial-gradient(120% 120% at 0% 0%, rgba(26,115,232,0.12), transparent 55%), radial-gradient(120% 120% at 100% 0%, rgba(26,115,232,0.08), transparent 60%), var(--color-bg)',
};

const headerCardStyle: CSSProperties = {
  background:
    'linear-gradient(135deg, rgba(26,115,232,0.16), rgba(255,255,255,0.96))',
  border: '1px solid rgba(26,115,232,0.2)',
  boxShadow: 'var(--shadow-lg)',
  color: 'var(--color-text)',
};

const surfacePanelStyle: CSSProperties = {
  background:
    'linear-gradient(140deg, rgba(26,115,232,0.12), rgba(255,255,255,0.96))',
  border: '1px solid rgba(26,115,232,0.18)',
  boxShadow: 'var(--shadow-md)',
  color: 'var(--color-text)',
};

const itemCardStyle: CSSProperties = {
  background:
    'linear-gradient(135deg, rgba(26,115,232,0.1), rgba(26,115,232,0.04) 55%, var(--color-surface))',
  border: '1px solid rgba(26,115,232,0.18)',
  boxShadow: 'var(--shadow-sm)',
};

const infoBannerStyle: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(26,115,232,0.12), rgba(26,115,232,0.04))',
  border: '1px solid rgba(26,115,232,0.25)',
  color: 'var(--color-text)',
  boxShadow: 'var(--shadow-sm)',
};

const skeletonCardClass =
  'rounded-2xl border border-[rgba(26,115,232,0.18)] bg-[rgba(255,255,255,0.75)] p-6 shadow-sm backdrop-blur-sm dark:border-[rgba(26,115,232,0.3)] dark:bg-[rgba(15,23,42,0.65)]';

const CartSkeleton = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6">
    <div className={`${skeletonCardClass} flex flex-col gap-4`} aria-hidden="true">
      <div className="h-8 w-40 rounded-full bg-[rgba(26,115,232,0.16)] animate-pulse dark:bg-[rgba(37,99,235,0.35)]" />
      <div className="h-4 w-24 rounded-full bg-[rgba(26,115,232,0.14)] animate-pulse dark:bg-[rgba(37,99,235,0.3)]" />
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className={`${skeletonCardClass} space-y-6`}>
        <div className="h-5 w-28 rounded-full bg-[rgba(26,115,232,0.14)] animate-pulse dark:bg-[rgba(37,99,235,0.3)]" />
        <div className="space-y-4">
          <SkeletonList count={3} lines={2} withAvatar />
        </div>
      </div>
      <div className={`${skeletonCardClass} space-y-4`}>
        <div className="h-5 w-32 rounded-full bg-[rgba(26,115,232,0.14)] animate-pulse dark:bg-[rgba(37,99,235,0.3)]" />
        <div className="space-y-3">
          <Shimmer className="h-4 w-full rounded-full" />
          <Shimmer className="h-4 w-4/5 rounded-full" />
          <Shimmer className="h-4 w-3/5 rounded-full" />
          <Shimmer className="h-10 w-full rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

const itemMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const groupMotion = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
};

const Cart = () => {
  const rawItems = useSelector(selectCartItems);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [status, setStatus] = useState<LoadState>(() =>
    Array.isArray(rawItems) ? 'loading' : 'error',
  );
  const [loadError, setLoadError] = useState<string | null>(() =>
    Array.isArray(rawItems) ? null : 'Unable to load your cart right now.',
  );
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!Array.isArray(rawItems)) {
      setLoadError('Unable to load your cart right now.');
      setStatus('error');
      return;
    }

    setLoadError(null);
    setStatus('ready');
  }, [rawItems]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  const items: DisplayCartItem[] = useMemo(() => {
    if (!Array.isArray(rawItems)) {
      return [];
    }

    return rawItems.map((item) => {
      const qty = Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 1;
      const unitPricePaise = Number.isFinite(item.pricePaise)
        ? Math.max(0, item.pricePaise)
        : 0;
      const lineTotalPaise = unitPricePaise * qty;

      return {
        productId: item.productId,
        shopId: item.shopId,
        name: item.name,
        image: item.image || fallbackImage,
        qty,
        unitPricePaise,
        unitPriceDisplay: formatINR(unitPricePaise),
        lineTotalPaise,
        lineTotalDisplay: formatINR(lineTotalPaise),
      } satisfies DisplayCartItem;
    });
  }, [rawItems]);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.qty, 0),
    [items],
  );

  const shopGroups = useMemo<ShopGroup[]>(() => {
    if (items.length === 0) {
      return [];
    }

    const groups = new Map<string, ShopGroup>();

    items.forEach((item) => {
      const existing = groups.get(item.shopId);
      if (!existing) {
        const label = item.shopId ? `Shop ${item.shopId}` : 'Shop';
        groups.set(item.shopId, {
          shopId: item.shopId,
          label,
          items: [item],
          itemCount: item.qty,
          subtotalPaise: item.lineTotalPaise,
          subtotalDisplay: formatINR(item.lineTotalPaise),
        });
        return;
      }

      existing.items.push(item);
      existing.itemCount += item.qty;
      existing.subtotalPaise += item.lineTotalPaise;
      existing.subtotalDisplay = formatINR(existing.subtotalPaise);
    });

    return Array.from(groups.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [items]);

  const hasMultipleShops = shopGroups.length > 1;

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedShopId((current) => {
      if (shopGroups.length === 0) {
        return null;
      }

      if (shopGroups.length === 1) {
        return shopGroups[0]?.shopId ?? null;
      }

      if (current && shopGroups.some((group) => group.shopId === current)) {
        return current;
      }

      return shopGroups[0]?.shopId ?? null;
    });
  }, [shopGroups]);

  const selectedGroup = useMemo(
    () =>
      selectedShopId
        ? shopGroups.find((group) => group.shopId === selectedShopId) ?? null
        : null,
    [selectedShopId, shopGroups],
  );

  const selectedSubtotalPaise = selectedGroup?.subtotalPaise ?? 0;
  const selectedSubtotalDisplay = formatINR(selectedSubtotalPaise);
  const selectedItemCount = selectedGroup?.itemCount ?? 0;

  const handleQtyChange = useCallback(
    (productId: string, name: string, qty: number) => {
      dispatch(updateQty({ productId, qty }));
      showToast(`Updated ${name} to ${qty}`, 'info');
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    (productId: string, name: string) => {
      dispatch(removeItem(productId));
      showToast(`Removed ${name} from cart`, 'info');
    },
    [dispatch],
  );

  const handleClear = useCallback(() => {
    if (items.length === 0) return;
    dispatch(clearCart());
    showToast('Cart cleared', 'info');
  }, [dispatch, items.length]);

  const continueShoppingPath = useMemo(() => {
    if (typeof paths.products?.list === 'function') {
      return paths.products.list();
    }

    return paths.shops();
  }, []);

  const checkoutPath = useMemo(() => {
    if (typeof paths.checkout === 'function') {
      return paths.checkout();
    }

    return paths.cart();
  }, []);

  const handleContinueShopping = useCallback(() => {
    navigate(continueShoppingPath);
  }, [continueShoppingPath, navigate]);

  const handleCheckout = useCallback(() => {
    if (!selectedGroup || selectedGroup.items.length === 0) return;
    showToast('Opening checkout…', 'success');
    navigate(checkoutPath, {
      state: { shopId: selectedGroup.shopId },
    });
  }, [checkoutPath, navigate, selectedGroup]);

  const handleRetry = useCallback(() => {
    setStatus('loading');
    setLoadError(null);

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      if (!Array.isArray(rawItems)) {
        setLoadError('Unable to load your cart right now.');
        setStatus('error');
        return;
      }

      setStatus('ready');
      retryTimeoutRef.current = null;
    }, 350);
  }, [rawItems]);

  if (status === 'loading') {
    return (
      <main className="min-h-screen pb-16 pt-10" aria-busy="true" style={pageBackgroundStyle}>
        <CartSkeleton />
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="min-h-screen pb-16 pt-10" role="main" style={pageBackgroundStyle}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <ErrorCard
            title="We couldn’t load your cart"
            message={loadError ?? 'Please try again in a moment.'}
            onRetry={handleRetry}
          />
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen pb-16 pt-10" role="main" style={pageBackgroundStyle}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <EmptyState
            title="Your cart is empty"
            message="Looks like you haven’t added anything yet. Let’s fix that!"
            ctaLabel="Continue shopping"
            onCtaClick={handleContinueShopping}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16 pt-10" role="main" style={pageBackgroundStyle}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <header
          className="flex flex-col gap-4 rounded-3xl p-6 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          style={headerCardStyle}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-[var(--color-text)]">Shopping cart</h1>
              <p className="text-sm text-[var(--color-muted)]" aria-live="polite">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="self-start rounded-full border border-[rgba(26,115,232,0.24)] bg-white/40 px-4 text-sm text-[rgba(26,115,232,0.9)] shadow-sm transition hover:border-[rgba(26,115,232,0.4)] hover:bg-[rgba(26,115,232,0.12)] hover:text-[rgba(26,115,232,1)] focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Clear cart
            </Button>
          </div>
          <p className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <Info className="h-4 w-4" aria-hidden="true" />
            Prices are shown in INR and include applicable taxes.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section
            className="space-y-6"
            aria-labelledby="cart-items-heading"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="cart-items-heading" className="text-lg font-semibold text-[var(--color-text)]">
                Items
              </h2>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border border-[rgba(26,115,232,0.24)] px-4 text-sm text-[rgba(26,115,232,0.9)] transition hover:border-[rgba(26,115,232,0.4)] hover:bg-[rgba(26,115,232,0.12)] hover:text-[rgba(26,115,232,1)]"
                onClick={handleContinueShopping}
              >
                Continue shopping
              </Button>
            </div>

            {hasMultipleShops && (
              <div className="flex items-start gap-3 rounded-3xl p-4 text-sm backdrop-blur-sm" style={infoBannerStyle}>
                <Building2 className="mt-0.5 h-5 w-5 text-[rgba(26,115,232,0.85)]" aria-hidden="true" />
                <p className="text-[var(--color-text)]">
                  <strong className="font-semibold text-[rgba(26,115,232,0.95)]">Heads up:</strong> Your cart has items from
                  multiple shops. Select one to checkout now.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {shopGroups.map((group) => {
                const summaryId = `shop-${group.shopId}-summary`;
                const isSelected = selectedShopId === group.shopId;

                return (
                  <motion.section
                    key={group.shopId}
                    className="space-y-4 rounded-3xl p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                    style={surfacePanelStyle}
                    initial={groupMotion.initial}
                    animate={groupMotion.animate}
                  >
                    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-[var(--color-text)]">
                      <div className="flex items-center gap-3">
                        {hasMultipleShops ? (
                          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text)]">
                            <input
                              type="radio"
                              name="selected-shop"
                              value={group.shopId}
                              checked={isSelected}
                              onChange={() => setSelectedShopId(group.shopId)}
                              aria-describedby={summaryId}
                              className="h-4 w-4 rounded-full border-[rgba(26,115,232,0.35)] text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-semibold">{group.label}</span>
                          </label>
                        ) : (
                          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                            <ShoppingBag className="h-4 w-4 text-[rgba(26,115,232,0.85)]" aria-hidden="true" />
                            {group.label}
                          </span>
                        )}
                      </div>
                      <span
                        id={summaryId}
                        className="text-sm text-[var(--color-muted)]"
                      >
                        {group.itemCount} {group.itemCount === 1 ? 'item' : 'items'} · {group.subtotalDisplay}
                      </span>
                    </header>

                    {hasMultipleShops && (
                      <p className="text-xs uppercase tracking-wide text-[rgba(26,115,232,0.8)]">
                        {isSelected ? 'Selected for checkout' : 'Select to include in checkout'}
                      </p>
                    )}

                    <AnimatePresence initial={false}>
                      {group.items.map((item) => (
                        <motion.article
                          key={item.productId}
                          className="group/item flex flex-col gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-[rgba(26,115,232,0.25)] hover:shadow-lg"
                          style={itemCardStyle}
                          initial={itemMotion.initial}
                          animate={itemMotion.animate}
                          exit={itemMotion.exit}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex flex-1 items-start gap-4">
                              <img
                                src={item.image}
                                alt={item.name}
                                loading="lazy"
                                className="h-20 w-20 shrink-0 rounded-xl border border-[rgba(26,115,232,0.2)] object-cover shadow-sm"
                              />
                              <div className="flex flex-1 flex-col gap-1">
                                <p className="text-sm font-semibold text-[var(--color-text)]" title={item.name}>
                                  {item.name}
                                </p>
                                <p className="text-xs text-[var(--color-muted)]">Unit price</p>
                                <p className="font-medium text-[var(--color-text)] opacity-80">
                                  {item.unitPriceDisplay}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-start gap-3 sm:items-end">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-medium uppercase tracking-wide text-[rgba(26,115,232,0.8)]">
                                  Qty
                                </span>
                                <QuantityStepper
                                  value={item.qty}
                                  onChange={(qty) => handleQtyChange(item.productId, item.name, qty)}
                                  ariaLabel={`Change quantity for ${item.name}`}
                                  className="rounded-full bg-[rgba(26,115,232,0.12)] px-2 py-1 text-[var(--color-text)] shadow-inner"
                                />
                              </div>
                              <p className="text-right text-lg font-semibold text-[var(--color-text)]" aria-live="polite">
                                {item.lineTotalDisplay}
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleRemove(item.productId, item.name)}
                                className="rounded-full border border-[rgba(26,115,232,0.24)] px-3 text-sm text-[rgba(26,115,232,0.9)] transition hover:border-[rgba(26,115,232,0.45)] hover:bg-[rgba(26,115,232,0.12)] focus-visible:ring-2 focus-visible:ring-offset-2"
                              >
                                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        </motion.article>
                      ))}
                    </AnimatePresence>
                  </motion.section>
                );
              })}
            </div>
          </section>

          <aside
            className="space-y-5 rounded-3xl p-6 shadow-lg"
            style={surfacePanelStyle}
            aria-labelledby="cart-summary"
          >
            <div className="flex items-center gap-3 text-[var(--color-text)]">
              <Package className="h-5 w-5 text-[rgba(26,115,232,0.85)]" aria-hidden="true" />
              <h2 id="cart-summary" className="text-lg font-semibold">
                Order summary
              </h2>
            </div>

            {hasMultipleShops && (
              <div
                className="rounded-2xl p-4 text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(26,115,232,0.1), rgba(26,115,232,0.03))',
                  border: '1px solid rgba(26,115,232,0.2)',
                  color: 'var(--color-text)',
                }}
              >
                <p className="text-xs uppercase tracking-wide text-[rgba(26,115,232,0.8)]">Checkout selection</p>
                <p className="font-medium">
                  {selectedGroup ? selectedGroup.label : 'Select a shop'}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  Only one shop can be checked out at a time.
                </p>
              </div>
            )}

            <dl className="space-y-3 text-sm text-[var(--color-muted)]">
              <div className="flex items-center justify-between">
                <dt>Subtotal</dt>
                <dd className="font-semibold text-[var(--color-text)]" aria-live="polite">
                  {selectedSubtotalDisplay}
                </dd>
              </div>
              <div className="flex items-center justify-between text-[var(--color-muted)] opacity-75">
                <dt>Estimated tax</dt>
                <dd>Calculated at checkout</dd>
              </div>
              <div className="flex items-center justify-between text-[var(--color-muted)] opacity-75">
                <dt>Estimated shipping</dt>
                <dd>Calculated at checkout</dd>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-[var(--color-text)]">
                <dt>Grand total</dt>
                <dd aria-live="polite">{selectedSubtotalDisplay}</dd>
              </div>
            </dl>

            <p className="text-xs text-[var(--color-muted)]">
              Tax and shipping will be finalised during checkout.
            </p>

            <Button
              type="button"
              className="w-full rounded-full text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              onClick={handleCheckout}
              disabled={!selectedGroup || selectedGroup.items.length === 0}
            >
              Proceed to checkout
            </Button>

            {hasMultipleShops && (
              <p className="text-xs text-[var(--color-muted)]">
                {selectedGroup
                  ? `${selectedItemCount} ${
                      selectedItemCount === 1 ? 'item' : 'items'
                    } will be included in this checkout.`
                  : 'Select a shop to enable checkout.'}
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Cart;
