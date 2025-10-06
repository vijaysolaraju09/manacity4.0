import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { http } from '@/lib/http';
import { toItem, toErrorMessage } from '@/lib/response';
import PriceBlock from '../../components/ui/PriceBlock';
import StatusChip from '../../components/ui/StatusChip';
import Shimmer from '../../components/Shimmer';
import ErrorCard from '@/components/ui/ErrorCard';
import { normalizeOrder, cancelOrder, rateOrder, type Order } from '@/store/orders';
import type { RootState, AppDispatch } from '@/store';
import showToast from '@/components/ui/Toast';
import fallbackImage from '../../assets/no-image.svg';
import styles from './OrderDetail.module.scss';

const cancellableStatuses = new Set(['placed', 'confirmed', 'preparing']);

const OrderDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch<AppDispatch>();
  const authUserId = useSelector((state: RootState) => state.auth.user?._id || null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await http.get(`/orders/${id}`);
        const data = normalizeOrder(toItem(res));
        setOrder(data);
      } catch (err) {
        setError(toErrorMessage(err));
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleCancel = async () => {
    if (!order) return;
    const reason = window.prompt('Tell us why you are cancelling this order:', '');
    if (reason === null) return;
    try {
      const updated = await dispatch(
        cancelOrder({ id: order.id, reason: reason || undefined })
      ).unwrap();
      setOrder(updated);
      showToast('Order cancelled', 'success');
    } catch (err) {
      showToast((err as Error)?.message || 'Failed to cancel order', 'error');
    }
  };

  const handleRate = async () => {
    if (!order) return;
    const ratingInput = window.prompt('Rate your order (1-5):', order.rating ? String(order.rating) : '5');
    if (!ratingInput) return;
    const rating = Number(ratingInput);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      showToast('Please enter a rating between 1 and 5.', 'error');
      return;
    }
    const review = window.prompt('Share more about your experience (optional):', order.review || '');
    try {
      const updated = await dispatch(
        rateOrder({ id: order.id, rating, review: review ? review.trim() : undefined })
      ).unwrap();
      setOrder(updated);
      showToast('Thanks for your feedback!', 'success');
    } catch (err) {
      showToast((err as Error)?.message || 'Failed to submit rating', 'error');
    }
  };

  const sortedTimeline = useMemo(() => {
    if (!order) return [] as Order['timeline'];
    return [...order.timeline].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
    );
  }, [order]);

  if (loading) {
    return (
      <div className={styles.orderDetail}>
        <Shimmer style={{ height: 240 }} className="rounded" />
      </div>
    );
  }

  if (error) {
    return <ErrorCard message={error} onRetry={() => id && setLoading(true)} />;
  }

  if (!order) {
    return (
      <div className={styles.orderDetail}>
        <ErrorCard message="Order not found." />
      </div>
    );
  }

  const totalItems = order.items.reduce((sum, item) => sum + item.qty, 0);
  const canCancel = authUserId && order.customer.id === authUserId && cancellableStatuses.has(order.status);
  const canRate = authUserId && order.customer.id === authUserId && order.status === 'delivered';

  return (
    <div className={styles.orderDetail}>
      <header className={styles.header}>
        <div>
          <h2>Order summary</h2>
          <p className={styles.subhead}>
            Placed on {new Date(order.createdAt).toLocaleString()} • {totalItems} items
          </p>
        </div>
        <StatusChip status={order.status} className={styles.status} />
      </header>

      <section className={styles.section}>
        <h3>Items</h3>
        <ul className={styles.items}>
          {order.items.map((item) => (
            <li key={item.id} className={styles.item}>
              <img src={item.image || fallbackImage} alt={item.title} />
              <div className={styles.itemInfo}>
                <span className={styles.itemTitle}>{item.title}</span>
                <span className={styles.itemMeta}>Qty: {item.qty}</span>
              </div>
              <PriceBlock price={item.subtotal} className={styles.itemPrice} />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h3>Payment summary</h3>
        <div className={styles.summaryRow}>
          <span>Items total</span>
          <span>₹{order.totals.items.toFixed(2)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Discounts</span>
          <span>-₹{order.totals.discount.toFixed(2)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Taxes &amp; fees</span>
          <span>₹{order.totals.tax.toFixed(2)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Shipping</span>
          <span>₹{order.totals.shipping.toFixed(2)}</span>
        </div>
        <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
          <span>Grand total</span>
          <span>₹{order.totals.grand.toFixed(2)}</span>
        </div>
      </section>

      <section className={styles.section}>
        <h3>Timeline</h3>
        <ol className={styles.timeline}>
          {sortedTimeline.map((entry) => (
            <li key={`${entry.status}-${entry.at}`}>
              <div className={styles.timelineStatus}>{entry.status.replace(/_/g, ' ')}</div>
              <div className={styles.timelineMeta}>{new Date(entry.at).toLocaleString()}</div>
              {entry.note && <p className={styles.timelineNote}>{entry.note}</p>}
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section}>
        <h3>Delivery details</h3>
        <p>
          {order.fulfillment.type === 'delivery'
            ? 'Delivery'
            : 'Pickup'}{' '}
          {order.fulfillment.eta && `• ETA ${new Date(order.fulfillment.eta).toLocaleString()}`}
        </p>
        {order.shippingAddress && (
          <address className={styles.address}>
            {order.shippingAddress.name && <div>{order.shippingAddress.name}</div>}
            {order.shippingAddress.phone && <div>{order.shippingAddress.phone}</div>}
            {order.shippingAddress.address1 && <div>{order.shippingAddress.address1}</div>}
            {order.shippingAddress.address2 && <div>{order.shippingAddress.address2}</div>}
            {order.shippingAddress.city && (
              <div>
                {order.shippingAddress.city} {order.shippingAddress.pincode || ''}
              </div>
            )}
            {order.shippingAddress.landmark && <div>Landmark: {order.shippingAddress.landmark}</div>}
          </address>
        )}
      </section>

      <div className={styles.actions}>
        {canCancel && (
          <button type="button" onClick={handleCancel}>
            Cancel order
          </button>
        )}
        {canRate && (
          <button type="button" onClick={handleRate} className={styles.primaryAction}>
            Rate order
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;

