import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchReceivedOrders,
  selectOrdersByStatus,
  selectReceivedOrders,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from '@/store/orders';
import type { RootState, AppDispatch } from '@/store';
import { OrderCard } from '@/components/base';
import Shimmer from '@/components/Shimmer';
import ErrorCard from '@/components/ui/ErrorCard';
import EmptyState from '@/components/ui/EmptyState';
import showToast from '@/components/ui/Toast';
import fallbackImage from '@/assets/no-image.svg';
import styles from './ReceivedOrders.module.scss';
import { paths } from '@/routes/paths';
import { useNavigate } from 'react-router-dom';

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

const nextStatusMap: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  placed: { status: 'confirmed', label: 'Confirm order' },
  confirmed: { status: 'preparing', label: 'Start preparing' },
  preparing: { status: 'ready', label: 'Mark ready' },
  ready: { status: 'out_for_delivery', label: 'Out for delivery' },
  out_for_delivery: { status: 'delivered', label: 'Mark delivered' },
};

const shopCancellable = new Set<OrderStatus>([
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
]);

const ReceivedOrders = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<(typeof statusOptions)[number]>('all');

  const receivedState = useSelector((state: RootState) => state.orders.received);
  const orders = useSelector((state: RootState) =>
    activeStatus === 'all'
      ? selectReceivedOrders(state)
      : selectOrdersByStatus(state, 'received', activeStatus as OrderStatus)
  );

  useEffect(() => {
    if (receivedState.status === 'idle') {
      dispatch(fetchReceivedOrders());
    }
  }, [dispatch, receivedState.status]);

  const isLoading = receivedState.status === 'loading';
  const isError = receivedState.status === 'failed';
  const showSkeleton = isLoading && orders.length === 0;

  const grouped = useMemo(() => {
    return orders.reduce<Record<string, Order[]>>((acc, order) => {
      const date = new Date(order.createdAt).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(order);
      return acc;
    }, {});
  }, [orders]);

  const handleRetry = () => {
    dispatch(fetchReceivedOrders());
  };

  const handleUpdateStatus = async (order: Order, status: OrderStatus) => {
    const notePrompt = status === 'cancelled'
      ? 'Reason for cancelling this order:'
      : 'Add a note for the customer (optional):';
    const note = window.prompt(notePrompt, '');
    if (status === 'cancelled' && note === null) return;
    try {
      await dispatch(
        updateOrderStatus({ id: order.id, status, note: note ? note.trim() : undefined })
      ).unwrap();
      showToast('Order updated', 'success');
    } catch (err) {
      showToast((err as Error)?.message || 'Failed to update order', 'error');
    }
  };

  return (
    <div className={styles.receivedOrders}>
      <div className={styles.header}>
        <h2>Received Orders</h2>
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
          message={receivedState.error || 'We could not load your received orders.'}
          onRetry={handleRetry}
        />
      )}

      {!isLoading && !isError && orders.length === 0 && (
        <EmptyState
          image={fallbackImage}
          title="No orders yet"
          message="Orders from your shop will appear here so you can manage them easily."
        />
      )}

      {!isLoading && !isError && orders.length > 0 && (
        <div className={styles.groups}>
          {Object.entries(grouped).map(([date, dayOrders]) => (
            <section key={date} className={styles.group}>
              <h3 className={styles.groupTitle}>{date}</h3>
              {dayOrders.map((order) => {
                const quantity = order.items.reduce((total, item) => total + item.qty, 0);
                const nextAction = nextStatusMap[order.status];
                const canCancel = shopCancellable.has(order.status);
                const customerName = order.customer.name || 'Customer';
                const customerPhone = order.customer.phone;
                return (
                  <div key={order.id} className={styles.orderBlock}>
                    <OrderCard
                      items={order.items.map((item, index) => ({
                        id: item.productId || `${order.id}-${index}`,
                        title: item.title,
                        image: item.image || fallbackImage,
                      }))}
                      shop={customerName}
                      phone={customerPhone || undefined}
                      onCall={customerPhone ? () => (window.location.href = `tel:${customerPhone}`) : undefined}
                      date={order.createdAt}
                      status={order.status}
                      quantity={quantity}
                      total={order.totals.grand}
                      className={styles.card}
                    />
                    <div className={styles.cardActions}>
                      <button type="button" onClick={() => navigate(paths.orders.detail(order.id))}>
                        View details
                      </button>
                      {nextAction && (
                        <button type="button" onClick={() => handleUpdateStatus(order, nextAction.status)}>
                          {nextAction.label}
                        </button>
                      )}
                      {canCancel && order.status !== 'cancelled' && (
                        <button type="button" onClick={() => handleUpdateStatus(order, 'cancelled')}>
                          Cancel order
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

export default ReceivedOrders;

