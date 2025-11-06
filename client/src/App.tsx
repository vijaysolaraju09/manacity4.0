import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/auth/AuthProvider';
import AppRoutes from '@/routes';
import ThemeProvider from '@/theme/ThemeProvider';
import { store } from '@/store';

const App = () => (
  <Provider store={store}>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </Provider>
);

export { AppRoutes } from '@/routes';
export default App;
