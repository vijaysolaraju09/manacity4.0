import React, { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchMyOrders, selectMyOrders } from '@/store/orders';

export default function MyOrders() {
  const dispatch = useAppDispatch();
  const mineState = useAppSelector((s) => s.orders.mine);
  const orders = useAppSelector(selectMyOrders);
  const [tab, setTab] = useState<'accepted' | 'rejected' | 'all'>('all');

  useEffect(() => {
    if (mineState.status === 'idle') {
      void dispatch(fetchMyOrders());
    }
  }, [dispatch, mineState.status]);

  const list = useMemo(
    () => (tab === 'all' ? orders : (orders ?? []).filter((o: any) => o.status === tab)),
    [orders, tab],
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-3">My Orders</h1>
      <div className="tabs tabs-bordered mb-3">
        <button
          className={`tab ${tab === 'accepted' ? 'tab-active' : ''}`}
          onClick={() => setTab('accepted')}
          type="button"
        >
          Accepted
        </button>
        <button
          className={`tab ${tab === 'rejected' ? 'tab-active' : ''}`}
          onClick={() => setTab('rejected')}
          type="button"
        >
          Rejected
        </button>
        <button
          className={`tab ${tab === 'all' ? 'tab-active' : ''}`}
          onClick={() => setTab('all')}
          type="button"
        >
          All
        </button>
      </div>
      <div className="grid gap-3">
        {list.map((o: any) => {
          const total =
            typeof o.total === 'number'
              ? o.total
              : typeof o.totalAmount === 'number'
              ? o.totalAmount
              : typeof o.totalPaise === 'number'
              ? Math.round(o.totalPaise / 100)
              : 0;
          return (
            <div key={o._id || o.id} className="rounded-xl border border-borderc/40 bg-surface-1 p-3 shadow-inner-card">
              <div className="font-medium">{o.shop?.name || 'Shop'}</div>
              <div className="text-sm text-text-muted">{o.items?.length || 0} item(s) • ₹{total}</div>
              <div className="text-sm mt-1">
                Status: <span className="font-medium capitalize">{o.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
