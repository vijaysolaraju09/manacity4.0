import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import type { RootState } from '../../store';
import { setUser, clearUser } from '../../store/slices/userSlice';
import {
  getCurrentUser,
  updateProfile,
  requestVerification,
  requestBusiness,
  getMyProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  getBusinessOrders,
  getVerifiedServiceRequests,
  getUserOrders,
  getFeedback,
} from '../../api/profile';
import type { ProductData } from '../../api/profile';
import styles from './Profile.module.scss';
import Loader from '../../components/Loader';

interface Order {
  _id: string;
  status: string;
  customerName?: string;
  contact?: string;
}

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [loadingUser, setLoadingUser] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  // forms
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', location: '', address: '' });
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ profession: '', bio: '' });
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [businessForm, setBusinessForm] = useState({
    name: '',
    category: '',
    location: '',
    address: '',
  });

  // business data
  const [products, setProducts] = useState<ProductData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [feedback, setFeedbackData] = useState<Array<{ _id: string; message: string }>>([]);

  // verified data
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // customer data
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [interests, setInterests] = useState<any[]>([]);

  // loading states
  const [editLoading, setEditLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [businessLoading, setBusinessLoading] = useState(false);
  const [productActionId, setProductActionId] = useState<string>('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await getCurrentUser();
        dispatch(setUser(data));
        setEditForm({ name: data.name, location: data.location, address: data.address || '' });
      } catch {
        // ignore errors
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, [dispatch]);

  useEffect(() => {
    if (user.role === 'business') {
      getMyProducts().then(setProducts).catch(() => setProducts([]));
      getBusinessOrders().then(setOrders).catch(() => setOrders([]));
      if (user._id) {
        getFeedback(user._id).then(setFeedbackData).catch(() => setFeedbackData([]));
      }
    } else if (user.role === 'verified') {
      getVerifiedServiceRequests().then(setServiceRequests).catch(() => setServiceRequests([]));
      getServiceHistory().then(setHistory).catch(() => setHistory([]));
    } else {
      getUserOrders().then(setMyOrders).catch(() => setMyOrders([]));
    }
  }, [user.role, user._id]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch(clearUser());
    navigate('/login');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      const updated = await updateProfile(editForm);
      dispatch(setUser(updated));
      setShowEdit(false);
    } catch {
      // ignore
    } finally {
      setEditLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setVerifyLoading(true);
      await requestVerification(verifyForm);
      setShowVerifyModal(false);
    } catch {
      // ignore
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusinessLoading(true);
      await requestBusiness(businessForm);
      setShowBusinessModal(false);
    } catch {
      // ignore
    } finally {
      setBusinessLoading(false);
    }
  };

  const handleProductAdd = async (data: ProductData) => {
    try {
      setProductActionId('new');
      const p = await addProduct(data);
      setProducts([...products, p]);
    } catch {
      // ignore
    } finally {
      setProductActionId('');
    }
  };

  const handleProductUpdate = async (id: string, data: ProductData) => {
    try {
      setProductActionId(id);
      await updateProduct(id, data);
      setProducts(products.map((p) => (p._id === id ? { ...p, ...data } : p)));
    } catch {
      // ignore
    } finally {
      setProductActionId('');
    }
  };

  const handleProductDelete = async (id: string) => {
    try {
      setProductActionId(id);
      await deleteProduct(id);
      setProducts(products.filter((p) => p._id !== id));
    } catch {
      // ignore
    } finally {
      setProductActionId('');
    }
  };

  const tabs: Array<{ key: string; label: string }> = [
    { key: 'overview', label: 'Overview' },
  ];
  if (user.role === 'business') {
    tabs.push(
      { key: 'products', label: 'Products' },
      { key: 'orders', label: 'Orders' },
      { key: 'feedback', label: 'Feedback' },
    );
  } else if (user.role === 'verified') {
    tabs.push({ key: 'requests', label: 'Requests' }, { key: 'history', label: 'History' });
  } else {
    tabs.push({ key: 'orders', label: 'My Orders' });
  }

  const summary: Array<{ label: string; value: number }> = [];
  summary.push({
    label: 'Orders',
    value: user.role === 'business' ? orders.length : myOrders.length,
  });
  if (user.role === 'business') summary.push({ label: 'Products', value: products.length });
  if (user.role === 'verified') summary.push({ label: 'Requests', value: serviceRequests.length });

  if (loadingUser) return <div className={styles.profile}>Loading...</div>;

  const avatar =
    (user as any).avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`;

  return (
    <div className={styles.profile}>
      <motion.div className={styles.header} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <img className={styles.avatar} src={avatar} alt={user.name} />
        <h2>{user.name}</h2>
        <span className={styles.roleBadge}>{user.role}</span>
        <p>{user.phone}</p>
        <p>{user.location}</p>
        {user.address && <p>{user.address}</p>}
        <div className={styles.counts}>
          {summary.map((s) => (
            <div key={s.label} className={styles.item}>
              <span>{s.value}</span>
              <p>{s.label}</p>
            </div>
          ))}
        </div>
        <div className={styles.actions}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => setShowEdit(true)}>
            Edit Profile
          </motion.button>
          {user.role !== 'verified' && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => setShowVerifyModal(true)}>
              Request Verification
            </motion.button>
          )}
          {user.role !== 'business' && (
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => setShowBusinessModal(true)}>
              Request Business
            </motion.button>
          )}
          <motion.button className={styles.logout} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={handleLogout}>
            Logout
          </motion.button>
        </div>
      </motion.div>

      <div className={styles.tabs}>
        <div className={styles.tabButtons}>
          {tabs.map((t) => (
            <button key={t.key} className={selectedTab === t.key ? 'active' : ''} onClick={() => setSelectedTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div>
          <AnimatePresence mode="wait">
            {selectedTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Overview currently just displays user card */}
              </motion.div>
            )}
            {user.role === 'business' && selectedTab === 'products' && (
              <motion.div key="products" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h3>My Products</h3>
                <div className={styles.grid}>
                  {products.map((p) => (
                    <div key={p._id} className={styles.card}>
                      <h4>{p.name}</h4>
                      <p>₹{p.price}</p>
                      <div className={styles.cardActions}>
                        <button
                          onClick={() => handleProductUpdate(p._id!, p)}
                          disabled={productActionId === p._id}
                        >
                          {productActionId === p._id ? <Loader /> : 'Edit'}
                        </button>
                        <button
                          onClick={() => handleProductDelete(p._id!)}
                          disabled={productActionId === p._id}
                        >
                          {productActionId === p._id ? <Loader /> : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleProductAdd({ name: 'New Product', price: 0 })}
                  disabled={productActionId === 'new'}
                >
                  {productActionId === 'new' ? <Loader /> : 'Add Product'}
                </button>
              </motion.div>
            )}
            {user.role === 'business' && selectedTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h3>Order Requests</h3>
                <div className={styles.grid}>
                  {orders.map((o) => (
                    <div key={o._id} className={styles.card}>
                      <p>{o.customerName}</p>
                      <p>{o.status}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {user.role === 'business' && selectedTab === 'feedback' && (
              <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h3>Customer Feedback</h3>
                <div className={styles.grid}>
                  {feedback.map((f) => (
                    <div key={f._id} className={styles.card}>
                      <p>{f.message}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {user.role === 'verified' && selectedTab === 'requests' && (
              <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h3>Service Requests</h3>
                <div className={styles.grid}>
                  {serviceRequests.map((r) => (
                    <div key={r._id} className={styles.card}>
                      <p>{r.userName}</p>
                      <div className={styles.cardActions}>
                        <button>Accept</button>
                        <button>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {user.role === 'verified' && selectedTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h3>Service History</h3>
                <div className={styles.grid}>
                  {history.map((h) => (
                    <div key={h._id} className={styles.card}>
                      <p>{h.title || h._id}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {user.role !== 'business' && user.role !== 'verified' && selectedTab === 'orders' && (
              <motion.div key="myorders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h3>My Orders</h3>
                <div className={styles.grid}>
                  {myOrders.map((o) => (
                    <div key={o._id} className={styles.card}>
                      <p>{o.status}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showEdit && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Edit Profile</h3>
            <form onSubmit={handleEditSubmit} className={styles.editForm}>
              <label>
                Name
                <input type="text" name="name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </label>
              <label>
                Location
                <input type="text" name="location" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
              </label>
              <label>
                Address
                <input type="text" name="address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </label>
              <div className={styles.modalActions}>
                <button type="submit" disabled={editLoading}>
                  {editLoading ? <Loader /> : 'Save'}
                </button>
                <button type="button" className={styles.cancel} onClick={() => setShowEdit(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVerifyModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Request Verification</h3>
            <form onSubmit={handleVerifySubmit} className={styles.editForm}>
              <label>
                Profession
                <input type="text" name="profession" value={verifyForm.profession} onChange={(e) => setVerifyForm({ ...verifyForm, profession: e.target.value })} />
              </label>
              <label>
                Bio
                <textarea name="bio" rows={4} value={verifyForm.bio} onChange={(e) => setVerifyForm({ ...verifyForm, bio: e.target.value })} />
              </label>
              <div className={styles.modalActions}>
                <button type="submit" disabled={verifyLoading}>
                  {verifyLoading ? <Loader /> : 'Submit'}
                </button>
                <button type="button" className={styles.cancel} onClick={() => setShowVerifyModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBusinessModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Request Business Access</h3>
            <form onSubmit={handleBusinessSubmit} className={styles.editForm}>
              <label>
                Business Name
                <input type="text" name="name" value={businessForm.name} onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })} />
              </label>
              <label>
                Category
                <input type="text" name="category" value={businessForm.category} onChange={(e) => setBusinessForm({ ...businessForm, category: e.target.value })} />
              </label>
              <label>
                Location
                <input type="text" name="location" value={businessForm.location} onChange={(e) => setBusinessForm({ ...businessForm, location: e.target.value })} />
              </label>
              <label>
                Address
                <input type="text" name="address" value={businessForm.address} onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })} />
              </label>
              <div className={styles.modalActions}>
                <button type="submit" disabled={businessLoading}>
                  {businessLoading ? <Loader /> : 'Submit'}
                </button>
                <button type="button" className={styles.cancel} onClick={() => setShowBusinessModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

