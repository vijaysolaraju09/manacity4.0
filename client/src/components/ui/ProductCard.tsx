import { motion } from 'framer-motion';
import { AiFillStar } from 'react-icons/ai';
import { useDispatch } from 'react-redux';
import { http } from '@/lib/http';
import { toItem, toErrorMessage } from '@/lib/response';
import { addItem } from '../../store/slices/cartSlice';
import fallbackImage from '../../assets/no-image.svg';
import WishlistHeart from './WishlistHeart';
import PriceBlock from './PriceBlock';
import showToast from './Toast';
import styles from './ProductCard.module.scss';
import { toCartItem } from '@/lib/cart';

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
  available?: boolean;
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
      const productId = product._id || (product as any).id;
      if (!productId) {
        showToast('Unable to add this product to cart. Please try again later.', 'error');
        return;
      }
      const res = await http.post('/cart', { productId, quantity: 1 });
      const cartItem = toItem(res) as any;
      let payload: ReturnType<typeof toCartItem>;
      try {
        payload = toCartItem(product, 1, cartItem);
      } catch {
        showToast('Unable to determine product details. Please try again.', 'error');
        return;
      }
      dispatch(addItem(payload));
      showToast('Added to cart');
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
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
