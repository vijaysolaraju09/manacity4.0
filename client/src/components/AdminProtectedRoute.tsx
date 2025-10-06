import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { paths } from '@/routes/paths';

const AdminProtectedRoute = () => {
  const token =
    useSelector((state: RootState) => state.admin.token) ||
    localStorage.getItem('manacity_admin_token');
  if (!token) {
    return <Navigate to={paths.admin.login()} replace />;
  }
  return <Outlet />;
};

export default AdminProtectedRoute;
