import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FaShoppingCart } from 'react-icons/fa';
import { FiX } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { clearCart, selectCartItems, selectItemCount, selectSubtotalPaise } from '@/store/slices/cartSlice';
import { paths } from '@/routes/paths';
import type { CartItem } from '@/store/slices/cartSlice';

type FormattedCartItem = CartItem & { lineTotal: string };

type MiniCartProps = {
  className?: string;
  showLabel?: boolean;
  align?: 'start' | 'end';
  triggerClassName?: string;
};

interface MiniCartPanelProps {
  items: FormattedCartItem[];
  count: number;
  subtotalFormatted: string;
  onViewCart: () => void;
  onClear: () => void;
  onDismiss?: () => void;
  headingId: string;
  descriptionId: string;
}

const MiniCartPanel = ({
  items,
  count,
  subtotalFormatted,
  onViewCart,
  onClear,
  onDismiss,
  headingId,
  descriptionId,
}: MiniCartPanelProps) => {
  const hasItems = count > 0;
  return (
    <div className="flex h-full w-full flex-col gap-4" role="document">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id={headingId} className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Mini cart
          </p>
          <p id={descriptionId} className="text-xs text-slate-500 dark:text-slate-400">
            {hasItems ? `${count} item${count === 1 ? '' : 's'} ready to checkout` : 'Your cart is empty'}
          </p>
        </div>
        {onDismiss ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            aria-label="Close mini cart"
            className="-mr-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <FiX className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {hasItems ? (
        <>
          <div className="max-h-64 overflow-y-auto pr-1" role="presentation">
            <ul role="list" className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.productId}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-800/60"
                  role="listitem"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Qty: {item.qty}</p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {item.lineTotal}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-between rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <span>Subtotal</span>
            <span>{subtotalFormatted}</span>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Add items to start your order.
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          onClick={onViewCart}
          className="sm:min-w-[140px]"
          variant="default"
        >
          View Cart
        </Button>
        <Button
          onClick={onClear}
          variant="outline"
          className="sm:min-w-[120px]"
          disabled={!hasItems}
        >
          Clear
        </Button>
      </div>
    </div>
  );
};

const MiniCart = ({ className, showLabel = false, align = 'end', triggerClassName }: MiniCartProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector(selectCartItems);
  const count = useSelector(selectItemCount);
  const subtotalPaise = useSelector(selectSubtotalPaise);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const sheetContentRef = useRef<HTMLDivElement | null>(null);
  const headingId = useId();
  const descriptionId = useId();
  const contentId = `${headingId}-mini-cart`;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!popoverOpen) return;
    const handlePointerDown = (event: PointerEvent | MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        (popoverRef.current?.contains(target) || triggerRef.current?.contains(target))
      ) {
        return;
      }
      setPopoverOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPopoverOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [popoverOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSheetOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);

    const focusTimeout = window.setTimeout(() => {
      sheetContentRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
      window.clearTimeout(focusTimeout);
    };
  }, [sheetOpen]);

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
      }),
    [],
  );

  const formattedItems = useMemo<FormattedCartItem[]>(
    () =>
      items.map((item) => ({
        ...item,
        lineTotal: formatter.format((item.pricePaise * item.qty) / 100),
      })),
    [items, formatter],
  );

  const subtotalFormatted = useMemo(
    () => formatter.format(subtotalPaise / 100),
    [formatter, subtotalPaise],
  );

  const handleClear = useCallback(() => {
    dispatch(clearCart());
  }, [dispatch]);

  const closePanels = useCallback(() => {
    setPopoverOpen(false);
    setSheetOpen(false);
  }, []);

  const handleViewCart = useCallback(() => {
    closePanels();
    navigate(paths.cart());
  }, [closePanels, navigate]);

  const triggerLabel = showLabel ? 'Open cart preview' : 'Open cart';

  const triggerContent = (
    <>
      <FaShoppingCart className="h-5 w-5" aria-hidden="true" />
      {showLabel ? <span className="ml-2 text-sm font-medium">Cart</span> : null}
      <span
        className="absolute -right-2 -top-1 min-h-[1.25rem] min-w-[1.25rem] rounded-full bg-blue-600 px-1.5 text-center text-xs font-semibold text-white shadow ring-2 ring-white transition dark:bg-blue-500 dark:ring-slate-900"
        aria-live="polite"
        aria-atomic="true"
      >
        {count}
      </span>
      <span className="sr-only" aria-live="polite">
        {count === 1 ? '1 item in cart' : `${count} items in cart`}
      </span>
    </>
  );

  const triggerClasses = cn(
    'relative font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-200',
    showLabel
      ? 'h-10 min-w-[3rem] gap-2 rounded-full bg-slate-100 px-4 py-2 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
      : 'h-10 w-10 rounded-full bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800',
    triggerClassName,
  );

  return (
    <div className={cn('flex items-center', className)}>
      <div className={cn('hidden md:block', showLabel ? 'w-full' : undefined)}>
        <Button
          ref={triggerRef}
          variant="ghost"
          size={showLabel ? 'default' : 'icon'}
          className={triggerClasses}
          aria-haspopup="dialog"
          aria-expanded={popoverOpen}
          aria-controls={contentId}
          aria-label={triggerLabel}
          onClick={() => setPopoverOpen((state) => !state)}
        >
          {triggerContent}
        </Button>
        {popoverOpen ? (
          <div
            ref={popoverRef}
            role="dialog"
            aria-modal="false"
            aria-labelledby={headingId}
            aria-describedby={descriptionId}
            id={contentId}
            className="absolute z-50 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl focus:outline-none dark:border-slate-700 dark:bg-slate-900"
            style={align === 'end' ? { right: 0 } : { left: 0 }}
          >
            <MiniCartPanel
              items={formattedItems}
              count={count}
              subtotalFormatted={subtotalFormatted}
              onViewCart={handleViewCart}
              onClear={handleClear}
              onDismiss={() => setPopoverOpen(false)}
              headingId={headingId}
              descriptionId={descriptionId}
            />
          </div>
        ) : null}
      </div>

      <div className="md:hidden">
        <Button
          variant="ghost"
          size={showLabel ? 'default' : 'icon'}
          className={triggerClasses}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-controls={contentId}
          aria-label={triggerLabel}
          onClick={() => setSheetOpen(true)}
        >
          {triggerContent}
        </Button>
      </div>

      {mounted && sheetOpen
        ? createPortal(
            <div
              id={contentId}
              className="fixed inset-0 z-[100] flex"
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingId}
              aria-describedby={descriptionId}
            >
              <button
                type="button"
                className="absolute inset-0 bg-slate-950/60"
                aria-label="Close mini cart"
                onClick={() => setSheetOpen(false)}
              />
              <div
                ref={sheetContentRef}
                tabIndex={-1}
                className="ml-auto flex h-full w-full max-w-sm flex-col gap-4 overflow-y-auto bg-white p-6 shadow-2xl outline-none transition-transform duration-200 ease-out dark:bg-slate-900"
              >
                <MiniCartPanel
                  items={formattedItems}
                  count={count}
                  subtotalFormatted={subtotalFormatted}
                  onViewCart={handleViewCart}
                  onClear={handleClear}
                  onDismiss={() => setSheetOpen(false)}
                  headingId={headingId}
                  descriptionId={descriptionId}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
};

export default MiniCart;
