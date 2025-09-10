import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProfileHeader from '../../components/ui/ProfileHeader';
import { OrderCard } from '../../components/base';
import ProductCard from '../../components/ui/ProductCard.tsx';
import type { RootState } from '../../store';
import { setUser } from '../../store/slices/userSlice';
import { fetchMyOrders } from '@/store/orders';
import { fetchMyProducts } from '@/store/slices/productSlice';
import ModalSheet from '../../components/base/ModalSheet';
import {
  requestBusiness,
  getMyBusinessRequest,
  requestVerification,
  getCurrentUser,
} from '../../api/profile';
import { useTheme } from '../../theme/ThemeProvider';
import ProductModal, { type ProductForm } from './modals/ProductModal';
import DeleteProductModal from './modals/DeleteProductModal';
import styles from './Profile.module.scss';

const Profile = () => {
  const user = useSelector((state: RootState) => state.user as any);
  const { theme } = useTheme();
  const dispatchRedux = useDispatch<any>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [businessOpen, setBusinessOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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
      .then((res) => dispatchRedux(setUser(res)))
      .catch(() => undefined);
    dispatchRedux(fetchMyOrders(undefined));
    dispatchRedux(fetchMyProducts());
  }, [dispatchRedux]);

  const avatar =
    user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`;

  const { mine } = useSelector((s: RootState) => s.orders);
  const prodState = useSelector((s: RootState) => s.products);
  const [products, setProducts] = useState<any[]>(prodState.items as any[]);

  useEffect(() => {
    setProducts(prodState.items as any[]);
  }, [prodState.items]);

  const orders = mine.items.map((o: any) => ({
    ...o,
    date: o.createdAt,
    quantity: o.items?.length || 0,
  }));

  const tabItems = [
    { key: 'overview', label: 'Overview' },
    { key: 'orders', label: 'Orders' },
    { key: 'products', label: 'Products' },
    { key: 'reviews', label: 'Reviews' },
    { key: 'settings', label: 'Settings' },
  ];

  const changeTab = (key: string) => setSearchParams({ tab: key });

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const openEditProduct = (p: ProductForm) => {
    setEditingProduct(p);
    setProductModalOpen(true);
  };

  const handleSaveProduct = (data: ProductForm) => {
    const withImage: any = { ...data, image: data.image || '' };
    if (editingProduct) {
      setProducts((prev: any[]) =>
        prev.map((p) => (p._id === editingProduct._id ? { ...p, ...withImage } : p))
      );
    } else {
      setProducts((prev: any[]) => [
        ...prev,
        { ...withImage, _id: Date.now().toString() },
      ]);
    }
    setProductModalOpen(false);
  };

  const handleDeleteProduct = () => {
    if (deleteId) {
      setProducts((prev) => prev.filter((p) => p._id !== deleteId));
      setDeleteId(null);
    }
  };

  let content: React.ReactNode = null;
  if (activeTab === 'overview') {
    content = <p>Welcome back, {user.name}!</p>;
  } else if (activeTab === 'orders') {
    content = (
      <div className={styles.list}>
        {orders.map((o) => (
          <OrderCard key={o.date} {...o} />
        ))}
      </div>
    );
  } else if (activeTab === 'products') {
    content = (
      <div className={styles.productsTab}>
        <button onClick={openAddProduct}>Add Product</button>
        <div className={styles.list}>
          {products.map((p) => (
            <div key={p._id} className={styles.productItem}>
              <ProductCard product={p} showActions={false} />
              <div className={styles.productActions}>
                <button onClick={() => openEditProduct(p)}>Edit</button>
                <button onClick={() => setDeleteId(p._id!)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (activeTab === 'reviews') {
    content = <p>No reviews yet.</p>;
  } else if (activeTab === 'settings') {
    content = (
      <div className={styles.settings}>
        <button onClick={() => navigate('/settings')}>Open Settings</button>
      </div>
    );
  }
  const actions = [
    { label: 'Edit', onClick: () => alert('Edit profile coming soon') },
    ...(!user.isVerified && user.verificationStatus !== 'pending'
      ? [{ label: 'Request Verification', onClick: () => setVerifyOpen(true) }]
      : []),
    ...(user.role !== 'business' && shopStatus !== 'pending'
      ? [{ label: 'Request Business', onClick: () => setBusinessOpen(true) }]
      : []),
    { label: 'Settings', onClick: () => navigate('/settings') },
  ];

  return (
    <div className={`${styles.profile} ${styles[theme]}`}>
      <ProfileHeader
        avatar={avatar}
        name={user.name}
        role={user.role}
        location={user.location}
        stats={[{ label: 'Orders', value: orders.length }]}
        actions={actions}
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
      <div className={styles.tabs}>
        {tabItems.map((t) => (
          <button
            key={t.key}
            className={`${styles.tabButton} ${
              activeTab === t.key ? styles.tabButtonActive : ''
            }`}
            onClick={() => changeTab(t.key)}
          >
            {t.label}
            {activeTab === t.key && (
              <motion.div layoutId="tab-underline" className={styles.underline} />
            )}
          </button>
        ))}
      </div>
      {content}
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
            dispatchRedux(
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
      <ProductModal
        open={productModalOpen}
        initial={editingProduct}
        onClose={() => setProductModalOpen(false)}
        onSave={handleSaveProduct}
      />
      <DeleteProductModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteProduct}
      />
    </div>
  );
};

export default Profile;
