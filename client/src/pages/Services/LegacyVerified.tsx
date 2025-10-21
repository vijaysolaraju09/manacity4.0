import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/button';
import { paths } from '@/routes/paths';
import styles from './ServicesCatalog.module.scss';

const LegacyVerified = () => {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Verified directory moved</h1>
        <p className={styles.subtitle}>
          The verified professionals experience now lives inside Services. Explore the service catalog or raise a service request to share custom needs.
        </p>
        <div className={styles.actions}>
          <Button onClick={() => navigate(paths.services.catalog())}>Go to Services</Button>
          <Button variant="secondary" onClick={() => navigate(paths.services.request())}>
            Raise Service Request
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LegacyVerified;
