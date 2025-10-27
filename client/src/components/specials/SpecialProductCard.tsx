import type { MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import PriceBlock from '@/components/ui/PriceBlock';
import type { Product } from '@/store/products';
import {
  ensureSpecialProductImage,
  getSpecialProductCallPhone,
  getSpecialProductCtaLabel,
  getSpecialProductDetailsTarget,
  getSpecialProductDiscount,
  isSpecialProductCallToOrder,
} from '@/utils/specialProducts';
import { DEFAULT_SPECIAL_PRODUCT_IMAGE } from '@/constants/specials';
import styles from './SpecialProductCard.module.scss';

interface Props {
  product: Product;
  onDetails?: (product: Product) => void;
  className?: string;
}

const SpecialProductCard = ({ product, onDetails, className }: Props) => {
  const image = ensureSpecialProductImage(product);
  const discount = getSpecialProductDiscount(product);
  const callToOrder = isSpecialProductCallToOrder(product);
  const phone = getSpecialProductCallPhone(product);
  const label = getSpecialProductCtaLabel(product);
  const detailsTarget = getSpecialProductDetailsTarget(product);
  const clickable = Boolean(onDetails) && !callToOrder && Boolean(detailsTarget);

  const handleDetails = () => {
    if (!clickable || !onDetails) return;
    onDetails(product);
  };

  const handleDetailsButton = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleDetails();
  };

  return (
    <motion.article
      className={cn(styles.card, clickable && styles.clickable, className)}
      whileHover={clickable ? { scale: 1.01 } : undefined}
      whileTap={clickable ? { scale: 0.98 } : undefined}
      onClick={clickable ? handleDetails : undefined}
    >
      <div className={styles.imageWrapper}>
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = DEFAULT_SPECIAL_PRODUCT_IMAGE;
          }}
        />
        {discount ? <span className={styles.discountBadge}>{discount}% OFF</span> : null}
      </div>
      <div className={styles.content}>
        <h3 className={styles.title}>{product.name}</h3>
        {product.description ? (
          <p className={styles.description}>{product.description}</p>
        ) : null}
        <PriceBlock
          pricePaise={product.pricePaise}
          mrpPaise={product.mrpPaise}
          discountPercent={discount}
          className={styles.priceBlock}
        />
      </div>
      <div className={styles.actions}>
        {callToOrder && phone ? (
          <a
            className={cn(styles.button, styles.callButton)}
            href={`tel:${phone}`}
            onClick={(event) => event.stopPropagation()}
          >
            {label || 'Call to Order'}
          </a>
        ) : clickable ? (
          <button type="button" className={styles.button} onClick={handleDetailsButton}>
            {label || 'View details'}
          </button>
        ) : null}
      </div>
    </motion.article>
  );
};

export default SpecialProductCard;
