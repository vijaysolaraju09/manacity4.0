import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const isHashNavigation = typeof hash === 'string' && hash.length > 0;
    if (isHashNavigation) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname, search, hash]);

  return null;
};

export default ScrollToTop;
