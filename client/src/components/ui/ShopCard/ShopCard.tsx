import { motion } from 'framer-motion';
import { FiMapPin } from 'react-icons/fi';
import styles from './ShopCard.module.scss';
import fallbackImage from '../../../assets/no-image.svg';

export interface ShopCardProps {
  shop: {
    _id: string;
    name: string;
    category: string;
    location?: string;
    image?: string;
    logo?: string;
    banner?: string;
    rating?: number;
    distance?: number;
    isOpen?: boolean;
  };
  onClick?: () => void;
}

const ShopCard = ({ shop, onClick }: ShopCardProps) => (
  <motion.div whileHover={{ scale: 1.02 }} className={styles.card} onClick={onClick}>
    <img
      src={shop.banner || shop.logo || shop.image || fallbackImage}
      alt={shop.name}
      onError={(e) => (e.currentTarget.src = fallbackImage)}
    />
    <div className={styles.info}>
      <h3>{shop.name}</h3>
      <p className={styles.category}>{shop.category}</p>
      {shop.location && (
        <p className={styles.location}>
          <FiMapPin aria-hidden="true" />
          <span>{shop.location}</span>
        </p>
      )}
      <div className={styles.meta}>
        {shop.rating !== undefined && (
          <span className={styles.rating}>★ {shop.rating.toFixed(1)}</span>
        )}
        {shop.distance !== undefined && (
          <span className={styles.distance}>{shop.distance} km</span>
        )}
        {shop.isOpen !== undefined && (
          <span
            className={`${styles.status} ${shop.isOpen ? styles.open : styles.closed}`}
          >
            {shop.isOpen ? 'Open' : 'Closed'}
          </span>
        )}
      </div>
      <button
        type="button"
        className={styles.cta}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.();
        }}
      >
        View Shop
      </button>
    </div>
  </motion.div>
);

export default ShopCard;

