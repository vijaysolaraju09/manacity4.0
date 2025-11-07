import { createPortal } from 'react-dom';
import { useEffect, useState, type FC, type FormEventHandler } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProfile, updateProfile } from '@/store/user';

type EditFormState = {
  name: string;
  phone: string;
  location: string;
  address: string;
  bio: string;
  profession: string;
};

interface EditProfileModalProps {
  open: boolean;
  values: EditFormState;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onChange: (field: keyof EditFormState, value: string) => void;
  onSave: () => Promise<void> | void;
}

const EditProfileModal = ({ open, values, error, saving, onClose, onChange, onSave }: EditProfileModalProps) => {
  if (!open) return null;

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    await onSave();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl rounded-3xl border border-borderc/50 bg-surface-1 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-text-muted transition hover:bg-surface-2 hover:text-text"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        ) : null}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="edit-name">
              Full Name
            </label>
            <Input
              id="edit-name"
              value={values.name}
              onChange={(event) => onChange('name', event.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="edit-phone">
              Phone Number
            </label>
            <Input
              id="edit-phone"
              value={values.phone}
              onChange={(event) => onChange('phone', event.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="edit-location">
                City
              </label>
              <Input id="edit-location" value={values.location} onChange={(event) => onChange('location', event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="edit-profession">
                Profession
              </label>
              <Input
                id="edit-profession"
                value={values.profession}
                onChange={(event) => onChange('profession', event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="edit-address">
              Address
            </label>
            <Textarea
              id="edit-address"
              rows={3}
              value={values.address}
              onChange={(event) => onChange('address', event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="edit-bio">
              Bio
            </label>
            <Textarea id="edit-bio" value={values.bio} onChange={(event) => onChange('bio', event.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-borderc/40 bg-surface-1 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <Button type="submit" disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold">
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

const Profile: FC = () => {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { item: user, status, error } = useAppSelector((state) => state.userProfile);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formState, setFormState] = useState<EditFormState>({
    name: '',
    phone: '',
    location: '',
    address: '',
    bio: '',
    profession: '',
  });

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchProfile());
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (user) {
      setFormState({
        name: user.name ?? '',
        phone: user.phone ?? '',
        location: user.location ?? '',
        address: user.address ?? '',
        bio: user.bio ?? '',
        profession: user.profession ?? '',
      });
    }
  }, [user]);

  const avatar = user?.avatarUrl || user?.avatar || '';
  const initialLetter = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const handleFieldChange = (field: keyof EditFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await dispatch(updateProfile(formState)).unwrap();
      setEditOpen(false);
    } catch (err) {
      setSaveError(typeof err === 'string' ? err : 'Unable to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col px-4 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="mt-2 text-base text-muted-foreground">Manage your personal information and account settings.</p>
      </header>

      {status === 'failed' ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error || 'We could not load your profile. Please try again later.'}
        </div>
      ) : null}

      <section className="rounded-2xl border border-borderc/40 bg-surface-1 p-4 shadow-inner-card mb-4 flex gap-3 items-center">
        <div className="h-16 w-16 rounded-full overflow-hidden bg-surface-2 grid place-items-center">
          {avatar ? (
            <img src={avatar} alt={user?.name ?? 'User avatar'} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold">{initialLetter}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold truncate">{user?.name ?? 'Your Name'}</div>
          <div className="text-text-muted">{user?.phone ?? 'Add your phone number'}</div>
        </div>
      </section>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <button onClick={() => setEditOpen(true)} className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2">
          Edit Profile
        </button>
        <button onClick={() => nav('/orders')} className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2">
          My Orders
        </button>
        <button
          onClick={() => nav('/services?tab=mine')}
          className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2"
        >
          My Services
        </button>
        {user?.role === 'business' && (
          <button
            onClick={() => nav('/business/received-orders')}
            className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2"
          >
            Received Orders
          </button>
        )}
      </div>

      <section className="rounded-2xl border border-borderc/40 bg-surface-1 p-5 shadow-inner-card space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Account Details</h2>
          <p className="text-sm text-text-muted">Review the key information connected to your account.</p>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Email</dt>
            <dd className="text-sm font-medium text-text">{user?.email || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Phone</dt>
            <dd className="text-sm font-medium text-text">{user?.phone || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Role</dt>
            <dd className="text-sm font-medium text-text">{user?.role ? user.role.toUpperCase() : 'Customer'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-text-muted">Location</dt>
            <dd className="text-sm font-medium text-text">{user?.location || 'Add your city'}</dd>
          </div>
        </dl>
        <div>
          <dt className="text-xs uppercase tracking-wide text-text-muted">Address</dt>
          <dd className="mt-1 text-sm leading-relaxed text-text">
            {user?.address && user.address.trim().length > 0 ? user.address : 'Add your primary address to help us serve you better.'}
          </dd>
        </div>
        {(user?.profession || user?.bio) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {user?.profession ? (
              <div>
                <dt className="text-xs uppercase tracking-wide text-text-muted">Profession</dt>
                <dd className="text-sm font-medium text-text">{user.profession}</dd>
              </div>
            ) : null}
            {user?.bio ? (
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-text-muted">Bio</dt>
                <dd className="mt-1 text-sm leading-relaxed text-text">{user.bio}</dd>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {status === 'loading' && !user ? (
        <div className="mt-6 text-sm text-text-muted">Loading your profile…</div>
      ) : null}

      <EditProfileModal
        open={editOpen}
        values={formState}
        error={saveError}
        saving={saving}
        onClose={() => {
          setEditOpen(false);
          setSaveError(null);
        }}
        onChange={handleFieldChange}
        onSave={handleSave}
      />
    </main>
  );
};

export default Profile;
