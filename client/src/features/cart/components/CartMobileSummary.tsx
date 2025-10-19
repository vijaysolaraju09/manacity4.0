import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatINR } from '@/utils/currency';

type CartMobileSummaryProps = {
  totalPaise: number;
  itemCount: number;
  onCheckout: () => void;
  disabled?: boolean;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  summaryContent: React.ReactNode;
};

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 0.6 },
  exit: { opacity: 0 },
};

const sheetMotion = {
  initial: { y: '100%' },
  animate: { y: 0 },
  exit: { y: '100%' },
};

const CartMobileSummary = ({
  totalPaise,
  itemCount,
  onCheckout,
  disabled,
  open,
  onOpenChange,
  summaryContent,
}: CartMobileSummaryProps) => {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeydown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [open, onOpenChange]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 shadow-2xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/90 lg:hidden">
      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total</span>
          <span className="text-base font-semibold text-slate-900 dark:text-white">{formatINR(totalPaise)}</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
        </div>
        <Button
          type="button"
          className="ml-auto rounded-full px-6 py-2 text-sm font-semibold"
          onClick={onCheckout}
          disabled={disabled}
        >
          Place order
        </Button>
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-label="Toggle order summary"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <ChevronUp className={`h-5 w-5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-slate-900/80"
              {...overlayMotion}
              onClick={() => onOpenChange(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-800/80 dark:bg-slate-900"
              {...sheetMotion}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            >
              <div className="mx-auto max-w-md space-y-4">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                {summaryContent}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default CartMobileSummary;
