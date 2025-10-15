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
import { clearCart, addItem } from '@/store/slices/cartSlice';
import { OrderCard } from '@/components/base';
import ErrorCard from '@/components/ui/ErrorCard';
import SkeletonList from '@/components/ui/SkeletonList';
import Empty from '@/components/common/Empty';
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
  'rejected',
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
  rejected: 'Rejected',
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

  const ordersList = orders ?? [];
  const isLoading = mineState.status === 'loading';
  const isError = mineState.status === 'failed';
  const showSkeleton = isLoading && ordersList.length === 0;

  const grouped = useMemo(() => {
    return ordersList.reduce<Record<string, Order[]>>((acc, order) => {
      const date = new Date(order.createdAt).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(order);
      return acc;
    }, {});
  }, [ordersList]);

  const handleRetry = () => {
    dispatch(fetchMyOrders());
  };

  const handleReorder = (order: Order) => {
    dispatch(clearCart());
    (order.items ?? []).forEach((item) => {
      const productId = item.productId || item.id;
      if (!productId) return;
      const qty = Number.isFinite(item.qty) && item.qty > 0 ? Math.floor(item.qty) : 1;
      dispatch(
        addItem({
          productId: String(productId),
          shopId: String(order.shop.id),
          name: item.title,
          pricePaise: Math.max(0, item.unitPricePaise),
          qty,
          image: item.image || undefined,
        }),
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
          <SkeletonList count={3} lines={2} withAvatar />
        </div>
      )}

      {isError && !showSkeleton && (
        <ErrorCard
          message={mineState.error || 'We could not load your orders.'}
          onRetry={handleRetry}
        />
      )}

      {!isLoading && !isError && ordersList.length === 0 && (
        <Empty
          msg="When you place an order, it will show up here so you can track it easily."
          ctaText="Browse shops"
          onCta={() => navigate(paths.shops())}
        />
      )}

      {!isLoading && !isError && ordersList.length > 0 && (
        <div className={styles.groups}>
          {Object.entries(grouped).map(([date, dayOrders]) => (
            <section key={date} className={styles.group}>
              <h3 className={styles.groupTitle}>{date}</h3>
              {(dayOrders ?? []).map((order) => {
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
                      totalPaise={order.totals.grandPaise}
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

