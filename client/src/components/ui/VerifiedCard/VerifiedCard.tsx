import { AiFillCheckCircle, AiFillStar } from 'react-icons/ai';
import { motion } from 'framer-motion';
import fallbackImage from '../../../assets/no-image.svg';
import styles from './VerifiedCard.module.scss';

export interface VerifiedCardProps {
  user: {
    _id: string;
    name: string;
    profession: string;
    location: string;
    avatarUrl?: string;
    rating?: number;
  };
  onClick?: () => void;
}

const VerifiedCard = ({ user, onClick }: VerifiedCardProps) => {
  return (
    <motion.div
      className={styles.card}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick?.();
      }}
    >
      <div className={styles.badge}>
        <AiFillCheckCircle />
      </div>
      <img
        className={styles.avatar}
        src={
          user.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`
        }
        alt={user.name}
        onError={(e) => (e.currentTarget.src = fallbackImage)}
      />
      <div className={styles.info}>
        <h3>{user.name}</h3>
        <p className={styles.profession}>{user.profession}</p>
        <p className={styles.location}>{user.location}</p>
        <div className={styles.rating}>
          <AiFillStar />
          <span>{user.rating?.toFixed(1) ?? 'N/A'}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default VerifiedCard;
