import { useState, type ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { http } from '@/lib/http';
import { toItem, toErrorMessage } from '@/lib/response';
import { addItem } from '@/store/slices/cartSlice';
import { buildCartItemPayload } from '@/lib/cart';
import showToast from './Toast';

type ProductShape = Record<PropertyKey, unknown>;

type AddToCartButtonProps = {
  product: ProductShape | null | undefined;
  qty?: number;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  onAdd?: () => void;
};

const normalizeQuantity = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  const qty = Math.floor(value);
  return qty > 0 ? qty : 1;
};

const AddToCartButton = ({
  product,
  qty = 1,
  className,
  children,
  disabled: disabledProp = false,
  onAdd,
}: AddToCartButtonProps) => {
  const dispatch = useDispatch();
  const [pending, setPending] = useState(false);

  const productRecord: ProductShape = (product ?? {}) as ProductShape;

  const hasStockProp = Object.prototype.hasOwnProperty.call(productRecord, 'stock');
  const rawStock = productRecord.stock as unknown;
  let outOfStock = false;
  if (hasStockProp) {
    if (typeof rawStock === 'number') {
      outOfStock = rawStock <= 0;
    } else if (typeof rawStock === 'string') {
      const parsed = Number(rawStock);
      outOfStock = Number.isFinite(parsed) ? parsed <= 0 : true;
    } else if (rawStock === null || rawStock === undefined) {
      outOfStock = true;
    }
  }

  const rawIsActive = productRecord.isActive as unknown;
  const rawIsDeleted = productRecord.isDeleted as unknown;

  const isInactive =
    Object.prototype.hasOwnProperty.call(productRecord, 'isActive') &&
    typeof rawIsActive === 'boolean' &&
    !rawIsActive;
  const isDeleted = typeof rawIsDeleted === 'boolean' && rawIsDeleted;

  const computedDisabled = disabledProp || pending || isInactive || isDeleted || outOfStock;

  const handleClick = async () => {
    if (computedDisabled) return;

    const quantity = normalizeQuantity(qty);
    const basePayload = buildCartItemPayload({
      product: productRecord as any,
      quantity,
    });

    if (!basePayload) {
      showToast('Unable to add this product to cart. Please try again later.', 'error');
      return;
    }

    setPending(true);
    try {
      const res = await http.post('/cart', { productId: basePayload.productId, quantity });
      const responseItem = toItem(res) as any;
      const payload = buildCartItemPayload({
        product: productRecord as any,
        quantity,
        responseItem,
      });

      if (!payload) {
        showToast('Unable to determine product details. Please try again.', 'error');
        return;
      }

      dispatch(addItem(payload));
      showToast('Added to cart');
      onAdd?.();
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
    } finally {
      setPending(false);
    }
  };

  const buttonClassName = ['add-to-cart-button', className].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={buttonClassName || undefined}
      onClick={handleClick}
      disabled={computedDisabled}
      aria-disabled={computedDisabled}
      aria-busy={pending}
    >
      {pending ? 'Adding…' : children ?? 'Add to Cart'}
    </button>
  );
};

export default AddToCartButton;
