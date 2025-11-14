import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { paths } from '@/routes/paths';

const ProtectedRoute = () => {
  const location = useLocation();
  const token = localStorage.getItem('token');
  if (!token) {
    if (location.pathname.startsWith(paths.events.list())) {
      return <Outlet />;
    }
    const redirectTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={paths.auth.login()} replace state={{ from: redirectTo }} />;
  }
  return <Outlet />;
};

export default ProtectedRoute;
