import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import Shimmer from '@/components/Shimmer';
import EmptyState from '@/components/ui/EmptyState';
import ErrorCard from '@/components/ui/ErrorCard';
import QuantityStepper from '@/components/ui/QuantityStepper/QuantityStepper';
import SkeletonList from '@/components/ui/SkeletonList';
import fallbackImage from '@/assets/no-image.svg';
import {
  clearCart,
  removeItem,
  selectCartItems,
  updateQty,
} from '@/store/slices/cartSlice';
import { paths } from '@/routes/paths';
import { formatINR } from '@/utils/currency';

import styles from './Cart.module.scss';

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

const CartSkeleton = () => (
  <div className={styles.skeletonWrapper} aria-hidden="true">
    <div className={styles.skeletonHeader}>
      <Shimmer className={styles.skeletonTitle} />
      <Shimmer className={styles.skeletonSubtitle} />
    </div>
    <div className={styles.skeletonGrid}>
      <div className={styles.skeletonItemsCard}>
        <SkeletonList count={3} lines={2} withAvatar />
      </div>
      <div className={styles.skeletonSummaryCard}>
        <Shimmer className={styles.skeletonSummaryLine} />
        <Shimmer className={styles.skeletonSummaryLine} />
        <Shimmer className={styles.skeletonSummaryLine} />
        <Shimmer className={styles.skeletonSummaryButton} />
      </div>
    </div>
  </div>
);

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
    (productId: string, qty: number) => {
      dispatch(updateQty({ productId, qty }));
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    (productId: string) => {
      dispatch(removeItem(productId));
    },
    [dispatch],
  );

  const handleClear = useCallback(() => {
    if (items.length === 0) return;
    dispatch(clearCart());
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
      <main className={styles.cartPage} aria-busy="true">
        <CartSkeleton />
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className={styles.cartPage} role="main">
        <ErrorCard
          title="We couldn’t load your cart"
          message={loadError ?? 'Please try again in a moment.'}
          onRetry={handleRetry}
        />
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className={styles.cartPage} role="main">
        <EmptyState
          title="Your cart is empty"
          message="Looks like you haven’t added anything yet. Let’s fix that!"
          ctaLabel="Continue shopping"
          onCtaClick={handleContinueShopping}
        />
      </main>
    );
  }

  return (
    <main className={styles.cartPage} role="main">
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>Shopping cart</h1>
          <p className={styles.subheading} aria-live="polite">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        <button
          type="button"
          className={styles.clearButton}
          onClick={handleClear}
        >
          Clear cart
        </button>
      </header>

      <div className={styles.layout}>
        <section
          className={styles.itemsSection}
          aria-labelledby="cart-items-heading"
        >
          <div className={styles.sectionHeader}>
            <h2 id="cart-items-heading" className={styles.sectionTitle}>
              Items
            </h2>
          </div>
          {hasMultipleShops && (
            <div className={styles.multiShopNotice} role="status">
              <strong>Heads up:</strong> Your cart has items from multiple
              shops. Please choose one shop to check out now.
            </div>
          )}
          <div className={styles.shopGroups}>
            {shopGroups.map((group) => {
              const summaryId = `shop-${group.shopId}-summary`;
              const isSelected = selectedShopId === group.shopId;

              return (
                <section key={group.shopId} className={styles.shopGroup}>
                  <header className={styles.shopGroupHeader}>
                    {hasMultipleShops ? (
                      <label className={styles.shopSelect}>
                        <input
                          type="radio"
                          name="selected-shop"
                          value={group.shopId}
                          checked={isSelected}
                          onChange={() => setSelectedShopId(group.shopId)}
                          aria-describedby={summaryId}
                        />
                        <span className={styles.shopName}>{group.label}</span>
                      </label>
                    ) : (
                      <span className={styles.shopName}>{group.label}</span>
                    )}
                    <span id={summaryId} className={styles.shopTotals}>
                      {group.itemCount} {group.itemCount === 1 ? 'item' : 'items'} ·{' '}
                      {group.subtotalDisplay}
                    </span>
                  </header>
                  {hasMultipleShops && (
                    <p className={styles.shopSelectHint}>
                      {isSelected
                        ? 'Selected for checkout'
                        : 'Select this shop to checkout these items'}
                    </p>
                  )}
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <caption className={styles.visuallyHidden}>
                        Items from {group.label}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Item</th>
                          <th scope="col">Unit price</th>
                          <th scope="col">Quantity</th>
                          <th scope="col">Line total</th>
                          <th scope="col">
                            <span className={styles.visuallyHidden}>Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <tr key={item.productId}>
                            <td data-label="Item">
                              <div className={styles.itemCell}>
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className={styles.thumbnail}
                                />
                                <div className={styles.itemMeta}>
                                  <p className={styles.itemName}>{item.name}</p>
                                  <p className={styles.itemPrice}>
                                    {item.unitPriceDisplay}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td
                              data-label="Unit price"
                              className={styles.priceCell}
                            >
                              {item.unitPriceDisplay}
                            </td>
                            <td data-label="Quantity" className={styles.qtyCell}>
                              <QuantityStepper
                                value={item.qty}
                                onChange={(qty) =>
                                  handleQtyChange(item.productId, qty)
                                }
                                ariaLabel={`Change quantity for ${item.name}`}
                                className={styles.stepperControl}
                              />
                            </td>
                            <td data-label="Line total" className={styles.totalCell}>
                              <span aria-live="polite">{item.lineTotalDisplay}</span>
                            </td>
                            <td className={styles.actionsCell}>
                              <button
                                type="button"
                                onClick={() => handleRemove(item.productId)}
                                className={styles.removeButton}
                              >
                                Remove
                                <span className={styles.visuallyHidden}>
                                  {' '}
                                  {item.name}
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
          <button
            type="button"
            className={styles.continueButton}
            onClick={handleContinueShopping}
          >
            Continue shopping
          </button>
        </section>

        <aside className={styles.summaryCard} aria-labelledby="cart-summary">
          <h2 id="cart-summary" className={styles.summaryTitle}>
            Order summary
          </h2>
          {hasMultipleShops && (
            <div className={styles.summaryShopMeta}>
              <p className={styles.summaryShopHeading}>Checkout selection</p>
              <p className={styles.summaryShopValue}>
                {selectedGroup ? selectedGroup.label : 'Select a shop'}
              </p>
              <p className={styles.summaryShopHint}>
                {hasMultipleShops
                  ? 'Only one shop can be checked out at a time.'
                  : 'All items in your cart will be checked out together.'}
              </p>
            </div>
          )}
          <dl className={styles.summaryList}>
            <div className={styles.summaryRow}>
              <dt>Subtotal</dt>
              <dd aria-live="polite">
                {selectedSubtotalDisplay}
              </dd>
            </div>
            <div className={`${styles.summaryRow} ${styles.placeholderRow}`}>
              <dt>Estimated tax</dt>
              <dd>Calculated at checkout</dd>
            </div>
            <div className={`${styles.summaryRow} ${styles.placeholderRow}`}>
              <dt>Estimated shipping</dt>
              <dd>Calculated at checkout</dd>
            </div>
            <div className={`${styles.summaryRow} ${styles.grandTotal}`}>
              <dt>Grand total</dt>
              <dd aria-live="polite">
                {selectedSubtotalDisplay}
              </dd>
            </div>
          </dl>
          <p className={styles.summaryHint}>
            Tax and shipping will be finalised during checkout.
          </p>
          <button
            type="button"
            className={styles.checkoutButton}
            onClick={handleCheckout}
            disabled={!selectedGroup || selectedGroup.items.length === 0}
          >
            Proceed to checkout
          </button>
          {hasMultipleShops && (
            <p className={styles.checkoutHelp}>
              {selectedGroup
                ? `${selectedItemCount} ${
                    selectedItemCount === 1 ? 'item' : 'items'
                  } will be included in this checkout.`
                : 'Select a shop to enable checkout.'}
            </p>
          )}
        </aside>
      </div>
    </main>
  );
};

export default Cart;

