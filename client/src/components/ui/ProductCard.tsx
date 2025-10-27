import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AiFillStar } from 'react-icons/ai';
import getImageOrPlaceholder from '@/utils/getImageOrPlaceholder';
import WishlistHeart from './WishlistHeart';
import PriceBlock from './PriceBlock';
import styles from './ProductCard.module.scss';
import AddToCartButton from './AddToCartButton';

export interface Product extends Record<PropertyKey, unknown> {
  _id: string;
  name: string;
  pricePaise: number;
  mrpPaise?: number;
  discountPercent?: number;
  image?: string;
  rating?: number;
  description?: string;
  stock?: number;
  available?: boolean;
  isActive?: boolean;
  isDeleted?: boolean;
}

interface Props {
  product: Product;
  showActions?: boolean;
  onClick?: () => void;
  onOrder?: () => void | boolean | Promise<void | boolean>;
  className?: string;
  actions?: ReactNode;
}

const ProductCard = ({
  product,
  showActions = true,
  onClick,
  onOrder,
  className = '',
  actions,
}: Props) => {
  const computedDiscount =
    product.discountPercent !== undefined
      ? product.discountPercent
      : product.mrpPaise
      ? Math.max(
          0,
          Math.round(
            ((Math.max(0, product.mrpPaise) - Math.max(0, product.pricePaise)) /
              Math.max(1, product.mrpPaise)) *
              100,
          ),
        )
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
          src={getImageOrPlaceholder(product.image)}
          alt={product.name}
          loading="lazy"
          onError={(event) => {
            const placeholder = getImageOrPlaceholder(null);
            if (event.currentTarget.src !== placeholder) {
              event.currentTarget.src = placeholder;
            }
          }}
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
          pricePaise={product.pricePaise}
          mrpPaise={product.mrpPaise}
          discountPercent={computedDiscount}
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
          {actions ?? (
            <AddToCartButton
              product={product}
              qty={1}
              onAdd={onOrder}
              className={styles.actionButton}
            />
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ProductCard;
