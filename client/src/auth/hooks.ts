import { useAuth } from '@/auth/AuthProvider';
import { useDispatch } from 'react-redux';
import { logoutUser } from '@/store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { paths } from '@/routes/paths';
import type { AppDispatch } from '@/store';

export function useUnifiedLogout() {
  const { signOut } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  return async function unifiedLogout() {
    try {
      await signOut();
    } finally {
      await dispatch(logoutUser());
      navigate(paths.auth.login(), { replace: true });
    }
  };
}
