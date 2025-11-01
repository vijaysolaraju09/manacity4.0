import { useState, type ReactNode } from 'react';
import { toErrorMessage } from '@/lib/response';
import { useCartActions } from '@/hooks/useCartActions';
import { type ProductInput } from '@/lib/cartItem';
import showToast from './Toast';

type AddToCartButtonProps = {
  product: ProductInput;
  qty?: number;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  onAdd?: () => void | boolean | Promise<void | boolean>;
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
  const { addToCart } = useCartActions();
  const [pending, setPending] = useState(false);

  const productRecord: ProductInput = product;

  const rawStock = (productRecord as Record<string, unknown> | null)?.stock as unknown;
  let outOfStock = false;
  if (typeof rawStock === 'number') {
    outOfStock = rawStock <= 0;
  } else if (typeof rawStock === 'string') {
    const parsed = Number(rawStock);
    outOfStock = Number.isFinite(parsed) ? parsed <= 0 : false;
  }

  const rawIsActive = (productRecord as Record<string, unknown> | null)?.isActive as unknown;
  const rawIsDeleted = (productRecord as Record<string, unknown> | null)?.isDeleted as unknown;

  const isInactive = typeof rawIsActive === 'boolean' && !rawIsActive;
  const isDeleted = typeof rawIsDeleted === 'boolean' && rawIsDeleted;

  const computedDisabled = disabledProp || pending || isInactive || isDeleted || outOfStock;

  const handleClick = async () => {
    if (computedDisabled) return;

    try {
      if (onAdd) {
        const result = onAdd();
        if (result instanceof Promise) {
          const awaited = await result;
          if (awaited === false) {
            return;
          }
        } else if (result === false) {
          return;
        }
      }
    } catch (err) {
      showToast(toErrorMessage(err), 'error');
      return;
    }

    const quantity = normalizeQuantity(qty);
    setPending(true);
    try {
      addToCart(productRecord, quantity);
      showToast('Added to cart');
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
