import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import './styles/main.scss';
import { setToken, fetchMe } from './store/slices/authSlice';
import { setAdminToken } from './store/slices/adminSlice';
import type { AppDispatch } from './store';
import { AppRoutes } from './routes';

function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      dispatch(setToken(token));
      dispatch(fetchMe());
    }

    const adminToken = localStorage.getItem('manacity_admin_token');
    if (adminToken) {
      dispatch(setAdminToken(adminToken));
    }
  }, [dispatch]);

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export { AppRoutes };
export default App;
