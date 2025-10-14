import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchReceivedOrders,
  selectReceivedOrders,
  updateServiceOrderStatus,
  type Order,
} from '@/store/orders';
import type { RootState, AppDispatch } from '@/store';
import { OrderCard } from '@/components/base';
import Shimmer from '@/components/Shimmer';
import showToast from '@/components/ui/Toast';
import { toErrorMessage } from '@/lib/response';
import fallbackImage from '@/assets/no-image.svg';
import styles from './ServiceOrders.module.scss';

const statuses = ['all', 'pending', 'accepted', 'cancelled', 'completed'] as const;

const ServiceOrders = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [status, setStatus] = useState<(typeof statuses)[number]>('all');
  const receivedState = useSelector((state: RootState) => state.orders.received);
  const orders = useSelector((state: RootState) =>
    selectReceivedOrders(state).filter((order) => order.type === 'service')
  );

  useEffect(() => {
    if (receivedState.status === 'idle') {
      dispatch(fetchReceivedOrders());
    }
  }, [dispatch, receivedState.status]);

  const filtered = orders.filter((order) =>
    status === 'all' ? true : order.status === status
  );

  const act = async (order: Order, action: 'accept' | 'reject') => {
    try {
      await dispatch(updateServiceOrderStatus({ id: order.id, action })).unwrap();
      showToast(`Order ${action}ed`, 'success');
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    }
  };

  const isLoading = receivedState.status === 'loading';

  return (
    <div className={styles.serviceOrders}>
      <h2>Service Orders</h2>
      <div className={styles.tabs}>
        {statuses.map((s) => (
          <button
            key={s}
            className={s === status ? styles.active : ''}
            onClick={() => setStatus(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
      {isLoading ? (
        [1, 2, 3].map((n) => (
          <Shimmer key={n} className={`${styles.card} shimmer rounded`} style={{ height: 80 }} />
        ))
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>No orders.</p>
      ) : (
        filtered.map((order) => {
          const orderItems = order.items ?? [];
          const quantity = orderItems.reduce((sum, item) => sum + item.qty, 0);
          return (
            <OrderCard
              key={order.id}
              items={orderItems.map((item, index) => ({
                id: item.productId || `${order.id}-${index}`,
                title: item.title,
                image: item.image || fallbackImage,
              }))}
              shop={order.customer.name || 'Customer'}
              date={order.createdAt}
              status={order.status}
              quantity={quantity}
              totalPaise={order.totals.grandPaise}
              phone={order.customer.phone || undefined}
              onCall={
                order.status === 'accepted' && order.customer.phone
                  ? () => (window.location.href = `tel:${order.customer.phone}`)
                  : undefined
              }
              onAccept={order.status === 'pending' ? () => act(order, 'accept') : undefined}
              onReject={order.status === 'pending' ? () => act(order, 'reject') : undefined}
            />
          );
        })
      )}
    </div>
  );
};

export default ServiceOrders;
