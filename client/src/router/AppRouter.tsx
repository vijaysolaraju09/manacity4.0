import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthProvider';
import { ProtectedRoute, PublicOnlyRoute } from '@/auth/routes';
import { Spinner } from '@/components/ui/Spinner';

const Landing = lazy(() => import('@/pages/Landing/Landing'));
const Signup = lazy(() => import('@/pages/auth/Signup'));
const Login = lazy(() => import('@/pages/auth/Login'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const Dashboard = lazy(() => import('@/pages/Home/Home'));

const FullscreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
    <div className="flex items-center gap-3 rounded-xl bg-slate-900/80 px-6 py-4 shadow-xl">
      <Spinner ariaLabel="Loading" />
      <span className="font-semibold">Loading experience…</span>
    </div>
  </div>
);

const AppRouter = () => (
  <BrowserRouter>
    <AuthProvider>
      <Suspense fallback={<FullscreenLoader />}>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/signup" element={<Navigate to="/signup" replace />} />
            <Route path="/auth/login" element={<Navigate to="/login" replace />} />
            <Route path="/auth/forgot" element={<ForgotPassword />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<Dashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  </BrowserRouter>
);

export default AppRouter;
