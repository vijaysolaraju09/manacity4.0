import { useEffect, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const theme = useSelector((state: RootState) => state.theme);
  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);
  return <>{children}</>;
};

export default ThemeProvider;
