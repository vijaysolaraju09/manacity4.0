import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import api from '@/utils/api';
import { fetchReceivedOrders } from '@/store/orders';

export default function ReceivedOrders() {
  const dispatch = useAppDispatch();
  const receivedState = useAppSelector((s) => s.orders.received);
  const received = receivedState.ids.map((id) => receivedState.entities[id]) as any[];
  const [modal, setModal] = useState<{ id: string; action: 'accepted' | 'rejected' } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (receivedState.status === 'idle') {
      void dispatch(fetchReceivedOrders());
    }
  }, [dispatch, receivedState.status]);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-3">Received Orders</h1>
      <div className="grid gap-3">
        {(received ?? []).map((o: any) => (
          <div key={o._id || o.id} className="rounded-xl border border-borderc/40 bg-surface-1 p-4 shadow-inner-card">
            <div className="font-medium">{o.user?.name} • {o.user?.phone}</div>
            <div className="text-sm text-text-muted">Address: {o.shippingAddress?.address1}</div>
            <ul className="mt-2 text-sm list-disc pl-5">
              {(o.items ?? []).map((it: any) => (
                <li key={it.productId}>{it.name} × {it.qty} — ₹{it.price}</li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button className="btn btn-success btn-sm" onClick={() => setModal({ id: o._id || o.id, action: 'accepted' })} type="button">
                Accept
              </button>
              <button className="btn btn-error btn-sm" onClick={() => setModal({ id: o._id || o.id, action: 'rejected' })} type="button">
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold mb-2">{modal.action === 'accepted' ? 'Accept' : 'Reject'} order</h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)"
              className="textarea textarea-bordered w-full"
            />
            <div className="modal-action">
              <button className="btn" onClick={() => setModal(null)} type="button">
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    await api.patch(`/api/business/orders/${modal.id}`, { status: modal.action, note });
                    try {
                      await api.post(`/api/notifications`, {
                        userId: 'resolve-from-order-on-server',
                        type: 'order-status',
                        data: { orderId: modal.id, status: modal.action },
                      });
                    } catch (err) {
                      // Notification dispatch failures are non-blocking.
                    }
                    toast.success(`Order ${modal.action}`);
                    setModal(null);
                    setNote('');
                    void dispatch(fetchReceivedOrders());
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message || 'Update failed');
                  }
                }}
                type="button"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
