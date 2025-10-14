import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import QuantityStepper from '../../components/ui/QuantityStepper/QuantityStepper';
import PriceBlock from '../../components/ui/PriceBlock';
import EmptyState from '../../components/ui/EmptyState';
import fallbackImage from '../../assets/no-image.svg';
import {
  removeItem,
  updateQty,
  clearCart,
  selectCartItems,
  selectSubtotalPaise,
} from '../../store/slices/cartSlice';
import type { RootState } from '../../store';
import { toErrorMessage } from '@/lib/response';
import { paths } from '@/routes/paths';
import showToast from '../../components/ui/Toast';
import styles from './Cart.module.scss';
import { createOrder } from '@/api/orders';

const Cart = () => {
  const items = useSelector(selectCartItems);
  const subtotalPaise = useSelector(selectSubtotalPaise);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  const subtotal = subtotalPaise / 100;
  const discount = 0;
  const fee = items.length > 0 && subtotal <= 200 ? 40 : 0;
  const total = subtotal - discount + fee;

  const shopIds = Array.from(new Set(items.map((item) => item.shopId).filter(Boolean)));
  const hasMultipleShops = shopIds.length > 1;
  const shopId = shopIds[0];
  const shopName = useSelector((state: RootState) => {
    if (!shopId) return '';
    const shops = state.shops.items || [];
    const match = shops.find((shop) => shop.id === shopId || shop._id === shopId);
    return match?.name || shopId;
  });

  const handleCheckout = async () => {
    if (placing) return;
    if (!items.length) return;
    if (hasMultipleShops) {
      showToast('Please checkout items from one shop at a time.', 'error');
      return;
    }
    if (!shopId) {
      showToast('Missing shop information for items in cart.', 'error');
      return;
    }
    if (items.some((item) => !item.shopId)) {
      showToast('One or more items are missing shop details.', 'error');
      return;
    }

    setPlacing(true);
    try {
      await createOrder({
        shopId,
        items: items.map((it) => ({ productId: it.productId, quantity: it.qty })),
        fulfillmentType: 'pickup',
        notes: notes.trim() || undefined,
      });
      dispatch(clearCart());
      showToast('Order placed', 'success');
      navigate(paths.orders.mine());
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        image={fallbackImage}
        message="Your cart is empty"
        ctaLabel="Browse shops"
        onCtaClick={() => navigate(paths.shops())}
      />
    );
  }

  return (
    <div className={styles.cart}>
      <div className={styles.content}>
        <div className={styles.items}>
          {items.map((it) => (
            <div key={it.productId} className={styles.item}>
              <img src={it.image || fallbackImage} alt={it.name} />
              <div className={styles.details}>
                <h4 className={styles.title}>{it.name}</h4>
                <PriceBlock price={it.pricePaise / 100} />
              </div>
              <div className={styles.controls}>
                <QuantityStepper
                  value={it.qty}
                  onChange={(q) => dispatch(updateQty({ productId: it.productId, qty: q }))}
                  min={1}
                />
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() => dispatch(removeItem(it.productId))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.summary}>
          {shopName && <p className={styles.shopName}>Order from {shopName}</p>}
          {hasMultipleShops && (
            <div className={styles.warning}>
              You have items from multiple shops. Please place separate orders for each shop.
            </div>
          )}
          <div className={styles.row}>
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          <div className={styles.row}>
            <span>Discount</span>
            <span>-₹{discount}</span>
          </div>
          <div className={styles.row}>
            <span>Fee</span>
            <span>₹{fee}</span>
          </div>
          <div className={`${styles.row} ${styles.total}`}>
            <span>Total</span>
            <span>₹{total}</span>
          </div>
          <label htmlFor="cart-notes" className={styles.label}>
            Notes for the shop (optional)
          </label>
          <textarea
            id="cart-notes"
            className={styles.notes}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add delivery instructions or special requests"
          />
          <button
            type="button"
            className={styles.checkout}
            onClick={handleCheckout}
            disabled={placing || hasMultipleShops}
          >
            {placing ? 'Placing order…' : 'Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;

