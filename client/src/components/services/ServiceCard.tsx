import type { ReactNode } from 'react';
import styles from './ServiceCard.module.scss';
import type { Service } from '@/types/services';

interface ServiceCardProps {
  service: Service;
  onClick?: () => void;
  footer?: ReactNode;
}

const ServiceCard = ({ service, onClick, footer }: ServiceCardProps) => {
  const icon = service.icon && service.icon.trim() ? service.icon.trim() : service.name?.charAt(0) ?? 'S';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : -1}
      className={styles.card}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className={styles.header}>
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
        <div className={styles.title}>{service.name}</div>
      </div>
      {service.description ? (
        <p className={styles.description}>{service.description}</p>
      ) : (
        <p className={styles.description}>Explore providers for this service.</p>
      )}
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
};

export default ServiceCard;
