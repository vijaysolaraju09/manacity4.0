import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import api from '../../api/client';
import { addToCart } from '../../store/slices/cartSlice';
import fallbackImage from '../../assets/no-image.svg';
import styles from './ProductCard.module.scss';

export interface BasicProduct {
  _id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  stock?: number;
}

interface Props {
  product: BasicProduct;
  showActions?: boolean;
  onAddToCart?: () => void;
  onShowInterest?: () => void;
  onClick?: () => void;
  className?: string;
}

const ProductCard = ({
  product,
  showActions = true,
  onAddToCart,
  onShowInterest,
  onClick,
  className = '',
}: Props) => {
  const dispatch = useDispatch();

  const handleAdd = async () => {
    try {
      await api.post('/cart', { productId: product._id, quantity: 1 });
      dispatch(
        addToCart({
          id: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
        })
      );
    } catch {
      alert('Failed to add to cart');
    }
  };

  const handleInterest = async () => {
    try {
      const qty = parseInt(prompt('Quantity', '1') || '1', 10);
      await api.post(`/interests/${product._id}`, { quantity: qty });
      alert('Interest sent');
    } catch {
      alert('Failed to send interest');
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${styles.card} ${className}`}
      onClick={onClick}
    >
      <img
        src={product.image || 'https://via.placeholder.com/200'}
        alt={product.name}
        onError={(e) => (e.currentTarget.src = fallbackImage)}
      />
      <div className={styles.info}>
        <h4>{product.name}</h4>
        <p className={styles.price}>₹{product.price}</p>
        {product.description && <p className={styles.desc}>{product.description}</p>}
        {product.stock !== undefined && (
          <p className={styles.stock}>Available: {product.stock}</p>
        )}
      </div>
      {showActions && (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <button onClick={onAddToCart || handleAdd}>Add to Cart</button>
          <button onClick={onShowInterest || handleInterest}>Interested</button>
        </div>
      )}
    </motion.div>
  );
};

export default ProductCard;
