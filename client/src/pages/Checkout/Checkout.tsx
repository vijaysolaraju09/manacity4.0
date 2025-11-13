import { type ChangeEvent, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { isAxiosError } from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Home,
  MapPin,
  Pencil,
  Truck,
} from 'lucide-react';

import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/button';
import showToast from '@/components/ui/Toast';
import fallbackImage from '@/assets/no-image.svg';
import { checkoutOrders } from '@/api/orders';
import {
  createAddress,
  listMyAddresses,
  type Address,
  type AddressPayload,
} from '@/api/addresses';
import { toErrorMessage } from '@/lib/response';
import { selectCartItems, clearCart } from '@/store/slices/cartSlice';
import { formatINR } from '@/utils/currency';
import { formatLocaleDateTime } from '@/utils/date';
import { paths } from '@/routes/paths';

type CheckoutCartItem = {
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

type CheckoutGroup = {
  shopId: string;
  label: string;
  items: CheckoutCartItem[];
  subtotalPaise: number;
  subtotalDisplay: string;
  itemCount: number;
};

type AddressFormState = {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

type CheckoutSuccessOrder = {
  id: string;
  shopId: string;
  label: string;
  status?: string | null;
  totalPaise?: number | null;
};

type CheckoutResult = {
  orders: CheckoutSuccessOrder[];
};

const normalizeObjectId = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed && /^[a-f\d]{24}$/iu.test(trimmed) ? trimmed : undefined;
};

const toShippingAddress = (payload: AddressPayload | Address) => {
  const label = typeof payload.label === 'string' ? payload.label.trim() : '';
  const line1 = typeof payload.line1 === 'string' ? payload.line1.trim() : '';
  const line2 = typeof payload.line2 === 'string' ? payload.line2.trim() : '';
  const city = typeof payload.city === 'string' ? payload.city.trim() : '';
  const state = typeof payload.state === 'string' ? payload.state.trim() : '';
  const pincode = typeof payload.pincode === 'string' ? payload.pincode.trim() : '';

  const shipping: Record<string, unknown> = {
    ...(label ? { name: label, label } : {}),
    address1: line1,
    city,
    ...(state ? { state } : {}),
    pincode,
  };

  if (line2) {
    shipping.address2 = line2;
  }

  if ('id' in payload && typeof payload.id === 'string') {
    const trimmedId = payload.id.trim();
    if (/^[a-f\d]{24}$/iu.test(trimmedId)) {
      shipping.referenceId = trimmedId;
    }
  }

  return shipping;
};

const cardClass =
  'rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:shadow-md dark:border-slate-800/70 dark:bg-slate-900/70';

const listMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const formatLastUsed = (isoTimestamp: string | null): string | null => {
  if (!isoTimestamp) return null;
  const formatted = formatLocaleDateTime(isoTimestamp, { dateStyle: 'medium', timeStyle: 'short' });
  return formatted === '—' ? null : formatted;
};

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cartItems = useSelector(selectCartItems);

  const checkoutItems = useMemo<CheckoutCartItem[]>(() => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return [];
    }

    return cartItems.map((item) => {
      const qty = Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 1;
      const unitPricePaise = Number.isFinite(item.pricePaise)
        ? Math.max(0, Math.round(item.pricePaise))
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
      } satisfies CheckoutCartItem;
    });
  }, [cartItems]);

  const shopGroups = useMemo<CheckoutGroup[]>(() => {
    if (checkoutItems.length === 0) {
      return [];
    }

    const groups = new Map<string, CheckoutGroup>();

    checkoutItems.forEach((item) => {
      const existing = groups.get(item.shopId);
      if (!existing) {
        const label = item.shopId ? `Shop ${item.shopId}` : 'Shop';
        groups.set(item.shopId, {
          shopId: item.shopId,
          label,
          items: [item],
          subtotalPaise: item.lineTotalPaise,
          subtotalDisplay: item.lineTotalDisplay,
          itemCount: item.qty,
        });
        return;
      }

      existing.items.push(item);
      existing.itemCount += item.qty;
      existing.subtotalPaise += item.lineTotalPaise;
      existing.subtotalDisplay = formatINR(existing.subtotalPaise);
    });

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [checkoutItems]);

  const totalItemCount = useMemo(
    () => shopGroups.reduce((count, group) => count + group.itemCount, 0),
    [shopGroups],
  );

  const totalSubtotalPaise = useMemo(
    () => shopGroups.reduce((sum, group) => sum + group.subtotalPaise, 0),
    [shopGroups],
  );

  const totalSubtotalDisplay = useMemo(
    () => formatINR(totalSubtotalPaise),
    [totalSubtotalPaise],
  );

  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

  const [addressBookAvailable, setAddressBookAvailable] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [addressForm, setAddressForm] = useState<AddressFormState>({
    label: 'Home',
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    let isMounted = true;
    const loadAddresses = async () => {
      setIsAddressLoading(true);
      try {
        const items = await listMyAddresses();
        if (!isMounted) return;
        setAddressBookAvailable(true);
        setAddresses(items);
        setAddressError(null);
      } catch (err) {
        if (!isMounted) return;
        if (isAxiosError(err) && (err.response?.status === 404 || err.response?.status === 501)) {
          setAddressBookAvailable(false);
          setAddressError(null);
        } else {
          setAddressBookAvailable(false);
          setAddressError(toErrorMessage(err));
        }
      } finally {
        if (isMounted) {
          setIsAddressLoading(false);
        }
      }
    };

    loadAddresses();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!addressBookAvailable) {
      setSelectedAddressId(null);
      return;
    }

    setSelectedAddressId((current) => {
      if (current && (current === 'new' || addresses.some((address) => address.id === current))) {
        return current;
      }

      if (addresses.length === 0) {
        return 'new';
      }

      const preferred = addresses.find((address) => address.isDefault) ?? addresses[0];
      return preferred?.id ?? 'new';
    });
  }, [addressBookAvailable, addresses]);

  const normalizedAddress = useMemo(() => {
    const label = addressForm.label.trim();
    const line1 = addressForm.line1.trim();
    const line2 = addressForm.line2.trim();
    const city = addressForm.city.trim();
    const state = addressForm.state.trim();
    const pincode = addressForm.pincode.trim();

    if (!label || !line1 || !city || !state || !pincode) {
      return { payload: null as AddressPayload | null };
    }

    const payload: AddressPayload = {
      label,
      line1,
      city,
      state,
      pincode,
    };

    if (line2) {
      payload.line2 = line2;
    }

    return { payload };
  }, [addressForm]);

  const addressPayload = normalizedAddress.payload;

  const canSubmit = useMemo(() => {
    if (isSubmitting || checkoutItems.length === 0 || checkoutResult) {
      return false;
    }

    if (addressBookAvailable) {
      if (!selectedAddressId) {
        return false;
      }

      if (selectedAddressId === 'new') {
        return Boolean(addressPayload);
      }

      return true;
    }

    return Boolean(addressPayload);
  }, [
    addressBookAvailable,
    addressPayload,
    checkoutItems.length,
    checkoutResult,
    isSubmitting,
    selectedAddressId,
  ]);

  const idPrefix = useId();
  const fieldId = useCallback((name: string) => `${idPrefix}-${name}`, [idPrefix]);

  const handleAddressFieldChange = useCallback(
    (field: keyof AddressFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setAddressForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const handleConfirmOrder = useCallback(async () => {
    if (isSubmitting) return;
    if (checkoutResult) return;
    if (checkoutItems.length === 0) {
      showToast('Your cart is empty', 'error');
      return;
    }

    setSubmitError(null);

    let orderAddressId: string | undefined;
    let shippingAddressInput: Record<string, unknown> | undefined;
    let shouldCreateAddress = false;

    if (addressBookAvailable) {
      if (!selectedAddressId) {
        showToast('Please select a delivery address', 'error');
        return;
      }

      if (selectedAddressId === 'new') {
        if (!addressPayload) {
          showToast('Please fill in the address details', 'error');
          return;
        }
        shouldCreateAddress = true;
        shippingAddressInput = toShippingAddress(addressPayload);
      } else {
        const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
        if (!selectedAddress) {
          showToast('Selected address could not be found', 'error');
          return;
        }
        orderAddressId = normalizeObjectId(selectedAddress.id);
        shippingAddressInput = toShippingAddress(selectedAddress);
      }
    } else {
      if (!addressPayload) {
        showToast('Please provide your delivery address', 'error');
        return;
      }
      shippingAddressInput = toShippingAddress(addressPayload);
    }

    if (!shippingAddressInput) {
      showToast('Delivery address is required', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (shouldCreateAddress && addressPayload) {
        const created = await createAddress(addressPayload);
        orderAddressId = normalizeObjectId(created.id);
        shippingAddressInput = toShippingAddress(created);
        setAddresses((current) => [...current, created]);
        setSelectedAddressId(created.id);
      }

      const labelMap = new Map(shopGroups.map((group) => [group.shopId, group.label]));
      const createdOrders = await checkoutOrders({
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          qty: item.qty,
        })),
        fulfillmentType: 'delivery',
        addressId: orderAddressId,
        shippingAddress: shippingAddressInput,
        paymentMethod: 'COD',
      });

      const orders: CheckoutSuccessOrder[] = createdOrders.map((entry) => {
        const fallbackLabel = labelMap.get(entry.shopId) ?? `Shop ${entry.shopId}`;
        const resolvedLabel = entry.shopName && entry.shopName.trim() ? entry.shopName : fallbackLabel;
        return {
          id: entry.id,
          shopId: entry.shopId,
          label: resolvedLabel,
          status: entry.status ?? null,
          totalPaise: entry.grandTotal ?? null,
        } satisfies CheckoutSuccessOrder;
      });

      setCheckoutResult({ orders });
      dispatch(clearCart());
      setSubmitError(null);
      showToast('Orders placed successfully', 'success');
    } catch (err) {
      const fallbackMessage = 'Unable to place order. Please retry.';
      const message = toErrorMessage(err) || fallbackMessage;
      const finalMessage = message.trim() ? message : fallbackMessage;
      setSubmitError(finalMessage);
      showToast(finalMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    addressBookAvailable,
    addressPayload,
    addresses,
    checkoutItems,
    checkoutResult,
    dispatch,
    isSubmitting,
    selectedAddressId,
    shopGroups,
  ]);

  const handleGoToCart = useCallback(() => {
    navigate(paths.cart());
  }, [navigate]);

  const handleContinueShopping = useCallback(() => {
    if (typeof paths.shops === 'function') {
      navigate(paths.shops());
      return;
    }
    if (typeof paths.home === 'function') {
      navigate(paths.home());
      return;
    }
    navigate('/shops');
  }, [navigate]);

  if (checkoutResult) {
    const orderCount = checkoutResult.orders.length;
    return (
      <main className="min-h-screen bg-slate-50 pb-16 pt-10 dark:bg-slate-950" role="main">
        <section
          className="mx-auto flex max-w-3xl flex-col gap-6 rounded-2xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-xl backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/80"
          aria-live="polite"
        >
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" aria-hidden="true" />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Order placed successfully</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              We created {orderCount} suborder{orderCount === 1 ? '' : 's'}. Track each shop order below.
            </p>
          </div>

          <ul className="space-y-3 text-left">
            {checkoutResult.orders.map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm shadow-sm transition hover:border-[color:var(--brand-200)] hover:shadow-md dark:border-slate-800/70 dark:bg-slate-950/70"
              >
                <div className="space-y-1">
                  <span className="block font-semibold text-slate-900 dark:text-white">{order.label}</span>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Order ID: {order.id}</span>
                    {order.status ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    ) : null}
                    {typeof order.totalPaise === 'number' ? (
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {formatINR(order.totalPaise)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Link
                  className="inline-flex items-center gap-1 rounded-full border border-transparent bg-[var(--brand-500)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand-500)] dark:bg-[color:var(--brand-500)] dark:hover:bg-[color:var(--brand-400)]"
                  to={paths.orders.detail(order.id)}
                >
                  View order
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => navigate(paths.orders.mine())}>Go to my orders</Button>
            <Button variant="outline" onClick={handleContinueShopping}>
              Continue shopping
            </Button>
          </div>
        </section>
      </main>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 pb-16 pt-10 dark:bg-slate-950" role="main">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <EmptyState
            title="Your cart is empty"
            message="Add some items before heading to checkout."
            ctaLabel="Back to cart"
            onCtaClick={handleGoToCart}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-16 pt-10 dark:bg-slate-950" role="main">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/70">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Checkout</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Confirm your delivery details and place your order.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <section className="space-y-6" aria-labelledby="delivery-details-heading">
            <div className={cardClass}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <MapPin className="h-5 w-5 text-[color:var(--brand-500)] dark:text-[color:var(--brand-400)]" aria-hidden="true" />
                  <h2 id="delivery-details-heading" className="text-lg font-semibold">
                    Delivery address
                  </h2>
                </div>
                {isAddressLoading && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">Loading addresses…</span>
                )}
              </div>

              {addressError && (
                <p className="rounded-xl border border-red-200/70 bg-red-50/80 p-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200" role="alert">
                  {addressError} You can still provide a new address below.
                </p>
              )}

              {addressBookAvailable ? (
                <div className="space-y-4">
                  {addresses.length > 0 && (
                    <div className="grid gap-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        Previously used addresses
                      </p>
                      {addresses.map((address) => {
                        const lastUsedLabel = formatLastUsed(address.lastUsedAt);
                        return (
                          <label
                            key={address.id}
                            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-sm shadow-sm transition hover:border-[color:var(--brand-200)] hover:shadow-md focus-within:border-[color:var(--brand-500)] focus-within:ring-2 focus-within:ring-[color:var(--brand-400)]/35 dark:border-slate-800/70 dark:bg-slate-950/60 dark:hover:border-[color:var(--brand-400)]/40"
                          >
                          <input
                            type="radio"
                            name="checkout-address"
                            value={address.id}
                            checked={selectedAddressId === address.id}
                            onChange={() => setSelectedAddressId(address.id)}
                            className="mt-1 h-4 w-4 rounded-full border-slate-300 text-[color:var(--brand-600)] focus:ring-[color:var(--brand-500)] dark:border-slate-600"
                          />
                          <div className="space-y-1">
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                              <Home className="h-4 w-4" aria-hidden="true" />
                              {address.label}
                              {address.isDefault ? (
                                <span className="inline-flex items-center rounded-full bg-[color:var(--brand-500)]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--brand-600)] dark:bg-[color:var(--brand-500)]/20 dark:text-[color:var(--brand-200)]">
                                  Default
                                </span>
                              ) : null}
                            </span>
                            <span className="block text-sm text-slate-600 dark:text-slate-300">{address.line1}</span>
                            {address.line2 && (
                              <span className="block text-sm text-slate-600 dark:text-slate-300">{address.line2}</span>
                            )}
                            <span className="block text-sm text-slate-600 dark:text-slate-300">
                              {address.city}, {address.state} {address.pincode}
                            </span>
                            {lastUsedLabel ? (
                              <span className="block text-xs text-slate-400 dark:text-slate-500">
                                Last used {lastUsedLabel}
                              </span>
                            ) : null}
                          </div>
                        </label>
                        );
                      })}
                    </div>
                  )}

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-dashed border-slate-300/80 bg-slate-100/60 p-4 text-sm shadow-sm transition hover:border-[color:var(--brand-200)] hover:bg-white hover:shadow-md focus-within:border-[color:var(--brand-500)] focus-within:ring-2 focus-within:ring-[color:var(--brand-400)]/35 dark:border-slate-700/70 dark:bg-slate-800/60 dark:hover:border-[color:var(--brand-400)]/40">
                    <input
                      type="radio"
                      name="checkout-address"
                      value="new"
                      checked={selectedAddressId === 'new'}
                      onChange={() => setSelectedAddressId('new')}
                      className="mt-1 h-4 w-4 rounded-full border-slate-300 text-[color:var(--brand-600)] focus:ring-[color:var(--brand-500)] dark:border-slate-600"
                    />
                    <div className="space-y-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                        Use a new address
                      </span>
                      <span className="block text-sm text-slate-600 dark:text-slate-300">
                        Provide a fresh delivery address for this order.
                      </span>
                    </div>
                  </label>
                </div>
              ) : null}

              {(!addressBookAvailable || selectedAddressId === 'new') && (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label htmlFor={fieldId('label')} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Label
                      </label>
                      <input
                        id={fieldId('label')}
                        type="text"
                        value={addressForm.label}
                        onChange={handleAddressFieldChange('label')}
                        autoComplete="address-type"
                        className="w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-inner transition focus:border-[color:var(--brand-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-400)]/35 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor={fieldId('line1')} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Address line 1
                      </label>
                      <input
                        id={fieldId('line1')}
                        type="text"
                        value={addressForm.line1}
                        onChange={handleAddressFieldChange('line1')}
                        autoComplete="address-line1"
                        className="w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-inner transition focus:border-[color:var(--brand-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-400)]/35 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor={fieldId('line2')} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Address line 2 (optional)
                    </label>
                    <input
                      id={fieldId('line2')}
                      type="text"
                      value={addressForm.line2}
                      onChange={handleAddressFieldChange('line2')}
                      autoComplete="address-line2"
                      className="w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-inner transition focus:border-[color:var(--brand-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-400)]/35 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label htmlFor={fieldId('city')} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        City
                      </label>
                      <input
                        id={fieldId('city')}
                        type="text"
                        value={addressForm.city}
                        onChange={handleAddressFieldChange('city')}
                        autoComplete="address-level2"
                        className="w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-inner transition focus:border-[color:var(--brand-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-400)]/35 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor={fieldId('state')} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        State
                      </label>
                      <input
                        id={fieldId('state')}
                        type="text"
                        value={addressForm.state}
                        onChange={handleAddressFieldChange('state')}
                        autoComplete="address-level1"
                        className="w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-inner transition focus:border-[color:var(--brand-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-400)]/35 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor={fieldId('pincode')} className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        PIN code
                      </label>
                      <input
                        id={fieldId('pincode')}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={addressForm.pincode}
                        onChange={handleAddressFieldChange('pincode')}
                        autoComplete="postal-code"
                        className="w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-inner transition focus:border-[color:var(--brand-500)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-400)]/35 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={cardClass}>
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                <h2 className="text-lg font-semibold">Order review</h2>
                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                  {totalItemCount} item{totalItemCount === 1 ? '' : 's'} across {shopGroups.length} shop
                  {shopGroups.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="mt-4 space-y-4">
                <AnimatePresence initial={false}>
                  {shopGroups.map((group) => (
                    <motion.section
                      key={group.shopId}
                      className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm transition hover:border-[color:var(--brand-200)] hover:shadow-md dark:border-slate-800/70 dark:bg-slate-950/60"
                      initial={listMotion.initial}
                      animate={listMotion.animate}
                      exit={listMotion.exit}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      aria-label={group.label}
                    >
                      <header className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{group.label}</h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {group.itemCount} item{group.itemCount === 1 ? '' : 's'} · {group.subtotalDisplay}
                        </span>
                      </header>
                      <ul className="space-y-3">
                        {group.items.map((item) => (
                          <li
                            key={item.productId}
                            className="flex items-start gap-4 rounded-2xl border border-slate-200/60 bg-white/95 p-3 text-sm shadow-sm dark:border-slate-800/60 dark:bg-slate-950/60"
                          >
                            <img
                              src={item.image}
                              alt=""
                              loading="lazy"
                              className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 object-cover shadow-sm dark:border-slate-800"
                            />
                            <div className="flex flex-1 flex-col gap-1">
                              <span className="font-medium text-slate-900 dark:text-white">{item.name}</span>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <span>Qty: {item.qty}</span>
                                <span>{item.unitPriceDisplay}</span>
                              </div>
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-white">{item.lineTotalDisplay}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.section>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </section>

          <aside
            className="space-y-5 rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:border-slate-800/70 dark:bg-slate-900/80"
            aria-labelledby="checkout-summary"
          >
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              <h2 id="checkout-summary" className="text-lg font-semibold text-slate-900 dark:text-white">
                Order summary
              </h2>
            </div>

            <dl className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <dt>Items ({totalItemCount})</dt>
                <dd className="font-semibold text-slate-900 dark:text-white">{totalSubtotalDisplay}</dd>
              </div>
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500">
                <dt>Shipping</dt>
                <dd>Calculated at delivery</dd>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-900 dark:text-white">
                <dt>Estimated total</dt>
                <dd>{totalSubtotalDisplay}</dd>
              </div>
            </dl>

            <Button
              className="w-full rounded-full text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              onClick={handleConfirmOrder}
              disabled={!canSubmit}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? 'Placing orders…' : 'Confirm order'}
            </Button>

            {submitError && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200/70 bg-red-50/80 p-4 text-sm text-red-600 shadow-sm dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200" role="alert">
                <ArrowLeft className="mt-0.5 h-4 w-4" aria-hidden="true" />
                <div className="flex-1 space-y-2">
                  <p>{submitError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting}
                    className="rounded-full"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your entire cart will be split into shop-specific orders once this checkout succeeds.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Checkout;
