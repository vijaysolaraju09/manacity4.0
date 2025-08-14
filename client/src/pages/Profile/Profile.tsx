import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiShoppingCart, FiSettings, FiShoppingBag, FiPackage, FiUserCheck, FiUsers } from 'react-icons/fi';
import type { RootState } from '../../store';
import { setUser, clearUser } from '../../store/slices/userSlice';
import { type Theme } from '../../store/slices/themeSlice';
import type { AppDispatch } from '../../store';
import {
  getCurrentUser,
  updateProfile,
  requestVerification,
  requestBusiness,
} from '../../api/profile';
import { ProfileHeader } from '../../components/base';
import styles from './Profile.module.scss';
import Loader from '../../components/Loader';

const Profile = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user as any);

  const [loadingUser, setLoadingUser] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', location: '', address: '' });
  const [showVerify, setShowVerify] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ profession: '', bio: '' });
  const [showBusiness, setShowBusiness] = useState(false);
  const [businessForm, setBusinessForm] = useState({ name: '', category: '', location: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const theme = useSelector((state: RootState) => state.theme as Theme);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await getCurrentUser();
        dispatch(setUser(data));
        setEditForm({ name: data.name, location: data.location, address: data.address || '' });
      } finally {
        setLoadingUser(false);
      }
    };
    loadUser();
  }, [dispatch]);

  };

  const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}`;

  const actions: Array<{ label: string; icon: React.ComponentType<any>; onClick: () => void }> = [
    { label: 'My Orders', icon: FiPackage, onClick: () => navigate('/orders/my') },
    { label: 'My Cart', icon: FiShoppingCart, onClick: () => navigate('/cart') },
    { label: 'Settings', icon: FiSettings, onClick: () => navigate('/settings') },
  ];

  if (user.role !== 'business') {
    actions.push({ label: 'Request Business', icon: FiShoppingBag, onClick: () => setShowBusiness(true) });
  } else {
    actions.push(
      { label: 'Manage Products', icon: FiPackage, onClick: () => navigate('/manage-products') },
      { label: 'Received Orders', icon: FiUsers, onClick: () => navigate('/orders/received') },
    );
  }

  if (!user.isVerified) {
    actions.push({ label: 'Request Verification', icon: FiUserCheck, onClick: () => setShowVerify(true) });
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const updated = await updateProfile(editForm);
      dispatch(setUser(updated));
      setShowEdit(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await requestVerification(verifyForm);
      dispatch(setUser({
        ...user,
        profession: verifyForm.profession,
        bio: verifyForm.bio,
        verificationStatus: 'pending',
      }));
      setShowVerify(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await requestBusiness(businessForm);
      setShowBusiness(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUser) return <div className={styles.profile}>Loading...</div>;

  return (
    <div className={`${styles.profile} ${styles[theme]}`}>
        <ProfileHeader avatar={avatar} name={user.name} onEdit={() => setShowEdit(true)} />

      <div className={styles.actionsGrid}>
        {actions.map(({ label, icon: Icon, onClick }) => (
          <motion.div
            key={label}
            className={styles.action}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
          >
            <Icon />
            <span>{label}</span>
          </motion.div>
        ))}
      </div>

      {showEdit && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Edit Profile</h3>
            <form onSubmit={handleEditSubmit} className={styles.editForm}>
              <label>
                Name
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </label>
              <label>
                Location
                <input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
              </label>
              <label>
                Address
                <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </label>
              <div className={styles.modalActions}>
                <button type="submit" disabled={submitting}>
                  {submitting ? <Loader /> : 'Save'}
                </button>
                <button type="button" className={styles.cancel} onClick={() => setShowEdit(false)} disabled={submitting}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVerify && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Request Verification</h3>
            <form onSubmit={handleVerifySubmit} className={styles.editForm}>
              <label>
                Profession
                <input value={verifyForm.profession} onChange={(e) => setVerifyForm({ ...verifyForm, profession: e.target.value })} />
              </label>
              <label>
                Bio
                <textarea rows={4} value={verifyForm.bio} onChange={(e) => setVerifyForm({ ...verifyForm, bio: e.target.value })} />
              </label>
              <div className={styles.modalActions}>
                <button type="submit" disabled={submitting}>
                  {submitting ? <Loader /> : 'Submit'}
                </button>
                <button type="button" className={styles.cancel} onClick={() => setShowVerify(false)} disabled={submitting}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBusiness && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Request Business Access</h3>
            <form onSubmit={handleBusinessSubmit} className={styles.editForm}>
              <label>
                Business Name
                <input value={businessForm.name} onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })} />
              </label>
              <label>
                Category
                <input value={businessForm.category} onChange={(e) => setBusinessForm({ ...businessForm, category: e.target.value })} />
              </label>
              <label>
                Location
                <input value={businessForm.location} onChange={(e) => setBusinessForm({ ...businessForm, location: e.target.value })} />
              </label>
              <label>
                Address
                <input value={businessForm.address} onChange={(e) => setBusinessForm({ ...businessForm, address: e.target.value })} />
              </label>
              <div className={styles.modalActions}>
                <button type="submit" disabled={submitting}>
                  {submitting ? <Loader /> : 'Submit'}
                </button>
                <button type="button" className={styles.cancel} onClick={() => setShowBusiness(false)} disabled={submitting}>
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
