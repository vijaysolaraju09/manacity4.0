import { useEffect, useMemo, useState, type FC } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import showToast from '@/components/ui/Toast';
import type { AppDispatch, RootState } from '@/store';
import {
  fetchReceivedOrders,
  respondToReceivedOrder,
  selectReceivedOrders,
  type Order,
} from '@/store/orders';
import { formatINR } from '@/utils/currency';
import { sendNotification } from '@/store/notifs';

type ActionType = 'accepted' | 'rejected';

const ReceivedOrders: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const receivedState = useSelector((state: RootState) => state.orders.received);
  const orders = useSelector(selectReceivedOrders);
  const [modalOrder, setModalOrder] = useState<Order | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (receivedState.status === 'idle') {
      dispatch(fetchReceivedOrders());
    }
  }, [dispatch, receivedState.status]);

  useEffect(() => {
    if (receivedState.status === 'failed' && receivedState.error) {
      showToast(receivedState.error, 'error');
    }
  }, [receivedState.status, receivedState.error]);

  const incomingOrders = useMemo(() => {
    return orders.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const openActionModal = (order: Order, type: ActionType) => {
    setModalOrder(order);
    setActionType(type);
    setNote('');
  };

  const closeActionModal = () => {
    setModalOrder(null);
    setActionType(null);
    setNote('');
  };

  const handleConfirmAction = async () => {
    if (!modalOrder || !actionType || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const updated = await dispatch(
        respondToReceivedOrder({ id: modalOrder.id, status: actionType, note: note.trim() || undefined }),
      ).unwrap();

      const statusLabel = actionType === 'accepted' ? 'accepted' : 'rejected';
      showToast(`Order ${statusLabel} successfully.`, 'success');

      const userId = updated.customer?.id ?? modalOrder.customer?.id;
      if (userId) {
        const shopName = updated.shop?.name ?? modalOrder.shop?.name ?? 'Your order';
        const message =
          actionType === 'accepted'
            ? `${shopName} has accepted your order.`
            : `${shopName} has ${statusLabel} your order.`;
        try {
          await dispatch(
            sendNotification({
              userId,
              type: 'order',
              message,
              metadata: { orderId: updated.id, status: actionType, note: note.trim() || undefined },
            }),
          ).unwrap();
        } catch (err) {
          // Notification failures shouldn't block the workflow but should inform the user
          const messageError =
            err instanceof Error && err.message
              ? err.message
              : 'Failed to notify the customer about this update.';
          showToast(messageError, 'error');
        }
      }

      closeActionModal();
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Unable to update the order status. Please try again.';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAddress = (order: Order) => {
    const address = order.shippingAddress;
    if (!address) {
      return 'No shipping address provided.';
    }
    return [address.name, address.address1, address.address2, address.city, address.pincode]
      .filter((value) => typeof value === 'string' && value.trim())
      .map((value) => value?.trim())
      .join(', ');
  };

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Received Orders</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Monitor incoming orders for your business and manage fulfillment workflows.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        {receivedState.status === 'loading' && incomingOrders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Loading incoming orders…
          </p>
        ) : incomingOrders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            You haven't received any orders yet.
          </p>
        ) : (
          incomingOrders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-lg font-semibold text-slate-900">Order #{order.id.slice(-6)}</h2>
                    <p className="text-sm text-slate-600">
                      {order.customer?.name ?? 'Customer'} • {order.customer?.phone ?? 'No phone'}
                    </p>
                    <p className="text-xs text-slate-500">Received on {new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <span className="text-xs uppercase text-slate-500">Total</span>
                    <span className="text-xl font-semibold text-slate-900">{formatINR(order.totals?.grandPaise ?? 0)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-700">Products</h3>
                  <div className="mt-3 space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">{item.title}</span>
                        <span>Qty: {item.qty}</span>
                        <span>{formatINR(item.subtotalPaise)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-700">Delivery address</h3>
                  <p className="mt-2 text-sm text-slate-600">{renderAddress(order)}</p>
                </div>

                {order.notes ? (
                  <div className="rounded-xl bg-amber-50 p-4">
                    <h3 className="text-sm font-semibold text-amber-700">Customer notes</h3>
                    <p className="mt-2 text-sm text-amber-700">{order.notes}</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="success"
                    size="sm"
                    onClick={() => openActionModal(order, 'accepted')}
                    disabled={order.status === 'accepted'}
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => openActionModal(order, 'rejected')}
                    disabled={order.status === 'rejected'}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {modalOrder && actionType ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-slate-900">
              {actionType === 'accepted' ? 'Accept order' : 'Reject order'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Add an optional note that will be shared with the customer.
            </p>
            <Textarea
              className="mt-4 min-h-[120px] resize-none"
              placeholder="Add note (optional)"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={closeActionModal} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="button" onClick={handleConfirmAction} disabled={isSubmitting}>
                {isSubmitting ? 'Saving…' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default ReceivedOrders;
