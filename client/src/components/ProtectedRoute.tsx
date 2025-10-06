import { Navigate, Outlet } from 'react-router-dom';
import { paths } from '@/routes/paths';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to={paths.auth.login()} replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
