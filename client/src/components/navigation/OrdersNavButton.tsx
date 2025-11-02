import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AiOutlineShoppingCart } from 'react-icons/ai';

import Button, { type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { paths } from '@/routes/paths';
import {
  fetchMyOrders,
  selectMyPendingOrdersCount,
} from '@/store/orders';
import type { AppDispatch, RootState } from '@/store';

export type OrdersNavButtonProps = {
  showLabel?: boolean;
  label?: string;
} & Omit<ButtonProps, 'children' | 'aria-label'>;

const OrdersNavButton = ({
  showLabel = false,
  label = 'Orders',
  className,
  variant,
  size,
  onClick,
  ...rest
}: OrdersNavButtonProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const ordersStatus = useSelector((state: RootState) => state.orders.mine.status);
  const pendingCount = useSelector(selectMyPendingOrdersCount);

  useEffect(() => {
    if (ordersStatus === 'idle') {
      dispatch(fetchMyOrders());
    }
  }, [dispatch, ordersStatus]);

  const handleClick = useCallback(
    (event: Parameters<NonNullable<ButtonProps['onClick']>>[0]) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      navigate(paths.orders.mine());
    },
    [navigate, onClick],
  );

  const resolvedVariant = variant ?? 'ghost';
  const resolvedSize = size ?? (showLabel ? 'default' : 'icon');
  const badgeLabel = pendingCount > 99 ? '99+' : String(pendingCount);
  const statusMessage = useMemo(() => {
    if (pendingCount === 0) return 'No pending orders';
    return `${pendingCount} pending order${pendingCount === 1 ? '' : 's'}`;
  }, [pendingCount]);

  return (
    <Button
      type="button"
      variant={resolvedVariant}
      size={resolvedSize}
      aria-label="Cart"
      onClick={handleClick}
      className={cn(
        'group relative inline-flex items-center justify-center text-sm font-medium text-ink-600 transition-colors hover:bg-[var(--surface-card)] hover:text-ink-900 focus-visible:ring-2 focus-visible:ring-[color:var(--brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] dark:text-ink-500 dark:hover:bg-[color-mix(in_srgb,var(--ink-500)_20%,transparent)] dark:hover:text-ink-900 dark:focus-visible:ring-offset-[var(--surface-card)]',
        showLabel ? 'gap-2 rounded-xl px-4 py-2' : 'h-10 w-10 rounded-xl',
        className,
      )}
      {...rest}
    >
      <AiOutlineShoppingCart className="h-5 w-5" aria-hidden="true" />
      {showLabel ? <span className="text-sm font-medium">{label}</span> : null}
      {pendingCount > 0 ? (
        <span
          className="absolute right-0 top-0 flex min-h-[1.1rem] min-w-[1.1rem] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-brand-500 px-1 text-[0.65rem] font-semibold text-white shadow ring-2 ring-[var(--surface)] dark:bg-brand-400 dark:ring-[color:var(--surface-card)]"
          aria-hidden="true"
        >
          {badgeLabel}
        </span>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {statusMessage}
      </span>
    </Button>
  );
};

export default OrdersNavButton;
