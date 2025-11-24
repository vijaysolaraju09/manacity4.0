import { useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import showToast from '@/components/ui/Toast';
import type { RootState } from '@/store';
import type { User } from '@/types/user';

interface RoleGuardRouteProps {
  allowedRoles: User['role'][];
  redirectTo?: string;
}

const RoleGuardRoute = ({ allowedRoles, redirectTo = '/home' }: RoleGuardRouteProps) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const location = useLocation();
  const hasAnnounced = useRef(false);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.includes(user.role)) {
    hasAnnounced.current = false;
    return <Outlet />;
  }

  if (!hasAnnounced.current) {
    hasAnnounced.current = true;
    showToast('You do not have permission to view this page.', 'error');
  }

  return <Navigate to={redirectTo} replace state={{ from: location }} />;
};

export default RoleGuardRoute;
