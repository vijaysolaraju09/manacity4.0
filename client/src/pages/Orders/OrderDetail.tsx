import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/lib/http';
import PriceBlock from '../../components/ui/PriceBlock';
import StatusChip, { type Status } from '../../components/ui/StatusChip';
import styles from './OrderDetail.module.scss';

interface OrderItem {
  _id: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
}

interface Order {
  _id: string;
  items: OrderItem[];
  status: Status;
  user?: { name: string; phone?: string };
  createdAt: string;
}

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/orders/${id}`);
        const data = res.data;
        const items = data.items || [
          {
            _id: data.product?._id || 'item',
            name: data.product?.name || 'Item',
            image: data.product?.image,
            price: data.product?.price || 0,
            quantity: data.quantity || 1,
          },
        ];
        setOrder({ ...data, items });
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <p className={styles.orderDetail}>Loading...</p>;
  if (!order) return <p className={styles.orderDetail}>Order not found.</p>;

  const total = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const statuses: Status[] = ['pending', 'accepted', 'cancelled', 'completed'];

  return (
    <div className={styles.orderDetail}>
      <h2>Order Detail</h2>
      <ul className={styles.items}>
        {order.items.map((item) => (
          <li key={item._id} className={styles.item}>
            {item.image && <img src={item.image} alt={item.name} />}
            <div className={styles.itemInfo}>
              <span>{item.name}</span>
              <span>Qty: {item.quantity}</span>
              <PriceBlock price={item.price * item.quantity} />
            </div>
          </li>
        ))}
      </ul>
      <div className={styles.total}>Total: <PriceBlock price={total} /></div>
      <ul className={styles.timeline}>
        {statuses.map((s) => (
          <li key={s} className={s === order.status ? styles.active : ''}>
            <StatusChip status={s} />
          </li>
        ))}
      </ul>
      {order.user?.phone && (
        <a href={`tel:${order.user.phone}`} className={styles.call}>
          Call {order.user.name}
        </a>
      )}
    </div>
  );
};

export default OrderDetail;
