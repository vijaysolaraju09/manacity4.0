import { useState } from 'react';
import { motion } from 'framer-motion';
import { AiFillHeart, AiOutlineHeart } from 'react-icons/ai';
import styles from './WishlistHeart.module.scss';

const WishlistHeart = () => {
  const [active, setActive] = useState(false);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActive((prev) => !prev);
  };

  return (
    <motion.button
      type="button"
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className={styles.button}
    >
      {active ? <AiFillHeart className={styles.filled} /> : <AiOutlineHeart />}
    </motion.button>
  );
};

export default WishlistHeart;
