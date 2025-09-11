import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ModalSheet from '@/components/base/ModalSheet';
import showToast from '@/components/ui/Toast';
import { getCurrentUser, updateProfile } from '@/api/profile';
import { setUser } from '@/store/slices/authSlice';
import type { RootState, AppDispatch } from '@/store';
import styles from './Profile.module.scss';

const Profile = () => {
  const user = useSelector((s: RootState) => s.auth.user)!;
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: user.name,
    location: user.location,
    avatarUrl: user.avatarUrl || '',
  });

  useEffect(() => {
    setForm({
      name: user.name,
      location: user.location,
      avatarUrl: user.avatarUrl || '',
    });
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.location.trim()) {
      showToast('Name and location are required', 'error');
      return;
    }
    try {
      await updateProfile(form);
      const refreshed = await getCurrentUser();
      dispatch(setUser(refreshed));
      showToast('Profile updated', 'success');
      setOpen(false);
    } catch (err: any) {
      showToast(err.toString(), 'error');
    }
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const actions: { label: string; path: string }[] = [];
  if (user.role === 'business') {
    actions.push(
      { label: 'Manage Products', path: '/manage-products' },
      { label: 'Received Orders', path: '/orders/received' }
    );
  }
  if (user.isVerified || user.role === 'verified') {
    actions.push({ label: 'Service Orders', path: '/orders/service' });
  }
  if (actions.length === 0) {
    actions.push({ label: 'My Orders', path: '/orders' });
  }

  return (
    <div className={styles.profile}>
      <div className={styles.card}>
        {form.avatarUrl ? (
          <img src={form.avatarUrl} alt={user.name} className={styles.avatar} />
        ) : (
          <div className={styles.avatarFallback}>{initials}</div>
        )}
        <div className={styles.info}>
          <h2>{user.name}</h2>
          <p className={styles.phone}>{user.phone}</p>
          <p>{user.location}</p>
        </div>
        <div className={styles.roles}>
          <span className={styles.role}>{user.role}</span>
          {user.isVerified && (
            <span className={styles.role}>verified</span>
          )}
        </div>
        <button className={styles.editBtn} onClick={() => setOpen(true)}>
          Edit Profile
        </button>
      </div>

      <div className={styles.actions}>
        {actions.map((a) => (
          <button key={a.label} onClick={() => navigate(a.path)}>
            {a.label}
          </button>
        ))}
      </div>

      <ModalSheet open={open} onClose={() => setOpen(false)}>
        <div className={styles.modalContent}>
          <h3>Edit Profile</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
            className={styles.editForm}
          >
            <label>
              Name
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Location
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Avatar URL
              <input
                name="avatarUrl"
                value={form.avatarUrl}
                onChange={handleChange}
              />
            </label>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancel}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button type="submit">Save</button>
            </div>
          </form>
        </div>
      </ModalSheet>
    </div>
  );
};

export default Profile;

