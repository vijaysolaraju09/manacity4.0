import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { Spinner } from '@/components/ui/Spinner';
import { paths } from '@/routes/paths';

const LoadingScreen = ({ label }: { label: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-900/70 p-6">
    <div className="rounded-2xl bg-white/95 p-8 shadow-lg ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <Spinner ariaLabel={label} />
        <p className="font-medium text-slate-700" aria-live="polite">
          {label}
        </p>
      </div>
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
