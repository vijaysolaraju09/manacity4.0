import styles from './NotificationsCard.module.scss';

export interface NotificationsCardProps {
  title: string;
  message: string;
  time?: string;
}

const NotificationsCard = ({ title, message, time }: NotificationsCardProps) => (
  <div className={styles.card}>
    <div className={styles.title}>{title}</div>
    <div>{message}</div>
    {time && <div className={styles.time}>{time}</div>}
  </div>
);

export default NotificationsCard;
