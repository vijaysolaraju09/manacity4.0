import { type ChangeEvent, useCallback, useEffect, useId, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/button';
import showToast from '@/components/ui/Toast';
import fallbackImage from '@/assets/no-image.svg';
import { createOrder } from '@/api/orders';
import {
  createAddress,
  listAddresses,
  type Address,
  type AddressPayload,
} from '@/api/addresses';
import { toErrorMessage } from '@/lib/response';
import { selectCartItems, clearShop } from '@/store/slices/cartSlice';
import { paths } from '@/routes/paths';

import styles from './Checkout.module.scss';

interface CheckoutLocationState {
  shopId?: string;
}

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

const formatPrice = (valueInPaise: number, formatter: Intl.NumberFormat) => {
  const paise = Number.isFinite(valueInPaise) ? valueInPaise : 0;
  return formatter.format(paise / 100);
};

const toShippingAddress = (payload: AddressPayload) => {
  return {
    label: payload.label,
    address1: payload.line1,
    ...(payload.line2 ? { address2: payload.line2 } : {}),
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
  } as Record<string, unknown>;
};

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as CheckoutLocationState | null) ?? null;
  const initialShopId = locationState?.shopId;
  const cartItems = useSelector(selectCartItems);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

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
        unitPriceDisplay: formatPrice(unitPricePaise, currencyFormatter),
        lineTotalPaise,
        lineTotalDisplay: formatPrice(lineTotalPaise, currencyFormatter),
      } satisfies CheckoutCartItem;
    });
  }, [cartItems, currencyFormatter]);

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
      existing.subtotalDisplay = formatPrice(existing.subtotalPaise, currencyFormatter);
    });

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [checkoutItems, currencyFormatter]);

  const [selectedShopId, setSelectedShopId] = useState<string | null>(() => initialShopId ?? null);

  useEffect(() => {
    setSelectedShopId((current) => {
      if (shopGroups.length === 0) {
        return null;
      }

      if (current && shopGroups.some((group) => group.shopId === current)) {
        return current;
      }

      if (initialShopId && shopGroups.some((group) => group.shopId === initialShopId)) {
        return initialShopId;
      }

      return shopGroups[0]?.shopId ?? null;
    });
  }, [initialShopId, shopGroups]);

  const selectedGroup = useMemo<CheckoutGroup | null>(() => {
    if (shopGroups.length === 0) {
      return null;
    }

    if (!selectedShopId) {
      return shopGroups[0] ?? null;
    }

    return shopGroups.find((group) => group.shopId === selectedShopId) ?? shopGroups[0] ?? null;
  }, [selectedShopId, shopGroups]);

  const [addressBookAvailable, setAddressBookAvailable] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const items = await listAddresses();
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
    if (!selectedGroup || isSubmitting) {
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
  }, [addressBookAvailable, addressPayload, isSubmitting, selectedAddressId, selectedGroup]);

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
    if (!selectedGroup) {
      showToast('Your cart is empty', 'error');
      return;
    }

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
      } else {
        orderAddressId = selectedAddressId;
      }
    } else {
      if (!addressPayload) {
        showToast('Please provide your delivery address', 'error');
        return;
      }
      shippingAddressInput = toShippingAddress(addressPayload);
    }

    setIsSubmitting(true);
    try {
      if (shouldCreateAddress && addressPayload) {
        const created = await createAddress(addressPayload);
        orderAddressId = created.id;
        setAddresses((current) => [...current, created]);
        setSelectedAddressId(created.id);
      }

      const order = await createOrder({
        shopId: selectedGroup.shopId,
        items: selectedGroup.items.map((item) => ({
          productId: item.productId,
          quantity: item.qty,
        })),
        fulfillmentType: 'delivery',
        ...(orderAddressId ? { addressId: orderAddressId } : {}),
        ...(shippingAddressInput ? { shippingAddress: shippingAddressInput } : {}),
      });

      dispatch(clearShop(selectedGroup.shopId));
      showToast('Order placed', 'success');
      navigate(paths.orders.detail(order.id));
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    addressBookAvailable,
    addressPayload,
    dispatch,
    navigate,
    selectedAddressId,
    selectedGroup,
    isSubmitting,
  ]);

  const handleGoToCart = useCallback(() => {
    navigate(paths.cart());
  }, [navigate]);

  if (!selectedGroup) {
    return (
      <main className={styles.checkoutPage} role="main">
        <EmptyState
          title="Your cart is empty"
          message="Add some items before heading to checkout."
          ctaLabel="Back to cart"
          onCtaClick={handleGoToCart}
        />
      </main>
    );
  }

  return (
    <main className={styles.checkoutPage} role="main">
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>Checkout</h1>
          <p className={styles.subheading}>Confirm your delivery details and place your order.</p>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.detailsColumn}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Delivery address</h2>
              {isAddressLoading && <span className={styles.cardMeta}>Loading addresses…</span>}
            </div>

            {addressError && (
              <p className={styles.inlineError} role="alert">
                {addressError} You can still provide a new address below.
              </p>
            )}

            {addressBookAvailable ? (
              <div className={styles.addressBook}>
                {addresses.length > 0 && (
                  <div className={styles.addressList}>
                    {addresses.map((address) => (
                      <label key={address.id} className={styles.addressOption}>
                        <input
                          type="radio"
                          name="checkout-address"
                          value={address.id}
                          checked={selectedAddressId === address.id}
                          onChange={() => setSelectedAddressId(address.id)}
                        />
                        <div>
                          <span className={styles.addressLabel}>{address.label}</span>
                          <span className={styles.addressLine}>{address.line1}</span>
                          {address.line2 && <span className={styles.addressLine}>{address.line2}</span>}
                          <span className={styles.addressLine}>
                            {address.city}, {address.state} {address.pincode}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                <label className={styles.addressOption}>
                  <input
                    type="radio"
                    name="checkout-address"
                    value="new"
                    checked={selectedAddressId === 'new'}
                    onChange={() => setSelectedAddressId('new')}
                  />
                  <div>
                    <span className={styles.addressLabel}>Use a new address</span>
                    <span className={styles.addressLine}>Provide a fresh delivery address for this order.</span>
                  </div>
                </label>

                {selectedAddressId === 'new' && (
                  <div className={styles.addressForm}>
                    <div className={styles.formField}>
                      <label htmlFor={fieldId('label')}>Label</label>
                      <input
                        id={fieldId('label')}
                        type="text"
                        placeholder="e.g. Home"
                        value={addressForm.label}
                        onChange={handleAddressFieldChange('label')}
                      />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={fieldId('line1')}>Address line 1</label>
                      <input
                        id={fieldId('line1')}
                        type="text"
                        placeholder="House number, street"
                        value={addressForm.line1}
                        onChange={handleAddressFieldChange('line1')}
                        autoComplete="address-line1"
                      />
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={fieldId('line2')}>Address line 2 (optional)</label>
                      <input
                        id={fieldId('line2')}
                        type="text"
                        placeholder="Apartment, suite"
                        value={addressForm.line2}
                        onChange={handleAddressFieldChange('line2')}
                        autoComplete="address-line2"
                      />
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formField}>
                        <label htmlFor={fieldId('city')}>City</label>
                        <input
                          id={fieldId('city')}
                          type="text"
                          value={addressForm.city}
                          onChange={handleAddressFieldChange('city')}
                          autoComplete="address-level2"
                        />
                      </div>
                      <div className={styles.formField}>
                        <label htmlFor={fieldId('state')}>State</label>
                        <input
                          id={fieldId('state')}
                          type="text"
                          value={addressForm.state}
                          onChange={handleAddressFieldChange('state')}
                          autoComplete="address-level1"
                        />
                      </div>
                    </div>
                    <div className={styles.formField}>
                      <label htmlFor={fieldId('pincode')}>PIN code</label>
                      <input
                        id={fieldId('pincode')}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={addressForm.pincode}
                        onChange={handleAddressFieldChange('pincode')}
                        autoComplete="postal-code"
                      />
                    </div>
                  </div>
                )}

                {addresses.length === 0 && selectedAddressId !== 'new' && (
                  <p className={styles.addressHint}>
                    You don’t have any saved addresses yet. Choose “Use a new address” to add one.
                  </p>
                )}
              </div>
            ) : (
              <div className={styles.addressForm}>
                <p className={styles.addressHint}>
                  Enter the delivery address for this order. We’ll include it with your request.
                </p>
                <div className={styles.formField}>
                  <label htmlFor={fieldId('label')}>Label</label>
                  <input
                    id={fieldId('label')}
                    type="text"
                    placeholder="e.g. Home"
                    value={addressForm.label}
                    onChange={handleAddressFieldChange('label')}
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor={fieldId('line1')}>Address line 1</label>
                  <input
                    id={fieldId('line1')}
                    type="text"
                    placeholder="House number, street"
                    value={addressForm.line1}
                    onChange={handleAddressFieldChange('line1')}
                    autoComplete="address-line1"
                  />
                </div>
                <div className={styles.formField}>
                  <label htmlFor={fieldId('line2')}>Address line 2 (optional)</label>
                  <input
                    id={fieldId('line2')}
                    type="text"
                    placeholder="Apartment, suite"
                    value={addressForm.line2}
                    onChange={handleAddressFieldChange('line2')}
                    autoComplete="address-line2"
                  />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label htmlFor={fieldId('city')}>City</label>
                    <input
                      id={fieldId('city')}
                      type="text"
                      value={addressForm.city}
                      onChange={handleAddressFieldChange('city')}
                      autoComplete="address-level2"
                    />
                  </div>
                  <div className={styles.formField}>
                    <label htmlFor={fieldId('state')}>State</label>
                    <input
                      id={fieldId('state')}
                      type="text"
                      value={addressForm.state}
                      onChange={handleAddressFieldChange('state')}
                      autoComplete="address-level1"
                    />
                  </div>
                </div>
                <div className={styles.formField}>
                  <label htmlFor={fieldId('pincode')}>PIN code</label>
                  <input
                    id={fieldId('pincode')}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={addressForm.pincode}
                    onChange={handleAddressFieldChange('pincode')}
                    autoComplete="postal-code"
                  />
                </div>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Order review</h2>
              <span className={styles.cardMeta}>
                {selectedGroup.itemCount} item{selectedGroup.itemCount === 1 ? '' : 's'} from {selectedGroup.label}
              </span>
            </div>

            <ul className={styles.itemList}>
              {selectedGroup.items.map((item) => (
                <li key={item.productId} className={styles.itemRow}>
                  <img src={item.image} alt="" className={styles.itemImage} />
                  <div className={styles.itemDetails}>
                    <div className={styles.itemName}>{item.name}</div>
                    <div className={styles.itemMeta}>
                      <span>Qty: {item.qty}</span>
                      <span>{item.unitPriceDisplay}</span>
                    </div>
                  </div>
                  <div className={styles.itemTotal}>{item.lineTotalDisplay}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className={styles.summaryCard}>
          <h2 className={styles.summaryTitle}>Order summary</h2>
          <dl className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <dt>Items ({selectedGroup.itemCount})</dt>
              <dd>{selectedGroup.subtotalDisplay}</dd>
            </div>
            <div className={styles.summaryRow}>
              <dt>Shipping</dt>
              <dd>Calculated at delivery</dd>
            </div>
            <div className={styles.summaryTotal}>
              <dt>Estimated total</dt>
              <dd>{selectedGroup.subtotalDisplay}</dd>
            </div>
          </dl>

          <Button
            className={styles.confirmButton}
            onClick={handleConfirmOrder}
            disabled={!canSubmit}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Placing order…' : 'Confirm order'}
          </Button>

          <p className={styles.summaryHelp}>
            Your cart will be updated once the order is placed successfully.
          </p>
        </aside>
      </div>
    </main>
  );
};

export default Checkout;
