import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import OrderListItem from '@/features/orders/components/OrderListItem';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ErrorCard from '@/components/ui/ErrorCard';
import showToast from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import fallbackImage from '@/assets/no-image.svg';
import { paths } from '@/routes/paths';
import type { RootState, AppDispatch } from '@/store';
import {
  cancelOrder,
  fetchMyOrders,
  selectMyOrders,
  selectOrdersByStatus,
  type Order,
  type OrderStatus,
} from '@/store/orders';
import { clearCart, addItem } from '@/store/slices/cartSlice';
import styles from '@/styles/PageShell.module.scss';

const statusOptions: (OrderStatus | 'all')[] = [
  'all',
  'placed',
  'confirmed',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
];

const statusLabels: Record<OrderStatus | 'all', string> = {
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

const cancellableStatuses = new Set<OrderStatus>(['pending', 'placed', 'confirmed', 'accepted', 'preparing']);

const sectionMotion = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
} as const;

const MyOrders = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<(typeof statusOptions)[number]>('all');

  const mineState = useSelector((state: RootState) => state.orders.mine);
  const orders = useSelector((state: RootState) =>
    activeStatus === 'all'
      ? selectMyOrders(state)
      : selectOrdersByStatus(state, 'mine', activeStatus as OrderStatus),
  );

  useEffect(() => {
    if (mineState.status === 'idle') {
      dispatch(fetchMyOrders());
    }
  }, [dispatch, mineState.status]);

  const ordersList = orders ?? [];
  const isLoading = mineState.status === 'loading';
  const isError = mineState.status === 'failed';

  const handleRetry = () => {
    dispatch(fetchMyOrders());
  };

  const handleReorder = (order: Order) => {
    dispatch(clearCart());
    (order.items ?? []).forEach((item, index) => {
      const productId = item.productId || item.id || `${order.id}-${index}`;
      const qty = Number.isFinite(item.qty) && item.qty > 0 ? Math.floor(item.qty) : 1;
      dispatch(
        addItem({
          productId,
          shopId: order.shop?.id ?? 'shop',
          name: item.title,
          pricePaise: item.unitPricePaise,
          qty,
          image: item.image || fallbackImage,
        }),
      );
    });
    showToast('Items added to cart. Redirecting to cart…', 'success');
    navigate(paths.cart());
  };

  const handleCancel = async (order: Order) => {
    const reason = window.prompt('Tell us why you are cancelling this order:', '');
    if (reason === null) return;
    try {
      await dispatch(cancelOrder({ id: order.id, reason: reason || undefined })).unwrap();
      showToast('Order cancelled', 'success');
    } catch (err) {
      showToast((err as Error)?.message ?? 'Could not cancel order', 'error');
    }
  };

  const handleInvoice = () => {
    showToast('Invoice download will be available soon.', 'info');
  };

  const handleTrack = () => {
    showToast('Live tracking is coming soon.', 'info');
  };

  const handleReturn = () => {
    showToast('Return flow coming soon.', 'info');
  };

  const renderOrders = () => {
    if (ordersList.length === 0) {
      return (
        <Card className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-500/10 via-white/90 to-white/70 p-12 text-center shadow-2xl shadow-indigo-200/40 backdrop-blur-xl dark:border-indigo-500/30 dark:bg-slate-950/70 dark:shadow-indigo-900/40">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">No orders yet</h2>
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-300">
            Explore products from neighbourhood shops and place your first order. We will keep a premium track of every purchase here.
          </p>
          <Button type="button" className="rounded-full px-6 py-2 text-sm font-semibold" onClick={() => navigate(paths.home?.() ?? '/')}>Browse products</Button>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {ordersList.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <OrderListItem
              order={order}
              onView={() => navigate(paths.orders.detail(order.id))}
              onTrack={handleTrack}
              onInvoice={handleInvoice}
              onReorder={() => handleReorder(order)}
              onCancel={cancellableStatuses.has(order.status) ? () => handleCancel(order) : undefined}
              onReturn={order.status === 'delivered' ? handleReturn : undefined}
            />
          </motion.div>
        ))}
      </div>
    );
  };

  if (isError) {
    return (
      <main className={cn(styles.pageShell, 'bg-transparent text-slate-900 dark:text-slate-100')}>
        <div className={cn(styles.pageShell__inner, 'mx-auto max-w-6xl px-4 py-16 sm:px-6')}>
          <ErrorCard title="Unable to load orders" message={mineState.error ?? 'Please retry in a moment.'} onRetry={handleRetry} />
        </div>
      </main>
    );
  }

  return (
    <main className={cn(styles.pageShell, 'bg-transparent text-slate-900 dark:text-slate-100')}>
      <div className={cn(styles.pageShell__inner, 'mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6')}>
        <motion.header
          initial={sectionMotion.initial}
          animate={sectionMotion.animate}
          transition={sectionMotion.transition}
          className="flex flex-col gap-6 pb-10"
        >
          <div className="flex flex-col gap-6 rounded-3xl border border-indigo-200/60 bg-gradient-to-br from-indigo-500/15 via-white/90 to-white/70 p-6 shadow-2xl shadow-indigo-200/40 backdrop-blur-xl dark:border-indigo-500/30 dark:bg-slate-950/70 dark:shadow-indigo-900/40">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">My orders</h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Track deliveries, download invoices and rate your neighbourhood shopping experiences.
                </p>
              </div>
              {isLoading ? (
                <div className="flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Syncing orders…
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 rounded-3xl border border-indigo-200/60 bg-white/90 p-2 shadow-xl shadow-indigo-200/40 dark:border-indigo-500/30 dark:bg-slate-900/70">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveStatus(status)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500',
                    activeStatus === status
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-400/40 dark:bg-indigo-500 dark:shadow-indigo-900/50'
                      : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800',
                  )}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>
        </motion.header>

        <motion.div
          initial={sectionMotion.initial}
          animate={sectionMotion.animate}
          transition={{ ...sectionMotion.transition, delay: 0.05 }}
        >
          {isLoading && ordersList.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-40 rounded-3xl border border-slate-200/70 bg-white/80 shadow-xl shadow-slate-200/60 dark:border-slate-800/70 dark:bg-slate-900/70"
                />
              ))}
            </div>
          ) : (
            renderOrders()
          )}
        </motion.div>
      </div>
    </main>
  );
};

export default MyOrders;
