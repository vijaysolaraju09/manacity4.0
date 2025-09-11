import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReceivedOrders, updateServiceOrderStatus } from '@/store/orders';
import type { RootState, AppDispatch } from '@/store';
import { OrderCard } from '@/components/base';
import Shimmer from '@/components/Shimmer';
import showToast from '@/components/ui/Toast';
import styles from './ServiceOrders.module.scss';

const statuses = ['all', 'pending', 'accepted', 'cancelled', 'completed'] as const;

const ServiceOrders = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [status, setStatus] = useState<(typeof statuses)[number]>('all');
  const { status: loadStatus } = useSelector((s: RootState) => s.orders.received);
  const orders = useSelector((state: RootState) => {
    const all = (state.orders.received.ids as string[]).map(
      (id) => state.orders.received.entities[id]!
    );
    const services = all.filter((o: any) => o.type === 'service');
    return status === 'all' ? services : services.filter((o: any) => o.status === status);
  }) as any[];

  useEffect(() => {
    dispatch(fetchReceivedOrders());
  }, [dispatch]);

  const act = async (id: string, action: 'accept' | 'reject') => {
    try {
      await dispatch(updateServiceOrderStatus({ id, action })).unwrap();
      showToast(`Order ${action}ed`, 'success');
    } catch {
      showToast(`Failed to ${action} order`, 'error');
    }
  };

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
      {loadStatus === 'loading' ? (
        [1, 2, 3].map((n) => (
          <Shimmer
            key={n}
            className={`${styles.card} shimmer rounded`}
            style={{ height: 80 }}
          />
        ))
      ) : orders.length === 0 ? (
        <p className={styles.empty}>No orders.</p>
      ) : (
        orders.map((o) => (
          <OrderCard
            key={o._id}
            items={o.items.map((i: any) => ({
              id: i.productId || i.name || o._id,
              title: i.name || 'Service',
              image: i.image || ''
            }))}
            shop={o.customerId.name}
            date={o.createdAt}
            status={o.status}
            quantity={o.items.reduce((s: number, it: any) => s + it.quantity, 0)}
            total={o.totals.total}
            phone={o.customerId.phone}
            onCall={
              o.status === 'accepted' && o.customerId.phone
                ? () => (window.location.href = `tel:${o.customerId.phone}`)
                : undefined
            }
            onAccept={o.status === 'pending' ? () => act(o._id, 'accept') : undefined}
            onReject={o.status === 'pending' ? () => act(o._id, 'reject') : undefined}
          />
        ))
      )}
    </div>
  );
};

export default ServiceOrders;
