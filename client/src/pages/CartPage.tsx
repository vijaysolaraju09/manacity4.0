import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, ShoppingCart, Trash2 } from 'lucide-react';

import { http } from '@/lib/http';
import { toErrorMessage } from '@/lib/response';
import { formatINR } from '@/utils/currency';
import showToast from '@/components/ui/Toast';
import { Button } from '@/components/ui/button';
import QuantityStepper from '@/components/ui/QuantityStepper/QuantityStepper';
import ErrorCard from '@/components/ui/ErrorCard';
import { Skeleton } from '@/components/ui/skeleton';
import AddressSelectModal, { type Address } from '@/components/address/AddressSelectModal';
import fallbackImage from '@/assets/no-image.svg';
import { paths } from '@/routes/paths';
import { hydrateCart, selectCartItems, type CartItem as StoreCartItem } from '@/store/slices/cartSlice';

const maybeNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return undefined;
  return num;
};

const extractObjectId = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const candidate = (value as { _id?: unknown; id?: unknown })._id ?? (value as { id?: unknown }).id;
    if (typeof candidate === 'string') {
      return candidate;
    }
    if (candidate && typeof candidate === 'object' && typeof (candidate as { toString?: () => string }).toString === 'function') {
      const stringified = (candidate as { toString: () => string }).toString();
      if (typeof stringified === 'string') {
        return stringified;
      }
    }
    if (typeof (value as { toString?: () => string }).toString === 'function') {
      const fallback = (value as { toString: () => string }).toString();
      if (typeof fallback === 'string') {
        return fallback;
      }
    }
  }
  return undefined;
};

const maybePaise = (value: unknown): number | undefined => {
  const num = maybeNumber(value);
  return num === undefined ? undefined : Math.round(num);
};

const maybeRupeesToPaise = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num * 100) : undefined;
};

const normalizeObjectId = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed && /^[a-f\d]{24}$/iu.test(trimmed) ? trimmed : undefined;
};

type CartItem = {
  productId: string;
  variantId?: string | null;
  shopId: string | null;
  name: string;
  image: string | null;
  qty: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  mrpPaise?: number;
};

type CartData = {
  items: CartItem[];
  subtotalPaise: number;
  discountPaise: number;
  grandPaise: number;
  currency: string;
};

const buildCartFromStoreItems = (items: StoreCartItem[] | null | undefined): CartData | null => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const normalizedItems: CartItem[] = items
    .map<CartItem | null>((item) => {
      if (!item || !item.productId) {
        return null;
      }

      const quantity = Number.isFinite(item.qty) ? Math.floor(item.qty) : 0;
      const qty = quantity > 0 ? quantity : 1;
      const unitPrice = Number.isFinite(item.pricePaise) ? Math.round(item.pricePaise) : 0;
      const unitPricePaise = unitPrice > 0 ? unitPrice : 0;

      return {
        productId: item.productId,
        variantId: null,
        shopId: item.shopId ?? null,
        name: item.name,
        image: item.image ?? null,
        qty,
        unitPricePaise,
        lineTotalPaise: unitPricePaise * qty,
      };
    })
    .filter((item): item is CartItem => item !== null);

  if (normalizedItems.length === 0) {
    return null;
  }

  const subtotalPaise = normalizedItems.reduce((total, item) => total + item.lineTotalPaise, 0);

  return {
    items: normalizedItems,
    subtotalPaise,
    discountPaise: 0,
    grandPaise: subtotalPaise,
    currency: 'INR',
  };
};

const extractCartPayload = (input: any) => {
  if (!input) return null;
  if (input.data?.data?.cart) return input.data.data.cart;
  if (input.data?.cart) return input.data.cart;
  if (input.cart) return input.cart;
  return input;
};

