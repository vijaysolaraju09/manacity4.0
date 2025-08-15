import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ProfileHeader, Tabs, OrderCard } from '../../components/base';
import ProductCard from '../../components/ui/ProductCard';
import type { RootState } from '../../store';
import { sampleShops } from '../../data/sampleData';
import { clearUser } from '../../store/slices/userSlice';
import { setTheme, type Theme } from '../../store/slices/themeSlice';
import ModalSheet from '../../components/base/ModalSheet';
import { requestBusiness, getMyBusinessRequest } from '../../api/profile';
import styles from './Profile.module.scss';

const Profile = () => {
  const user = useSelector((state: RootState) => state.user as any);
  const theme = useSelector((state: RootState) => state.theme as Theme);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [businessOpen, setBusinessOpen] = useState(false);
  const [shopStatus, setShopStatus] = useState<string | null>(null);
  const [shopForm, setShopForm] = useState({
    name: '',
    category: '',
    location: '',
    address: '',
    description: '',
  });

  useEffect(() => {
    if (user.role !== 'business') {
      getMyBusinessRequest()
        .then((res) => setShopStatus(res.status))
        .catch(() => setShopStatus(null));
    }
  }, [user.role]);

  const avatar =
    user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`;

  const orders = [
    {
      items: [
        { id: '1', title: 'Sample', image: sampleShops[0].products[0].image },
      ],
      shop: 'Café Aroma',
      date: new Date().toISOString(),
      status: 'pending' as const,
      quantity: 1,
      total: 50,
    },
  ];

  const products = sampleShops[0].products;

  const tabs: Array<{ key: string; label: string; content: React.ReactNode }> = [
    {
      key: 'overview',
      label: 'Overview',
      content: <p>Welcome back, {user.name}!</p>,
    },
    {
      key: 'orders',
      label: 'Orders',
      content: (
        <div className={styles.list}>
          {orders.map((o) => (
            <OrderCard key={o.date} {...o} />
          ))}
        </div>
      ),
    },
  ];

  if (user.role === 'business') {
    tabs.push({
      key: 'products',
      label: 'Products',
      content: (
        <div className={styles.list}>
          {products.map((p) => (
            <ProductCard key={p._id} product={p} showActions={false} />
          ))}
        </div>
      ),
    });
    tabs.push({ key: 'reviews', label: 'Reviews', content: <p>No reviews yet.</p> });
  }

  tabs.push({
    key: 'settings',
    label: 'Settings',
    content: (
      <div className={styles.settings}>
        <div className={styles.themes}>
          <button type="button" onClick={() => dispatch(setTheme('colored'))}>
            Colored
          </button>
          <button type="button" onClick={() => dispatch(setTheme('light'))}>
            Light
          </button>
          <button type="button" onClick={() => dispatch(setTheme('dark'))}>
            Dark
          </button>
        </div>
        <button
          type="button"
          className={styles.logout}
          onClick={() => {
            dispatch(clearUser());
            navigate('/login');
          }}
        >
          Logout
        </button>
        <p className={styles.prefs}>Preferences coming soon.</p>
      </div>
    ),
  });

  return (
    <div className={`${styles.profile} ${styles[theme]}`}>
      <ProfileHeader
        avatar={avatar}
        name={user.name}
        role={user.role}
        location={user.location}
        stats={[{ label: 'Orders', value: orders.length }]}
        actions={[
          ...(user.role !== 'business' && shopStatus !== 'pending'
            ? [{ label: 'Request Business', onClick: () => setBusinessOpen(true) }]
            : []),
          { label: 'Settings', onClick: () => setActiveTab('settings') },
        ]}
      />
      {shopStatus && (
        <p className={`${styles.statusIndicator} ${styles[shopStatus]}`}>
          Request {shopStatus}
        </p>
      )}
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      <ModalSheet open={businessOpen} onClose={() => setBusinessOpen(false)}>
        <form
          className={styles.businessForm}
          onSubmit={async (e) => {
            e.preventDefault();
            await requestBusiness(shopForm);
            setShopStatus('pending');
            setBusinessOpen(false);
          }}
        >
          <h3>Request Business</h3>
          <label>
            Shop Name
            <input
              value={shopForm.name}
              onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
              required
            />
          </label>
          <label>
            Category
            <input
              value={shopForm.category}
              onChange={(e) =>
                setShopForm({ ...shopForm, category: e.target.value })
              }
              required
            />
          </label>
          <label>
            Location
            <input
              value={shopForm.location}
              onChange={(e) =>
                setShopForm({ ...shopForm, location: e.target.value })
              }
              required
            />
          </label>
          <label>
            Address
            <input
              value={shopForm.address}
              onChange={(e) =>
                setShopForm({ ...shopForm, address: e.target.value })
              }
              required
            />
          </label>
          <label>
            Description
            <textarea
              value={shopForm.description}
              onChange={(e) =>
                setShopForm({ ...shopForm, description: e.target.value })
              }
            />
          </label>
          <div className={styles.modalActions}>
            <button type="button" onClick={() => setBusinessOpen(false)}>
              Cancel
            </button>
            <button type="submit">Submit</button>
          </div>
        </form>
      </ModalSheet>
    </div>
  );
};

export default Profile;
