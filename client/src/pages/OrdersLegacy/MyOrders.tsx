import { useEffect, useMemo, useState, type FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import showToast from '@/components/ui/Toast';
import { formatINR } from '@/utils/currency';
import { formatLocaleDateTime } from '@/utils/date';
import type { AppDispatch, RootState } from '@/store';
import { fetchMyOrders, selectMyOrders, type Order, type OrderStatus } from '@/store/orders';

type OrderTab = 'all' | 'accepted' | 'rejected';

const TABS: { key: OrderTab; label: string; statuses?: OrderStatus[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'accepted', label: 'Accepted', statuses: ['accepted', 'confirmed', 'delivered', 'completed'] },
  { key: 'rejected', label: 'Rejected', statuses: ['rejected', 'cancelled'] },
];

const normalizeTabFromState = (state: unknown): { tab?: OrderTab; orderId?: string } => {
  if (!state || typeof state !== 'object') return {};
  const payload = state as { tab?: string; status?: string; orderId?: string };
  const desiredTab = payload.tab as OrderTab | undefined;
  if (desiredTab && TABS.some((tab) => tab.key === desiredTab)) {
    return { tab: desiredTab, orderId: payload.orderId };
  }
  if (payload.status) {
    if (payload.status === 'accepted' || payload.status === 'confirmed' || payload.status === 'delivered' || payload.status === 'completed') {
      return { tab: 'accepted', orderId: payload.orderId };
    }
    if (payload.status === 'rejected' || payload.status === 'cancelled') {
      return { tab: 'rejected', orderId: payload.orderId };
    }
  }
  return { orderId: payload.orderId };
};

const buildItemsSummary = (order: Order): string => {
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return 'No items available';
  }
  return order.items
    .map((item) => `${item.qty} × ${item.title}`)
    .slice(0, 3)
    .join(', ');
};

const buildAddressSummary = (order: Order): string | null => {
  const address = order.shippingAddress;
  if (!address) return null;
  const fields = [address.name, address.address1, address.address2, address.city, address.pincode]
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value?.trim());
  if (fields.length === 0) return null;
  return fields.join(', ');
};

const MyOrders: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const orders = useSelector(selectMyOrders);
  const mineState = useSelector((state: RootState) => state.orders.mine);
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (mineState.status === 'idle') {
      dispatch(fetchMyOrders());
    }
  }, [dispatch, mineState.status]);

  useEffect(() => {
    const { tab, orderId } = normalizeTabFromState(location.state);
    if (tab) {
      setActiveTab(tab);
    }
    if (orderId) {
      setFocusedOrderId(orderId);
    }
  }, [location.state]);

  useEffect(() => {
    if (!focusedOrderId) return;
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`order-card-${focusedOrderId}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [focusedOrderId, orders]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') {
      return orders;
    }
    const statuses = TABS.find((tab) => tab.key === activeTab)?.statuses;
    if (!statuses) return orders;
    return orders.filter((order) => statuses.includes(order.status));
  }, [orders, activeTab]);

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  useEffect(() => {
    if (mineState.status === 'failed' && mineState.error) {
      showToast(mineState.error, 'error');
    }
  }, [mineState.status, mineState.error]);

  const isLoading = mineState.status === 'loading' && orders.length === 0;

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Track the status of your recent purchases and service bookings.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-slate-900 text-white shadow'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <section className="flex flex-col gap-4">
        {isLoading ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Loading your orders…
          </p>
        ) : filteredOrders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            No orders found for this filter.
          </p>
        ) : (
          filteredOrders.map((order) => {
            const summary = buildItemsSummary(order);
            const amount = formatINR(order.totals?.grandPaise ?? 0);
            const placedOn = formatLocaleDateTime(order.createdAt, {
              dateStyle: 'medium',
              timeStyle: 'short',
            });
            const address = buildAddressSummary(order);
            const isFocused = focusedOrderId === order.id;
            return (
              <article
                key={order.id}
                id={`order-card-${order.id}`}
                className={`flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isFocused ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleViewOrder(order)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-600">{order.shop?.name ?? 'Shop'}</span>
                    <h3 className="text-lg font-semibold text-slate-900">Order #{order.id.slice(-6)}</h3>
                    <p className="text-sm text-slate-500">{summary}</p>
                    <p className="text-xs text-slate-400">Placed {placedOn}</p>
                    {address ? <p className="text-xs text-slate-500">Deliver to: {address}</p> : null}
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <span className="text-xs uppercase text-slate-500">Total</span>
                    <span className="text-xl font-semibold text-slate-900">{amount}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleViewOrder(order)}>
                      View details
                    </Button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Order #{selectedOrder.id}</h2>
                <p className="text-sm text-slate-500">
                  Placed on {formatLocaleDateTime(selectedOrder.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>

            <div className="mt-6 space-y-4">
              <section>
                <h3 className="text-base font-semibold text-slate-900">Items</h3>
                <ul className="mt-2 space-y-2">
                  {selectedOrder.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between text-sm text-slate-600">
                      <span className="max-w-[70%] truncate">
                        {item.qty} × {item.title}
                      </span>
                      <span className="font-semibold text-slate-800">{formatINR(item.subtotalPaise)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold text-slate-900">Summary</h3>
                <dl className="mt-2 space-y-1 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <dt>Items total</dt>
                    <dd>{formatINR(selectedOrder.totals?.itemsPaise ?? 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Tax</dt>
                    <dd>{formatINR(selectedOrder.totals?.taxPaise ?? 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Shipping</dt>
                    <dd>{formatINR(selectedOrder.totals?.shippingPaise ?? 0)}</dd>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-slate-900">
                    <dt>Total paid</dt>
                    <dd>{formatINR(selectedOrder.totals?.grandPaise ?? 0)}</dd>
                  </div>
                </dl>
              </section>

              <section>
                <h3 className="text-base font-semibold text-slate-900">Status</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Current status: {selectedOrder.status.replace(/_/g, ' ')}
                </p>
                {selectedOrder.timeline?.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-500">
                    {selectedOrder.timeline.map((entry) => (
                      <li key={`${entry.status}-${entry.at}`}>
                        {formatLocaleDateTime(entry.at, { dateStyle: 'medium', timeStyle: 'short' })} —{' '}
                        {entry.status.replace(/_/g, ' ')}
                        {entry.note ? ` (${entry.note})` : ''}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>

              <section>
                <h3 className="text-base font-semibold text-slate-900">Delivery</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {buildAddressSummary(selectedOrder) ?? 'Pickup at store or address unavailable.'}
                </p>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default MyOrders;
