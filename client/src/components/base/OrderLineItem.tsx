import PriceBlock from './PriceBlock';
import QuantityStepper from './QuantityStepper';
import styles from './OrderLineItem.module.scss';

export interface OrderLineItemProps {
  image?: string;
  title: string;
  pricePaise: number;
  quantity: number;
  onQuantityChange: (q: number) => void;
  onRemove: () => void;
}

const OrderLineItem = ({
  image,
  title,
  pricePaise,
  quantity,
  onQuantityChange,
  onRemove,
}: OrderLineItemProps) => (
  <div className={styles.item}>
    {image && <img src={image} alt={title} />}
    <div className={styles.info}>
      <h4 className={styles.title}>{title}</h4>
      <PriceBlock pricePaise={pricePaise} />
    </div>
    <div className={styles.actions}>
      <QuantityStepper value={quantity} onChange={onQuantityChange} />
      <button type="button" className={styles.remove} onClick={onRemove} aria-label="Remove item">
        Remove
      </button>
    </div>
  </div>
);

export default OrderLineItem;
