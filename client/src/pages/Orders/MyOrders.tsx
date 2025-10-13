import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchMyOrders,
  selectOrdersByStatus,
  selectMyOrders,
  cancelOrder,
  rateOrder,
  type Order,
  type OrderStatus,
} from '@/store/orders';
import type { RootState, AppDispatch } from '@/store';
import { clearCart, addToCart } from '@/store/slices/cartSlice';
import { OrderCard } from '@/components/base';
import Shimmer from '@/components/Shimmer';
import ErrorCard from '@/components/ui/ErrorCard';
import EmptyState from '@/components/ui/EmptyState';
import showToast from '@/components/ui/Toast';
import { toErrorMessage } from '@/lib/response';
import fallbackImage from '@/assets/no-image.svg';
import styles from './MyOrders.module.scss';
import { paths } from '@/routes/paths';

const statusOptions: (OrderStatus | 'all')[] = [
  'all',
  'draft',
  'pending',
  'placed',
  'confirmed',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled',
  'returned',
];

const cancellableStatuses = new Set<OrderStatus>([
  'pending',
  'placed',
  'confirmed',
  'accepted',
  'preparing',
]);

const statusDisplay: Record<OrderStatus | 'all', string> = {
  all: 'All',
  draft: 'Draft',
  pending: 'Pending',
  placed: 'Placed',
  confirmed: 'Confirmed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

const MyOrders = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<(typeof statusOptions)[number]>('all');

  const mineState = useSelector((state: RootState) => state.orders.mine);
  const orders = useSelector((state: RootState) =>
    activeStatus === 'all'
      ? selectMyOrders(state)
      : selectOrdersByStatus(state, 'mine', activeStatus as OrderStatus)
  );

  useEffect(() => {
    if (mineState.status === 'idle') {
      dispatch(fetchMyOrders());
    }
  }, [dispatch, mineState.status]);

  const isLoading = mineState.status === 'loading';
  const isError = mineState.status === 'failed';
  const showSkeleton = isLoading && orders.length === 0;

  const grouped = useMemo(() => {
    const list = orders ?? [];
    return list.reduce<Record<string, Order[]>>((acc, order) => {
      const date = new Date(order.createdAt).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(order);
      return acc;
    }, {});
  }, [orders]);

  const handleRetry = () => {
    dispatch(fetchMyOrders());
  };

  const handleReorder = (order: Order) => {
    dispatch(clearCart());
    (order.items ?? []).forEach((item) => {
      dispatch(
        addToCart({
          id: item.productId || item.id,
          name: item.title,
          price: item.unitPrice,
          quantity: item.qty,
          image: item.image,
          shopId: order.shop.id,
          shopName: order.shop.name,
        })
      );
    });
    navigate(paths.cart());
  };

  const handleCancel = async (order: Order) => {
    const reason = window.prompt('Tell us why you are cancelling this order:', '');
    if (reason === null) return;
    try {
      await dispatch(cancelOrder({ id: order.id, reason: reason || undefined })).unwrap();
      showToast('Order cancelled', 'success');
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    }
  };

  const handleRate = async (order: Order) => {
    const ratingInput = window.prompt('Rate your order (1-5):', order.rating ? String(order.rating) : '5');
    if (!ratingInput) return;
    const rating = Number(ratingInput);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      showToast('Please enter a rating between 1 and 5.', 'error');
      return;
    }
    const review = window.prompt('Share more about your experience (optional):', order.review || '');
    try {
      await dispatch(
        rateOrder({ id: order.id, rating, review: review ? review.trim() : undefined })
      ).unwrap();
      showToast('Thanks for your feedback!', 'success');
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    }
  };

  return (
    <div className={styles.myOrders}>
      <div className={styles.header}>
        <h2>My Orders</h2>
      </div>
      <div className={styles.tabs} role="tablist">
        {statusOptions.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={activeStatus === status}
            className={activeStatus === status ? styles.active : ''}
            onClick={() => setActiveStatus(status)}
          >
            {statusDisplay[status] || status}
          </button>
        ))}
      </div>

      {showSkeleton && (
        <div className={styles.loading}>
          {[1, 2, 3].map((n) => (
            <Shimmer key={n} className={`${styles.card} shimmer rounded`} style={{ height: 88 }} />
          ))}
        </div>
      )}

      {isError && !showSkeleton && (
        <ErrorCard
          message={mineState.error || 'We could not load your orders.'}
          onRetry={handleRetry}
        />
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <EmptyState
          image={fallbackImage}
          title="No orders yet"
          message="When you place an order, it will show up here so you can track it easily."
          ctaLabel="Browse shops"
          onCtaClick={() => navigate(paths.shops())}
        />
      )}

      {!isLoading && !isError && orders.length > 0 && (
        <div className={styles.groups}>
          {Object.entries(grouped).map(([date, dayOrders]) => (
            <section key={date} className={styles.group}>
              <h3 className={styles.groupTitle}>{date}</h3>
              {dayOrders.map((order) => {
                const orderItems = order.items ?? [];
                const quantity = orderItems.reduce((total, item) => total + item.qty, 0);
                const canCancel = cancellableStatuses.has(order.status);
                const canRate = order.status === 'delivered';
                return (
                  <div key={order.id} className={styles.orderBlock}>
                    <OrderCard
                      items={orderItems.map((item, index) => ({
                        id: item.productId || `${order.id}-${index}`,
                        title: item.title,
                        image: item.image || fallbackImage,
                      }))}
                      shop={order.shop.name || 'Shop'}
                      date={order.createdAt}
                      status={order.status}
                      quantity={quantity}
                      total={order.totals.grand}
                      onCancel={canCancel ? () => handleCancel(order) : undefined}
                      onReorder={() => handleReorder(order)}
                      className={styles.card}
                    />
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        onClick={() => navigate(paths.orders.detail(order.id))}
                      >
                        View details
                      </button>
                      {canRate && (
                        <button type="button" onClick={() => handleRate(order)}>
                          Rate order
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;

