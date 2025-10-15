import PriceBlock from './PriceBlock';
import WishlistHeart from '../ui/WishlistHeart';
import styles from './ProductCard.module.scss';

export interface Product {
  id: string;
  title: string;
  image: string;
  pricePaise: number;
  mrpPaise?: number;
  discountPercent?: number;
}

interface ProductCardProps {
  product: Product;
  ctaLabel: string;
  onCtaClick: (product: Product) => void;
  onClick?: () => void;
  className?: string;
}

const ProductCard = ({ product, ctaLabel, onCtaClick, onClick, className = '' }: ProductCardProps) => {
  return (
    <div
      className={`${styles.card} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={onClick ? `View ${product.title}` : undefined}
    >
      <div className={styles.imageWrapper}>
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          width={300}
          height={400}
        />
        {product.discountPercent && (
          <span className={styles.badge}>{product.discountPercent}% OFF</span>
        )}
        <div className={styles.wishlist}>
          <WishlistHeart />
        </div>
      </div>
      <div className={styles.info}>
        <h4>{product.title}</h4>
        <PriceBlock
          pricePaise={product.pricePaise}
          mrpPaise={product.mrpPaise}
          discountPercent={product.discountPercent}
        />
      </div>
      <button
        type="button"
        className={styles.cta}
        onClick={(e) => {
          e.stopPropagation();
          onCtaClick(product);
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
};

export default ProductCard;
