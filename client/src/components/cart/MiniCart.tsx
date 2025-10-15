import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ShoppingCart, Trash2, X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import showToast from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import {
  clearCart,
  selectCartItems,
  selectItemCount,
  selectSubtotalPaise,
} from '@/store/slices/cartSlice';
import type { CartItem } from '@/store/slices/cartSlice';
import { paths } from '@/routes/paths';
import { formatINR } from '@/utils/currency';

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

const popoverMotion = {
  initial: { opacity: 0, y: -6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
};

const sheetMotion = {
  initial: { x: '100%' },
  animate: { x: 0 },
  exit: { x: '100%' },
};

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
    <div className="flex h-full w-full flex-col gap-5" role="document">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id={headingId} className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Mini cart
          </p>
          <p
            id={descriptionId}
            className="text-xs text-slate-500 transition-colors duration-150 dark:text-slate-400"
          >
            {hasItems
              ? `${count} item${count === 1 ? '' : 's'} ready to checkout`
              : 'Your cart is empty'}
          </p>
        </div>
        {onDismiss ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            aria-label="Close mini cart"
            className="-mr-1 rounded-full text-slate-500 shadow-none transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
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
                  className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 text-sm shadow-sm transition hover:border-blue-200 hover:bg-white hover:shadow-md dark:border-slate-700/80 dark:bg-slate-800/70 dark:hover:border-blue-500/40 dark:hover:bg-slate-800"
                  role="listitem"
                >
                  <div className="min-w-0">
                    <p
                      className="truncate font-medium text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-300"
                      title={item.name}
                    >
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
          <div className="flex items-center justify-between rounded-xl bg-slate-900/5 px-4 py-3 text-sm font-medium text-slate-700 dark:bg-slate-100/5 dark:text-slate-200">
            <span>Subtotal</span>
            <span>{subtotalFormatted}</span>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/80 p-6 text-center text-sm text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-400">
          Add items to start your order.
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          onClick={onViewCart}
          className="group flex w-full items-center justify-center gap-2 rounded-full sm:w-auto"
          variant="default"
        >
          View cart
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Button>
        <Button
          onClick={onClear}
          variant="outline"
          className="flex w-full items-center justify-center gap-2 rounded-full border-slate-300/70 text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          disabled={!hasItems}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
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

  const formatPrice = useCallback((value: number) => formatINR(value), []);

  const formattedItems = useMemo<FormattedCartItem[]>(
    () =>
      items.map((item) => ({
        ...item,
        lineTotal: formatPrice(item.pricePaise * item.qty),
      })),
    [items, formatPrice],
  );

  const subtotalFormatted = useMemo(
    () => formatPrice(subtotalPaise),
    [formatPrice, subtotalPaise],
  );

  const handleClear = useCallback(() => {
    dispatch(clearCart());
    showToast('Cart cleared', 'info');
  }, [dispatch]);

  const closePanels = useCallback(() => {
    setPopoverOpen(false);
    setSheetOpen(false);
  }, []);

  const handleViewCart = useCallback(() => {
    closePanels();
    navigate(paths.cart());
  }, [closePanels, navigate]);

  const triggerLabel = 'Cart';

  const triggerContent = (
    <>
      <ShoppingCart
        className="h-5 w-5 text-slate-600 transition-colors group-hover:text-slate-900 group-focus-visible:text-slate-900 dark:text-slate-200 dark:group-hover:text-white dark:group-focus-visible:text-white"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      {showLabel ? (
        <span className="ml-2 text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-white">
          Cart
        </span>
      ) : null}
      <span
        className="pointer-events-none absolute right-0 top-0 z-10 flex min-h-[1.25rem] min-w-[1.25rem] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white shadow ring-2 ring-white transition dark:bg-blue-500 dark:ring-slate-900"
        aria-hidden="true"
      >
        {count}
      </span>
      <span className="sr-only" aria-live="polite">
        {count === 1 ? '1 item in cart' : `${count} items in cart`}
      </span>
    </>
  );

  const triggerClasses = cn(
    'group relative inline-flex items-center justify-center font-medium text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-200 dark:hover:text-white dark:focus-visible:ring-offset-slate-900',
    showLabel
      ? 'h-10 min-w-[3rem] gap-2 rounded-full bg-slate-100 px-4 py-2 shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
      : 'h-10 w-10 rounded-full bg-transparent transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-100 dark:hover:bg-slate-800',
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
        <AnimatePresence>
          {popoverOpen ? (
            <motion.div
              ref={popoverRef}
              role="dialog"
              aria-modal="false"
              aria-labelledby={headingId}
              aria-describedby={descriptionId}
              id={contentId}
              className="absolute z-50 mt-3 w-80 max-w-[92vw] rounded-2xl border border-slate-200/80 bg-white/95 p-5 text-left shadow-2xl outline-none backdrop-blur-sm transition dark:border-slate-700/80 dark:bg-slate-900/95"
              style={align === 'end' ? { right: 0 } : { left: 0 }}
              initial={popoverMotion.initial}
              animate={popoverMotion.animate}
              exit={popoverMotion.exit}
              transition={{ duration: 0.16, ease: 'easeOut' }}
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
            </motion.div>
          ) : null}
        </AnimatePresence>
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

      {mounted
        ? createPortal(
            <AnimatePresence>
              {sheetOpen ? (
                <div
                  id={contentId}
                  className="fixed inset-0 z-[100] flex"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={headingId}
                  aria-describedby={descriptionId}
                >
                  <motion.button
                    type="button"
                    className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
                    aria-label="Close mini cart"
                    onClick={() => setSheetOpen(false)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.div
                    ref={sheetContentRef}
                    tabIndex={-1}
                    className="ml-auto flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto bg-white/95 p-7 shadow-2xl outline-none backdrop-blur-sm dark:bg-slate-950/90"
                    initial={sheetMotion.initial}
                    animate={sheetMotion.animate}
                    exit={sheetMotion.exit}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
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
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
};

export default MiniCart;
