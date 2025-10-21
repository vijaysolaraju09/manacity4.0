import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Button from '@/components/ui/button';
import { paths } from '@/routes/paths';
import styles from './ServicesHub.module.scss';

const ServicesHub = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const catalogPath = paths.services.catalog();
  const requestsPath = paths.services.requests();
  const myRequestsPath = paths.services.requestsMine();

  const isRequestsRoute = location.pathname.startsWith(requestsPath);
  const isMyRequestsRoute = location.pathname.startsWith(myRequestsPath);

  const handlePrimaryTab = (target: 'catalog' | 'requests') => {
    if (target === 'catalog') {
      navigate(catalogPath);
    } else {
      navigate(requestsPath);
    }
  };

  const handleRequestsTab = (target: 'public' | 'mine') => {
    if (target === 'mine') {
      navigate(myRequestsPath);
    } else {
      navigate(requestsPath);
    }
  };

  const handleMyRequests = () => {
    navigate(myRequestsPath);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Services</h1>
        <p className={styles.subtitle}>
          Browse curated services or request help from the community. Track offers from providers and stay
          updated as your request progresses.
        </p>
        <div className={styles.navRow}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={isRequestsRoute ? styles.tab : `${styles.tab} ${styles.tabActive}`}
              onClick={() => handlePrimaryTab('catalog')}
              aria-current={!isRequestsRoute ? 'page' : undefined}
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
          </div>
          <Button className={styles.requestButton} onClick={handleMyRequests}>
            My Service Requests
          </Button>
        </div>
        {isRequestsRoute ? (
          <div className={styles.subTabs}>
            <button
              type="button"
              className={isMyRequestsRoute ? styles.subTab : `${styles.subTab} ${styles.subTabActive}`}
              onClick={() => handleRequestsTab('public')}
              aria-current={!isMyRequestsRoute ? 'page' : undefined}
            >
              Public Requests
            </button>
            <button
              type="button"
              className={isMyRequestsRoute ? `${styles.subTab} ${styles.subTabActive}` : styles.subTab}
              onClick={() => handleRequestsTab('mine')}
              aria-current={isMyRequestsRoute ? 'page' : undefined}
            >
              My Requests
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
};

export default ServicesHub;
