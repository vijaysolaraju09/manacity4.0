import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';

import {
  fetchReceivedOrders,
  selectOrdersByStatus,
  selectReceivedOrders,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from '@/store/orders';
import type { RootState, AppDispatch } from '@/store';
import Shimmer from '@/components/Shimmer';
import ErrorCard from '@/components/ui/ErrorCard';
import EmptyState from '@/components/ui/EmptyState';
import showToast from '@/components/ui/Toast';
import StatusChip from '@/components/ui/StatusChip';
import { Button } from '@/components/ui/button';
import { toErrorMessage } from '@/lib/response';
import { formatINR } from '@/utils/currency';
import { formatLocaleDateTime } from '@/utils/date';
import fallbackImage from '@/assets/no-image.svg';
import { paths } from '@/routes/paths';

import styles from './ReceivedOrders.module.scss';

const statusOptions: (OrderStatus | 'all')[] = [
  'all',
  'pending',
  'placed',
  'confirmed',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'rejected',
];

const statusDisplay: Record<OrderStatus | 'all', string> = {
  all: 'ALL',
  placed: 'PLACED',
  accepted: 'ACCEPTED',
  rejected: 'REJECTED',
  out_for_delivery: 'OUT FOR DELIVERY',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
  draft: 'DRAFT',
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  preparing: 'PREPARING',
  ready: 'READY',
  completed: 'COMPLETED',
  returned: 'RETURNED',
};

const ReceivedOrders = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [activeStatus, setActiveStatus] = useState<(typeof statusOptions)[number]>('all');
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, OrderStatus>>({});
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const receivedState = useSelector((state: RootState) => state.orders.received);
  const orders = useSelector((state: RootState) =>
    activeStatus === 'all'
      ? selectReceivedOrders(state)
      : selectOrdersByStatus(state, 'received', activeStatus as OrderStatus)
  );
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const canManageOrders = userRole === 'business' || userRole === 'admin';

  useEffect(() => {
    if (receivedState.status === 'idle') {
      dispatch(fetchReceivedOrders());
    }
  }, [dispatch, receivedState.status]);

  const isLoading = receivedState.status === 'loading';
  const isError = receivedState.status === 'failed';
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
    dispatch(fetchReceivedOrders());
  };

  if (!canManageOrders) {
    return (
      <div className={styles.guard}>
        <EmptyState
          title="Business access required"
          message="Only approved business accounts can review incoming orders. Visit your profile to request business verification."
          ctaLabel="Go to profile"
          onCtaClick={() => navigate(paths.profile())}
        />
      </div>
    );
  }

  const performStatusUpdate = async (
    order: Order,
    nextStatus: OrderStatus,
    {
      note,
      successMessage,
      confirmMessage,
    }: { note?: string; successMessage: string; confirmMessage?: string },
  ) => {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setOptimisticStatuses((current) => ({ ...current, [order.id]: nextStatus }));
    setPendingOrderId(order.id);

    try {
      await dispatch(updateOrderStatus({ id: order.id, status: nextStatus, note })).unwrap();
      showToast(successMessage, 'success');
    } catch (err) {
      setOptimisticStatuses((current) => {
        const copy = { ...current };
        delete copy[order.id];
        return copy;
      });
      showToast(toErrorMessage(err), 'error');
    } finally {
      setPendingOrderId(null);
      setOptimisticStatuses((current) => {
        const copy = { ...current };
        delete copy[order.id];
        return copy;
      });
    }
  };

  const handleAccept = (order: Order) =>
    performStatusUpdate(order, 'accepted', { successMessage: 'Order accepted' });

  const handleReject = (order: Order) => {
    const reason = window.prompt('Reason for rejecting this order:', '');
    if (reason === null) return;
    const note = reason.trim() || undefined;
    performStatusUpdate(order, 'rejected', {
      successMessage: 'Order rejected',
      note,
      confirmMessage: note ? undefined : 'Reject this order without a reason?',
    });
  };

  const handleOutForDelivery = (order: Order) =>
    performStatusUpdate(order, 'out_for_delivery', {
      successMessage: 'Marked as out for delivery',
      confirmMessage: 'Mark this order as out for delivery?',
    });

  const handleDelivered = (order: Order) =>
    performStatusUpdate(order, 'delivered', {
      successMessage: 'Order marked as delivered',
      confirmMessage: 'Confirm that this order has been delivered?',
    });

  const resolveStatus = (order: Order): OrderStatus =>
    optimisticStatuses[order.id] ?? order.status;

  const formatAddress = (order: Order) => {
    const address = order.shippingAddress;
    if (!address) {
      return 'No delivery address';
    }
    return [address.address1, address.address2, address.city, address.pincode]
      .filter((value) => typeof value === 'string' && value.trim())
      .join(', ');
  };

  const formatDateTime = (iso: string) =>
    formatLocaleDateTime(iso, { dateStyle: 'medium', timeStyle: 'short' });

  const itemsSummary = (order: Order) =>
    (order.items ?? []).map((item) => {
      const qtyRaw = Number(item.qty);
      const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;
      const price = formatINR(item.unitPricePaise);
      return `${qty} x ${item.title} — ${price}`;
    });

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
            {statusDisplay[status] || status.toUpperCase()}
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
                const orderItems = order.items ?? [];
                const quantity = orderItems.reduce((total, item) => total + item.qty, 0);
                const customerName = order.customer.name || 'Customer';
                const customerPhone = order.customer.phone;
                const currentStatus = resolveStatus(order);
                const isUpdating = pendingOrderId === order.id;
                const canAccept = ['pending', 'placed', 'confirmed'].includes(currentStatus);
                const canReject = ['pending', 'placed', 'confirmed'].includes(currentStatus);
                const canOutForDelivery =
                  currentStatus === 'accepted' ||
                  currentStatus === 'confirmed' ||
                  currentStatus === 'preparing' ||
                  currentStatus === 'ready';
                const canMarkDelivered = currentStatus === 'out_for_delivery';
                const summary = itemsSummary(order);
                return (
                  <div key={order.id} className={styles.orderBlock}>
                    <div className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div>
                          <p className={styles.orderId}>Order #{order.id}</p>
                          <p className={styles.meta}>
                            {formatDateTime(order.createdAt)} • {customerName}
                          </p>
                          {customerPhone ? (
                            <p className={styles.meta}>Phone: {customerPhone}</p>
                          ) : null}
                        </div>
                        <StatusChip status={currentStatus} />
                      </div>
                      <div className={styles.summaryRow}>
                        <div className={styles.summaryColumn}>
                          <p className={styles.summaryLabel}>Delivery address</p>
                          <p className={styles.summaryValue}>{formatAddress(order)}</p>
                        </div>
                        <div className={styles.summaryColumn}>
                          <p className={styles.summaryLabel}>Items</p>
                          <p className={styles.summaryValue}>{quantity}</p>
                        </div>
                        <div className={styles.summaryColumn}>
                          <p className={styles.summaryLabel}>Total</p>
                          <p className={styles.summaryValue}>{formatINR(order.totals.grandPaise)}</p>
                        </div>
                      </div>
                      <div className={styles.itemsList}>
                        {summary.map((line, index) => (
                          <span key={`${order.id}-item-${index}`}>{line}</span>
                        ))}
                      </div>
                      {(order.rating || order.review) ? (
                        <div className={styles.feedback}>
                          <div className={styles.feedbackHeader}>Customer feedback</div>
                          {order.rating ? (
                            <div className={styles.feedbackRating}>
                              <div className={styles.feedbackStars} aria-hidden="true">
                                {Array.from({ length: 5 }).map((_, index) => (
                                  <Star
                                    key={index}
                                    className={styles.feedbackStar}
                                    strokeWidth={1.5}
                                    fill={index < (order.rating ?? 0) ? 'currentColor' : 'none'}
                                  />
                                ))}
                              </div>
                              <span>{order.rating} / 5</span>
                            </div>
                          ) : null}
                          {order.review ? (
                            <p className={styles.feedbackComment}>{order.review}</p>
                          ) : null}
                        </div>
                      ) : null}
                      {order.notes ? (
                        <p className={styles.notes}>Customer note: {order.notes}</p>
                      ) : null}
                    </div>
                    <div className={styles.cardActions}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(paths.orders.detail(order.id))}
                      >
                        View details
                      </Button>
                      {canAccept && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAccept(order)}
                          disabled={isUpdating}
                        >
                          {isUpdating && resolveStatus(order) === 'accepted' ? 'Updating…' : 'Accept'}
                        </Button>
                      )}
                      {canReject && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(order)}
                          disabled={isUpdating}
                          className={styles.danger}
                        >
                          Reject
                        </Button>
                      )}
                      {canOutForDelivery && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOutForDelivery(order)}
                          disabled={isUpdating}
                        >
                          {isUpdating && resolveStatus(order) === 'out_for_delivery'
                            ? 'Updating…'
                            : 'Out for delivery'}
                        </Button>
                      )}
                      {canMarkDelivered && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleDelivered(order)}
                          disabled={isUpdating}
                        >
                          {isUpdating && resolveStatus(order) === 'delivered' ? 'Updating…' : 'Delivered'}
                        </Button>
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

