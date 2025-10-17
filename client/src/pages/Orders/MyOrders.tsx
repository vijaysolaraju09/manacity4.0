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
import ErrorCard from '@/components/ui/ErrorCard';
import Empty from '@/components/common/Empty';
import showToast from '@/components/ui/Toast';
import { toErrorMessage } from '@/lib/response';
import fallbackImage from '@/assets/no-image.svg';
import { paths } from '@/routes/paths';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR } from '@/utils/currency';
import { cn } from '@/lib/utils';

import './MyOrders.scss';

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

const statusStyles: Record<OrderStatus, string> = {
  draft: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100',
  placed: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  confirmed: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200',
  accepted: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-100',
  preparing: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-100',
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100',
  out_for_delivery: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-100',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-100',
  completed: 'bg-green-200 text-green-800 dark:bg-green-500/30 dark:text-green-100',
  cancelled: 'bg-slate-300 text-slate-800 dark:bg-slate-700 dark:text-slate-100',
  returned: 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-100',
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return new Date(value).toLocaleString();
  }
};

const StatusBadge = ({ status }: { status: OrderStatus }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
      statusStyles[status] ?? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    )}
  >
    {statusDisplay[status] ?? status}
  </span>
);

const OrdersSkeleton = () => (
  <div className="orders-page__skeleton space-y-4">
    <Skeleton className="h-10 w-40 rounded-full" />
    {Array.from({ length: 3 }).map((_, index) => (
      <Skeleton key={index} className="h-44 w-full rounded-2xl" />
    ))}
  </div>
);

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
  const showSkeleton = isLoading && ordersList.length === 0;

  const grouped = useMemo(() => {
    return ordersList.reduce<Record<string, Order[]>>((acc, order) => {
      const key = formatDate(order.createdAt).split(',')[0] ?? 'Recent orders';
      if (!acc[key]) acc[key] = [];
      acc[key].push(order);
      return acc;
    }, {});
  }, [ordersList]);

  const handleRetry = () => {
    dispatch(fetchMyOrders());
  };

  const handleReorder = (order: Order) => {
    dispatch(clearCart());
    (order.items ?? []).forEach((item, index) => {
      const productId = item.productId || item.id || `${order.id}-${index}`;
      const qtySource = Number(item.qty);
      const qty = Number.isFinite(qtySource) && qtySource > 0 ? Math.floor(qtySource) : 1;
      if (!productId) return;
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
    <main className="orders-page">
      <div className="orders-page__container mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div className="orders-page__intro space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">My orders</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track your recent purchases, manage cancellations, and check delivery progress.
          </p>
        </div>

        <div className="orders-page__filters flex flex-wrap gap-2" role="tablist" aria-label="Filter orders by status">
          {(statusOptions ?? []).map((status) => {
            const isActive = status === activeStatus;
            return (
              <button
                key={status}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn(
                'orders-page__filter rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600',
                isActive
                  ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
              onClick={() => setActiveStatus(status)}
            >
              {statusDisplay[status] ?? status}
            </button>
          );
        })}
        </div>

        {showSkeleton && <OrdersSkeleton />}

        {isError && !showSkeleton ? (
          <ErrorCard
            message={mineState.error || 'We could not load your orders.'}
            onRetry={handleRetry}
          />
        ) : null}

        {!isLoading && !isError && ordersList.length === 0 ? (
          <Empty
            msg="When you place an order, it will show up here so you can track it easily."
            ctaText="Browse shops"
            onCta={() => navigate(paths.shops())}
          />
        ) : null}

        {!isLoading && !isError && ordersList.length > 0 ? (
          <div className="orders-page__groups space-y-8">
            {Object.entries(grouped).map(([date, dayOrders]) => (
              <section key={date} className="orders-page__group space-y-4">
                <h2 className="orders-page__group-heading text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {date}
                </h2>
                <div className="orders-page__cards space-y-4">
                  {(dayOrders ?? []).map((order) => {
                  const orderItems = order.items ?? [];
                  const quantity = orderItems.reduce((total, item) => {
                    const itemQty = Number(item.qty);
                    return total + (Number.isFinite(itemQty) ? itemQty : 0);
                  }, 0);
                  const canCancel = cancellableStatuses.has(order.status);
                  const canRate = order.status === 'delivered' || order.status === 'completed';
                  const totalDisplay = formatINR(order.totals?.grandPaise ?? 0);
                  const formattedDate = formatDate(order.createdAt);

                  return (
                    <Card key={order.id} className="orders-page__card overflow-hidden border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                      <CardHeader className="orders-page__card-header flex flex-col gap-2 border-b border-slate-100 pb-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                            {order.shop.name || 'Shop'}
                          </CardTitle>
                          <CardDescription className="text-sm text-slate-600 dark:text-slate-400">
                            Placed on {formattedDate}
                          </CardDescription>
                        </div>
                        <StatusBadge status={order.status} />
                      </CardHeader>
                      <CardContent className="orders-page__card-content space-y-4">
                        <div className="flex flex-wrap gap-3">
                          {orderItems.slice(0, 3).map((item, index) => (
                            <div
                              key={item.productId || item.id || `${order.id}-${index}`}
                              className="flex items-center gap-3 rounded-xl bg-slate-50/80 p-2 pr-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800/60 dark:ring-slate-700"
                            >
                              <img
                                src={item.image || fallbackImage}
                                alt={item.title}
                                className="h-10 w-10 rounded-lg object-cover"
                              />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.title}</span>
                            </div>
                          ))}
                          {orderItems.length > 3 ? (
                            <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              +{orderItems.length - 3} more
                            </span>
                          ) : null}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Items
                            </p>
                            <p className="text-sm text-slate-900 dark:text-slate-100">{quantity || 0} item(s)</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Order total
                            </p>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{totalDisplay}</p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="orders-page__card-footer flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 py-4 dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Order ID: {order.id}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(paths.orders.detail(order.id))}
                          >
                            View details
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => handleReorder(order)}>
                            Reorder
                          </Button>
                          {canRate ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRate(order)}>
                              Rate order
                            </Button>
                          ) : null}
                          {canCancel ? (
                            <Button type="button" variant="destructive" size="sm" onClick={() => handleCancel(order)}>
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
      </div>
    </main>
  );
};

export default MyOrders;
