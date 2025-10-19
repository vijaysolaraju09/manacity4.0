import { useEffect, useState } from 'react';
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
        <Card className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-12 text-center shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
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
          <OrderListItem
            key={order.id}
            order={order}
            onView={() => navigate(paths.orders.detail(order.id))}
            onTrack={handleTrack}
            onInvoice={handleInvoice}
            onReorder={() => handleReorder(order)}
            onCancel={cancellableStatuses.has(order.status) ? () => handleCancel(order) : undefined}
            onReturn={order.status === 'delivered' ? handleReturn : undefined}
          />
        ))}
      </div>
    );
  };

  if (isError) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <ErrorCard title="Unable to load orders" message={mineState.error ?? 'Please retry in a moment.'} onRetry={handleRetry} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
        <header className="flex flex-col gap-4 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">My orders</h1>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Track your deliveries, download invoices and rate your experiences.
              </p>
            </div>
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm text-slate-500 shadow-sm dark:bg-slate-900/70 dark:text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Syncing latest orders…
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 rounded-3xl border border-slate-200/80 bg-white/90 p-2 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/70">
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveStatus(status)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  activeStatus === status
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                {statusLabels[status]}
              </button>
            ))}
          </div>
        </header>

        {isLoading && ordersList.length === 0 ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-40 rounded-3xl border border-slate-200/70 bg-white/80 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/70" />
            ))}
          </div>
        ) : (
          renderOrders()
        )}
      </div>
    </main>
  );
};

export default MyOrders;
