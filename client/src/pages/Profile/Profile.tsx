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
    email: user.email || '',
    location: user.location,
    address: user.address || '',
    profession: user.profession || '',
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    theme: user.preferences?.theme || 'light',
  });

  useEffect(() => {
    setForm({
      name: user.name,
      email: user.email || '',
      location: user.location,
      address: user.address || '',
      profession: user.profession || '',
      bio: user.bio || '',
      avatarUrl: user.avatarUrl || '',
      theme: user.preferences?.theme || 'light',
    });
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      showToast('Invalid email', 'error');
      return;
    }
    if (form.bio.length > 500) {
      showToast('Bio too long', 'error');
      return;
    }
    try {
      await updateProfile({
        name: form.name,
        email: form.email || undefined,
        location: form.location,
        address: form.address,
        profession: form.profession,
        bio: form.bio,
        avatarUrl: form.avatarUrl,
        preferences: { theme: form.theme },
      });
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
  if (user.isVerified) {
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
          {user.email && <p>{user.email}</p>}
          {user.location && <p>{user.location}</p>}
          {user.address && <p>{user.address}</p>}
          {user.profession && <p>{user.profession}</p>}
          {user.bio && <p>{user.bio}</p>}
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
              Email
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
              />
            </label>
            <label>
              Location
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
              />
            </label>
            <label>
              Address
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
              />
            </label>
            <label>
              Profession
              <input
                name="profession"
                value={form.profession}
                onChange={handleChange}
              />
            </label>
            <label>
              Bio
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                maxLength={500}
              />
            </label>
            <label>
              Theme
              <select name="theme" value={form.theme} onChange={handleChange}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="colored">Colored</option>
              </select>
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

