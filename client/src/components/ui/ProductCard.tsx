import { motion } from 'framer-motion';
import { AiFillStar } from 'react-icons/ai';
import { useDispatch } from 'react-redux';
import api from '../../api/client';
import { addToCart } from '../../store/slices/cartSlice';
import fallbackImage from '../../assets/no-image.svg';
import WishlistHeart from './WishlistHeart';
import PriceBlock from './PriceBlock';
import showToast from './Toast';
import styles from './ProductCard.module.scss';

export interface Product {
  _id: string;
  name: string;
  price: number;
  mrp?: number;
  discount?: number;
  image?: string;
  rating?: number;
  description?: string;
  stock?: number;
}

interface Props {
  product: Product;
  showActions?: boolean;
  onAddToCart?: () => void;
  onClick?: () => void;
  className?: string;
}

const ProductCard = ({
  product,
  showActions = true,
  onAddToCart,
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
      showToast('Added to cart');
    } catch {
      showToast('Failed to add to cart', 'error');
    }
  };

  const computedDiscount =
    product.discount !== undefined
      ? product.discount
      : product.mrp
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : undefined;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`${styles.card} ${className}`}
      onClick={onClick}
    >
      <div className={styles.imageWrapper}>
        <img
          src={product.image || fallbackImage}
          alt={product.name}
          loading="lazy"
          onError={(e) => (e.currentTarget.src = fallbackImage)}
        />
        {computedDiscount && (
          <span className={styles.badge}>{computedDiscount}% OFF</span>
        )}
        <div className={styles.wishlist}>
          <WishlistHeart />
        </div>
      </div>
      <div className={styles.info}>
        <h4>{product.name}</h4>
        <PriceBlock
          price={product.price}
          mrp={product.mrp}
          discount={computedDiscount}
        />
        {product.rating && (
          <div className={styles.row}>
            <AiFillStar color="var(--color-warning)" />
            <span>{product.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      {showActions && (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <button onClick={onAddToCart || handleAdd}>Add to Cart</button>
        </div>
      )}
    </motion.div>
  );
};

export default ProductCard;
