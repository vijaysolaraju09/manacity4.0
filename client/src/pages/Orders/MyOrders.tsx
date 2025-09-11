import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchMyOrders, selectOrdersByStatus } from '@/store/orders';
import type { RootState, AppDispatch } from '@/store';
import { clearCart, addToCart } from '@/store/slices/cartSlice';
import { OrderCard } from '@/components/base';
import Shimmer from '@/components/Shimmer';
import styles from './MyOrders.module.scss';

const statuses = ['all', 'pending', 'accepted', 'cancelled', 'completed'] as const;

const MyOrders = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<(typeof statuses)[number]>('all');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const { status: loadStatus } = useSelector((s: RootState) => s.orders.mine);
  const orders = useSelector((state: RootState) =>
    status === 'all'
      ? (state.orders.mine.ids as string[]).map(
          (id) => state.orders.mine.entities[id]!
        )
      : selectOrdersByStatus(state, 'mine', status as any)
  ) as any[];

  useEffect(() => {
    dispatch(fetchMyOrders());
  }, [dispatch]);

  const filtered = orders.filter((o) => {
    const item = o.items[0];
    const withinCategory = category
      ? item.name?.toLowerCase().includes(category.toLowerCase())
      : true;
    const price = item.price;
    const withinMin = minPrice ? price >= Number(minPrice) : true;
    const withinMax = maxPrice ? price <= Number(maxPrice) : true;
    return withinCategory && withinMin && withinMax;
  });

  const reorder = (order: any) => {
    dispatch(clearCart());
    order.items.forEach((i: any) =>
      dispatch(
        addToCart({
          id: i.productId || i.name,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
        })
      )
    );
    navigate('/cart');
  };

  return (
    <div className={styles.myOrders}>
      <h2>My Orders</h2>
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
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <input
          type="number"
          placeholder="Min Price"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          type="number"
          placeholder="Max Price"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>
      {loadStatus === 'loading' ? (
        [1, 2, 3].map((n) => (
          <Shimmer
            key={n}
            className={`${styles.card} shimmer rounded`}
            style={{ height: 80 }}
          />
        ))
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>No orders found.</p>
      ) : (
        filtered.map((o) => (
          <OrderCard
            key={o._id}
            items={o.items.map((i: any) => ({
              id: i.productId || i.name,
              title: i.name,
              image: i.image,
            }))}
            shop={o.targetName || 'Shop'}
            date={o.createdAt}
            status={o.status}
            quantity={o.items.reduce((s: number, it: any) => s + it.quantity, 0)}
            total={o.totals.total}
            onReorder={() => reorder(o)}
          />
        ))
      )}
    </div>
  );
};

export default MyOrders;

