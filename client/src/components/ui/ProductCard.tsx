import { motion } from 'framer-motion';
import { AiFillStar } from 'react-icons/ai';
import { useDispatch } from 'react-redux';
import api from '../../api/client';
import { addToCart } from '../../store/slices/cartSlice';
import fallbackImage from '../../assets/no-image.svg';
import WishlistHeart from './WishlistHeart';
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
  onPlaceOrder?: () => void;
  onClick?: () => void;
  className?: string;
}

const ProductCard = ({
  product,
  showActions = true,
  onAddToCart,
  onPlaceOrder,
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

  const handleOrder = async () => {
    try {
      const qty = parseInt(prompt('Quantity', '1') || '1', 10);
      await api.post(`/orders/place/${product._id}`, { quantity: qty });
      alert('Order request sent');
    } catch {
      alert('Failed to send order');
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
          src={product.image || 'https://via.placeholder.com/200'}
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
        <div className={styles.priceRow}>
          <span>₹{product.price}</span>
          {product.mrp && <span className={styles.mrp}>₹{product.mrp}</span>}
          {computedDiscount && (
            <span className={styles.discount}>{computedDiscount}% off</span>
          )}
        </div>
        {product.rating && (
          <div className={styles.priceRow}>
            <AiFillStar color="var(--color-warning)" />
            <span>{product.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
      {showActions && (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <button onClick={onAddToCart || handleAdd}>Add to Cart</button>
          <button onClick={onPlaceOrder || handleOrder}>Order</button>
        </div>
      )}
    </motion.div>
  );
};

export default ProductCard;