const parseCart = (payload: any): CartData => {
  const raw = extractCartPayload(payload) ?? {};
  const rawItems: any[] = Array.isArray(raw.items) ? raw.items : [];

  const items: CartItem[] = rawItems
    .map<CartItem | null>((item) => {
      if (!item) return null;
      const productId = String(item.productId ?? item.id ?? '');
      if (!productId) return null;

      const qty = (() => {
        const num = maybeNumber(item.qty);
        if (!Number.isFinite(num)) return 1;
        const value = Math.floor(Number(num));
        return value > 0 ? value : 1;
      })();

      const product = item.product ?? {};
      const rawShop = item.shop ?? product.shop ?? null;
      const shopId = (() => {
        if (typeof item.shopId === 'string' && item.shopId.trim()) {
          return item.shopId.trim();
        }
        if (rawShop && typeof rawShop === 'object') {
          const candidate = rawShop as { _id?: unknown; id?: unknown };
          const value = candidate.id ?? candidate._id;
          if (typeof value === 'string' && value.trim()) {
            return value.trim();
          }
        }
        if (typeof rawShop === 'string' && rawShop.trim()) {
          return rawShop.trim();
        }
        if (typeof product.shopId === 'string' && product.shopId.trim()) {
          return product.shopId.trim();
        }
        return null;
      })();
      const unitPricePaise =
        maybePaise(item.unitPricePaise) ??
        maybePaise(item.pricePaise) ??
        maybeRupeesToPaise(item.unitPrice) ??
        maybeRupeesToPaise(item.price) ??
        maybePaise(product.pricePaise) ??
        maybeRupeesToPaise(product.price);

      const resolvedUnitPrice = typeof unitPricePaise === 'number' && unitPricePaise > 0 ? unitPricePaise : 0;
      const subtotal = maybePaise(item.subtotalPaise) ?? resolvedUnitPrice * qty;

      const variantId = normalizeObjectId(extractObjectId(item.variantId ?? item.variant));

      const nameSource = [item.name, product.name, product.title].find(
        (value) => typeof value === 'string' && value.trim(),
      );
      const imageSource = [item.image, product.image, Array.isArray(product.images) ? product.images[0] : null].find(
        (value) => typeof value === 'string' && value,
      );

      const mrpPaise =
        maybePaise(item.mrpPaise) ??
        maybePaise(product.mrpPaise) ??
        maybeRupeesToPaise(product.mrp) ??
        maybeRupeesToPaise(product?.pricing?.mrp);

      const result: CartItem = {
        productId,
        shopId,
        name: typeof nameSource === 'string' && nameSource.trim() ? nameSource.trim() : 'Item',
        image: typeof imageSource === 'string' ? imageSource : null,
        qty,
        unitPricePaise: resolvedUnitPrice,
        lineTotalPaise: Math.max(0, Math.round(subtotal)),
        mrpPaise: typeof mrpPaise === 'number' && mrpPaise > 0 ? mrpPaise : undefined,
        variantId: variantId ?? null,
      };

      return result;
    })
    .filter((value): value is CartItem => value !== null);

  const computedSubtotal = items.reduce((total, item) => total + item.unitPricePaise * item.qty, 0);
  const rawSubtotal = maybePaise(raw.totals?.subtotalPaise ?? raw.subtotalPaise);
  const subtotalPaise = Math.max(0, Math.round(rawSubtotal ?? computedSubtotal));

  const computedDiscount = items.reduce((total, item) => {
    if (item.mrpPaise && item.mrpPaise > item.unitPricePaise) {
      return total + (item.mrpPaise - item.unitPricePaise) * item.qty;
    }
    return total;
  }, 0);
  const discountPaise = Math.max(
    0,
    Math.round(maybePaise(raw.totals?.discountPaise ?? raw.discountPaise) ?? computedDiscount),
  );

  const grandPaise = Math.max(
    0,
    Math.round(maybePaise(raw.totals?.grandPaise ?? raw.grandPaise) ?? subtotalPaise - discountPaise),
  );

  return {
    items,
    subtotalPaise,
    discountPaise,
    grandPaise,
    currency: typeof raw.currency === 'string' && raw.currency ? raw.currency : 'INR',
  };
};

const CartPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const storeItems = useSelector(selectCartItems);
  const storeItemsRef = useRef(storeItems);
  useEffect(() => {
    storeItemsRef.current = storeItems;
  }, [storeItems]);

  const [cart, setCart] = useState<CartData | null>(null);
  const [cartSource, setCartSource] = useState<'server' | 'store'>('server');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    if (cartSource !== 'store') {
      return;
    }
    setCart(buildCartFromStoreItems(storeItems) ?? null);
  }, [cartSource, storeItems]);

  const buildItemKey = useCallback((productId: string, variantId?: string | null) => {
    const trimmedProduct = typeof productId === 'string' ? productId.trim() : '';
    const trimmedVariant = typeof variantId === 'string' ? variantId.trim() : '';
    return trimmedVariant ? `${trimmedProduct}::${trimmedVariant}` : trimmedProduct;
  }, []);

  const markPending = useCallback((key: string, isPending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (isPending) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const syncStore = useCallback(
    (next: CartData | null) => {
      const items: StoreCartItem[] = Array.isArray(next?.items)
        ? next!.items
            .filter((item) => item.productId && item.qty > 0)
            .map((item) => ({
              productId: item.productId,
              shopId: item.shopId ?? item.productId,
              name: item.name,
              image: item.image ?? undefined,
              pricePaise: item.unitPricePaise,
              qty: item.qty,
            }))
        : [];
      dispatch(hydrateCart(items));
    },
    [dispatch],
  );

  const refreshCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    const fallback = buildCartFromStoreItems(storeItemsRef.current) ?? null;
    try {
      const response = await http.get('/api/cart');
      const parsed = parseCart(response);
      if (parsed.items.length > 0) {
        setCart(parsed);
        setCartSource('server');
        syncStore(parsed);
      } else if (fallback) {
        setCart(fallback);
        setCartSource('store');
      } else {
        setCart(parsed);
        setCartSource('server');
        syncStore(parsed);
      }
    } catch (err) {
      const message = toErrorMessage(err);
      if (fallback) {
        setCart(fallback);
        setCartSource('store');
      } else {
        setError(message);
        setCartSource('server');
        setCart(null);
      }
    } finally {
      setLoading(false);
    }
  }, [syncStore]);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const handleRemove = useCallback(
    async (productId: string, itemName: string, variantId?: string | null) => {
      const key = buildItemKey(productId, variantId ?? undefined);
      markPending(key, true);
      try {
        const normalizedVariant = normalizeObjectId(variantId ?? undefined);
        const encodedProduct = encodeURIComponent(productId);
        const url = normalizedVariant
          ? `/api/cart/${encodedProduct}?variantId=${encodeURIComponent(normalizedVariant)}`
          : `/api/cart/${encodedProduct}`;
        const response = await http.delete(url);
        const parsed = parseCart(response);
        setCart(parsed);
        setCartSource('server');
        syncStore(parsed);
        showToast(`Removed ${itemName}`, 'success');
      } catch (err) {
        const message = toErrorMessage(err);
        showToast(message, 'error');
      } finally {
        markPending(key, false);
      }
    },
    [buildItemKey, markPending, syncStore],
  );

  const handleQuantityChange = useCallback(
    async (productId: string, nextQty: number, itemName: string, variantId?: string | null) => {
      if (nextQty <= 0) {
        await handleRemove(productId, itemName, variantId);
        return;
      }
      const key = buildItemKey(productId, variantId ?? undefined);
      markPending(key, true);
      try {
      const payload: Record<string, unknown> = {
        productId,
        quantity: nextQty,
        replaceQuantity: true,
      };
        const normalizedVariant = normalizeObjectId(variantId ?? undefined);
        if (normalizedVariant) {
          payload.variantId = normalizedVariant;
        }
        const response = await http.post('/api/cart', payload);
        const parsed = parseCart(response);
        setCart(parsed);
        setCartSource('server');
        syncStore(parsed);
        showToast(`Updated ${itemName} to ${nextQty}`, 'success');
      } catch (err) {
        const message = toErrorMessage(err);
        showToast(message, 'error');
      } finally {
        markPending(key, false);
      }
    },
    [buildItemKey, handleRemove, markPending, syncStore],
  );

  const handleProceedToCheckout = () => {
    if (!cart || cart.items.length === 0) {
      showToast('Your cart is empty', 'info');
      return;
    }
    setAddressModalOpen(true);
  };

  const handlePlaceOrder = useCallback(
    async (address: Address) => {
      const cartItems = Array.isArray(cart?.items) ? cart.items : [];
      const items = cartItems
        .map<{ productId: string; qty: number; variantId?: string } | null>((item) => {
          const trimmedId = typeof item.productId === 'string' ? item.productId.trim() : '';
          if (!trimmedId) {
            return null;
          }

          const rawQty = Number(item.qty);
          const qty = Number.isFinite(rawQty) && rawQty > 0 ? Math.floor(rawQty) : 1;

          const normalizedVariant = normalizeObjectId(item.variantId ?? undefined);

          return normalizedVariant
            ? { productId: trimmedId, qty, variantId: normalizedVariant }
            : { productId: trimmedId, qty };
        })
        .filter((entry): entry is { productId: string; qty: number; variantId?: string } => Boolean(entry));

      if (items.length === 0) {
        showToast('Your cart is empty', 'info');
        return;
      }

      setPlacingOrder(true);
      try {
        const shippingAddress = {
          name: address.label,
          label: address.label,
          phone: address.phone,
          address1: address.line1,
          address2: address.line2 ?? undefined,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          geo:
            address.coords &&
            (typeof address.coords.lat === 'number' || typeof address.coords.lng === 'number')
              ? {
                  lat: typeof address.coords.lat === 'number' ? address.coords.lat : undefined,
                  lng: typeof address.coords.lng === 'number' ? address.coords.lng : undefined,
                }
              : undefined,
        } as const;

        const payload: Record<string, unknown> = {
          items,
          shippingAddress,
          fulfillmentType: 'delivery',
          paymentMethod: 'COD',
        };

        const normalizedAddressId = normalizeObjectId(address.id);
        if (normalizedAddressId) {
          payload.addressId = normalizedAddressId;
        }

        await http.post('/api/orders/checkout', payload);
        showToast('Order placed successfully', 'success');
        setAddressModalOpen(false);
        setCartSource('server');
        setCart((prev) => {
          const next = prev
            ? { ...prev, items: [], subtotalPaise: 0, discountPaise: 0, grandPaise: 0 }
            : prev;
          syncStore(next ?? { items: [], subtotalPaise: 0, discountPaise: 0, grandPaise: 0, currency: 'INR' });
          return next;
        });
        if (typeof paths.orders?.mine === 'function') {
          navigate(paths.orders.mine());
        } else if (typeof paths.orders?.root === 'function') {
          navigate(paths.orders.root());
        } else {
          navigate('/orders/mine');
        }
      } catch (err) {
        const message = toErrorMessage(err);
        showToast(message, 'error');
        throw err;
      } finally {
        setPlacingOrder(false);
      }
    },
    [cart, navigate, syncStore],
  );

  const itemCount = useMemo(() => cart?.items.reduce((total, item) => total + item.qty, 0) ?? 0, [cart]);

  const subtotalLabel = formatINR(cart?.subtotalPaise ?? 0);
  const discountLabel = formatINR(cart?.discountPaise ?? 0);
  const totalLabel = formatINR(cart?.grandPaise ?? 0);

  const isEmpty = !loading && (!cart || cart.items.length === 0);

  const handleContinueShopping = () => {
    if (typeof paths.shops === 'function') {
      navigate(paths.shops());
      return;
    }
    if (typeof paths.home === 'function') {
      navigate(paths.home());
      return;
    }
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full border border-slate-200 text-slate-600 transition hover:border-blue-600/40 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:text-slate-200"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Go back</span>
          </Button>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">My Cart</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Review your items and adjust quantities before checking out.
        </p>
      </header>

      {loading ? (
        <div className="mt-10 space-y-4" aria-live="polite">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-28 w-full rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-8">
          <ErrorCard message={error} onRetry={refreshCart} />
        </div>
      ) : isEmpty ? (
        <div className="mt-12 flex flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <ShoppingCart className="h-12 w-12 text-blue-500" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Your cart is empty</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Add items to your cart to see them here.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleContinueShopping}
            className="rounded-full px-6 py-2"
          >
            Start shopping
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section aria-label="Cart items" className="space-y-4">
            {cart?.items.map((item) => {
              const itemKey = buildItemKey(item.productId, item.variantId ?? undefined);
              const pending = pendingIds.has(itemKey);
              const imageSrc = item.image || fallbackImage;
              const priceLabel = formatINR(item.unitPricePaise);
              const lineTotalLabel = formatINR(item.lineTotalPaise);
              const hasDiscount = typeof item.mrpPaise === 'number' && item.mrpPaise > item.unitPricePaise;
              const mrpLabel = hasDiscount ? formatINR(item.mrpPaise ?? 0) : null;
              return (
                <article
                  key={itemKey}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/80 lg:flex-row"
                >
                  <div className="flex w-full flex-col gap-4 sm:flex-row">
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                      <img
                        src={imageSrc}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          if (event.currentTarget.src !== fallbackImage) {
                            event.currentTarget.src = fallbackImage;
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-col gap-1">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                          <span className="font-semibold text-slate-900 dark:text-slate-50">{priceLabel}</span>
                          {mrpLabel ? (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                              Save {formatINR((item.mrpPaise ?? 0) - item.unitPricePaise)}
                            </span>
                          ) : null}
                        </div>
                        {mrpLabel ? (
                          <span className="text-xs text-slate-500 line-through dark:text-slate-400">{mrpLabel}</span>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <QuantityStepper
                          value={item.qty}
                          onChange={(value) =>
                            handleQuantityChange(item.productId, value, item.name, item.variantId ?? undefined)
                          }
                          disabled={pending}
                          ariaLabel={`Quantity for ${item.name}`}
                        />
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {lineTotalLabel}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(item.productId, item.name, item.variantId ?? undefined)}
                            disabled={pending}
                            className="flex items-center gap-2 text-sm text-rose-600 hover:text-rose-700 dark:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <aside
            className="flex h-fit flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white/95 p-6 shadow-lg dark:border-slate-800/70 dark:bg-slate-900/80"
            aria-label="Order summary"
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Price summary</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {itemCount} item{itemCount === 1 ? '' : 's'} in your cart
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{subtotalLabel}</span>
              </div>
              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-300">
                <span>Discount</span>
                <span>-{discountLabel}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 text-base font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-50">
              <span>Total</span>
              <span>{totalLabel}</span>
            </div>
            <Button
              type="button"
              onClick={handleProceedToCheckout}
              className="w-full rounded-full py-3 text-base font-semibold"
              disabled={placingOrder || (cart?.items.length ?? 0) === 0}
            >
              Proceed to checkout
            </Button>
          </aside>
        </div>
      )}

      <AddressSelectModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onConfirm={handlePlaceOrder}
        isSubmitting={placingOrder}
      />
    </div>
  );
};

export default CartPage;
