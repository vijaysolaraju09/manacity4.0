import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import Button from '@/components/ui/button';
import { paths } from '@/routes/paths';
import styles from './ServicesHub.module.scss';

const ServicesHub = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const catalogPath = paths.services.catalog();
  const requestsPath = paths.services.requests();
  const myRequestsPath = paths.services.requestsMine();
  const createRequestPath = paths.services.request();

  const normalizedPath =
    location.pathname.endsWith('/') && location.pathname !== '/'
      ? location.pathname.slice(0, -1)
      : location.pathname;

  const isCatalogRoute = normalizedPath === catalogPath;
  const isRequestsRoute = normalizedPath === requestsPath;
  const isMyRequestsRoute = normalizedPath === myRequestsPath;

  const handlePrimaryTab = (target: 'catalog' | 'requests' | 'myRequests') => {
    if (target === 'catalog') {
      navigate(catalogPath);
      return;
    }

    if (target === 'requests') {
      navigate(requestsPath);
      return;
    }

    navigate(myRequestsPath);
  };

  const handleCreateRequest = () => {
    navigate(createRequestPath);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Services</h1>
          <Button className={styles.createButton} onClick={handleCreateRequest}>
            <Plus aria-hidden="true" className={styles.createIcon} />
            Create
          </Button>
        </div>
        <div className={styles.navRow}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={isCatalogRoute ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => handlePrimaryTab('catalog')}
              aria-current={isCatalogRoute ? 'page' : undefined}
            >
              Catalog
            </button>
            <button
              type="button"
              className={isRequestsRoute ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => handlePrimaryTab('requests')}
              aria-current={isRequestsRoute ? 'page' : undefined}
            >
              Requests
            </button>
            <button
              type="button"
              className={isMyRequestsRoute ? `${styles.tab} ${styles.tabActive}` : styles.tab}
              onClick={() => handlePrimaryTab('myRequests')}
              aria-current={isMyRequestsRoute ? 'page' : undefined}
            >
              My Requests
            </button>
          </div>
        </div>
      </div>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

export default ServicesHub;
