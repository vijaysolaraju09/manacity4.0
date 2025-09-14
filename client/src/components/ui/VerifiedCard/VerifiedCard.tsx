import { AiFillCheckCircle, AiFillStar } from 'react-icons/ai';
import { motion } from 'framer-motion';
import fallbackImage from '../../../assets/no-image.svg';
import styles from './VerifiedCard.module.scss';
import type { VerifiedCard as VCard } from '@/types/verified';

export interface VerifiedCardProps {
  card: VCard;
  onClick?: () => void;
}

const VerifiedCard = ({ card, onClick }: VerifiedCardProps) => {
  const u = card.user;
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
        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`}
        alt={u.name}
        onError={(e) => (e.currentTarget.src = fallbackImage)}
      />
      <div className={styles.info}>
        <h3>{u.name}</h3>
        <p className={styles.profession}>{card.profession}</p>
        <p className={styles.location}>{u.location}</p>
        <div className={styles.rating}>
          <AiFillStar />
          <span>{
            card.ratingAvg !== undefined
              ? card.ratingAvg.toFixed(1)
              : 'N/A'
          }</span>
        </div>
      </div>
    </motion.div>
  );
};

export default VerifiedCard;
