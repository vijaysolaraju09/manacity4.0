import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProfile } from '@/store/user';
import fallbackImage from '@/assets/no-image.svg';

export default function Profile() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.userProfile.item);
  const role = useAppSelector((s) => s.auth.user?.role);

  useEffect(() => {
    if (!user) {
      void dispatch(fetchProfile());
    }
  }, [dispatch, user]);

  if (!user) {
    return <div className="p-6">Loading profile…</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-borderc/40 bg-surface-1 p-4 shadow-inner-card">
          <img src={user.avatar || fallbackImage} className="w-16 h-16 rounded-full object-cover" alt="" />
          <div>
            <div className="font-semibold">{user.name}</div>
            <div className="text-sm text-text-muted">{user.phone}</div>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Link
            to="/profile/edit"
            className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2 text-center"
          >
            Edit Profile
          </Link>
          <Link to="/orders" className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2 text-center">
            My Orders
          </Link>
          <Link to="/services?tab=my" className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2 text-center">
            My Services
          </Link>
          {role === 'business' && (
            <Link
              to="/business/received-orders"
              className="rounded-xl border border-borderc/40 bg-surface-1 px-3 py-2 text-center"
            >
              Received Orders
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
