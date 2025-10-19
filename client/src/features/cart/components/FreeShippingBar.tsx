import { memo } from 'react';

import { cn } from '@/lib/utils';
import { formatINR } from '@/utils/currency';

type FreeShippingBarProps = {
  subtotalPaise: number;
  thresholdPaise: number;
};

const FreeShippingBar = ({ subtotalPaise, thresholdPaise }: FreeShippingBarProps) => {
  const threshold = Math.max(0, thresholdPaise);
  const subtotal = Math.max(0, subtotalPaise);
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.max(0, Math.min(1, threshold === 0 ? 1 : subtotal / threshold));

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-blue-900 shadow-inner dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">Free delivery progress</p>
        <span className="text-xs font-medium uppercase tracking-wide text-blue-700/80 dark:text-blue-200">
          {Math.round(progress * 100)}%
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-blue-100 dark:bg-blue-500/20" role="progressbar" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(subtotal, threshold)}>
        <div
          className={cn('h-full rounded-full bg-blue-500 transition-all duration-300 ease-out dark:bg-blue-400', progress >= 1 && 'bg-emerald-500 dark:bg-emerald-400')}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-blue-800/90 dark:text-blue-200/90">
        {remaining > 0 ? (
          <>
            Add <span className="font-semibold">{formatINR(remaining)}</span> more for free delivery.
          </>
        ) : (
          <span className="font-semibold text-emerald-600 dark:text-emerald-300">You unlocked free delivery!</span>
        )}
      </p>
    </div>
  );
};

export default memo(FreeShippingBar);
