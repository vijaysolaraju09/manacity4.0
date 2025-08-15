import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ProfileHeader, Tabs, OrderCard } from '../../components/base';
import ProductCard from '../../components/ui/ProductCard';
import type { RootState } from '../../store';
import { sampleShops } from '../../data/sampleData';
import { setUser } from '../../store/slices/userSlice';
import ModalSheet from '../../components/base/ModalSheet';
import {
  requestBusiness,
  getMyBusinessRequest,
  requestVerification,
  getCurrentUser,
} from '../../api/profile';
import { useTheme } from '../../theme/ThemeProvider';
import styles from './Profile.module.scss';

const Profile = () => {
  const user = useSelector((state: RootState) => state.user as any);
  const { theme } = useTheme();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState('overview');
  const [businessOpen, setBusinessOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [shopStatus, setShopStatus] = useState<string | null>(null);
  const [shopForm, setShopForm] = useState({
    name: '',
    category: '',
    location: '',
    address: '',
    description: '',
  });
  const [verifyForm, setVerifyForm] = useState({
    profession: '',
    bio: '',
    portfolio: [''],
  });

  useEffect(() => {
    if (user.role !== 'business') {
      getMyBusinessRequest()
        .then((res) => setShopStatus(res.status))
        .catch(() => setShopStatus(null));
    }
  }, [user.role]);

  useEffect(() => {
    getCurrentUser()
      .then((res) => dispatch(setUser(res)))
      .catch(() => undefined);
  }, [dispatch]);

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


  return (
    <div className={`${styles.profile} ${styles[theme]}`}>
      <ProfileHeader
        avatar={avatar}
        name={user.name}
        role={user.role}
        location={user.location}
        stats={[{ label: 'Orders', value: orders.length }]}
        actions={[
          ...(!user.isVerified && user.verificationStatus !== 'pending'
            ? [{ label: 'Request Verification', onClick: () => setVerifyOpen(true) }]
            : []),
          ...(user.role !== 'business' && shopStatus !== 'pending'
            ? [{ label: 'Request Business', onClick: () => setBusinessOpen(true) }]
            : []),
        ]}
      />
      {shopStatus && (
        <p className={`${styles.statusIndicator} ${styles[shopStatus]}`}>
          Request {shopStatus}
        </p>
      )}
      {(user.isVerified || user.verificationStatus) && (
        <p
          className={`${styles.statusIndicator} ${
            styles[user.isVerified ? 'approved' : user.verificationStatus || 'pending']
          }`}
        >
          {user.isVerified
            ? 'Verified'
            : `Verification ${user.verificationStatus}`}
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
      <ModalSheet open={verifyOpen} onClose={() => setVerifyOpen(false)}>
        <form
          className={styles.businessForm}
          onSubmit={async (e) => {
            e.preventDefault();
            await requestVerification({
              profession: verifyForm.profession,
              bio: verifyForm.bio,
              portfolio: verifyForm.portfolio.filter((p) => p),
            });
            dispatch(
              setUser({
                ...user,
                profession: verifyForm.profession,
                bio: verifyForm.bio,
                isVerified: false,
                verificationStatus: 'pending',
              })
            );
            setVerifyOpen(false);
          }}
        >
          <h3>Request Verification</h3>
          <label>
            Profession
            <input
              value={verifyForm.profession}
              onChange={(e) =>
                setVerifyForm({ ...verifyForm, profession: e.target.value })
              }
              required
            />
          </label>
          <label>
            Bio
            <textarea
              value={verifyForm.bio}
              onChange={(e) =>
                setVerifyForm({ ...verifyForm, bio: e.target.value })
              }
            />
          </label>
          {verifyForm.portfolio.map((link, idx) => (
            <label key={idx}>
              Portfolio Link
              <input
                value={link}
                onChange={(e) => {
                  const portfolio = [...verifyForm.portfolio];
                  portfolio[idx] = e.target.value;
                  setVerifyForm({ ...verifyForm, portfolio });
                }}
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() =>
              setVerifyForm({
                ...verifyForm,
                portfolio: [...verifyForm.portfolio, ''],
              })
            }
          >
            Add Link
          </button>
          <div className={styles.modalActions}>
            <button type="button" onClick={() => setVerifyOpen(false)}>
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
