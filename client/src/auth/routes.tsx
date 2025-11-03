import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';
import { paths } from '@/routes/paths';

const LoadingScreen = ({ label }: { label: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-surface0 dark:bg-surface0 p-6 text-hi">
    <div className="surface-2 flex items-center gap-3 p-6 text-md shadow-elev2">
      <Spinner ariaLabel={label} />
      <p className="font-medium text-hi" aria-live="polite">
        {label}
      </p>
    </div>
  </div>
);

export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen label="Checking your session" />;
  }

  if (!user) {
    return <Navigate to={paths.auth.login()} replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export const PublicOnlyRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen label="Preparing your experience" />;
  }

  if (user) {
    const redirectTo = (location.state as { from?: Location })?.from ?? { pathname: '/' };
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
