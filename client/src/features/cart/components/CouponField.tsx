import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Loader2, Ticket, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type CouponFieldProps = {
  value: string;
  onApply: (code: string) => Promise<void> | void;
  onRemove: () => void;
  state?: 'idle' | 'loading' | 'applied' | 'error';
  error?: string | null;
};

const CouponField = ({ value, onApply, onRemove, state = 'idle', error }: CouponFieldProps) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = draft.trim();
    if (!code) return;
    await onApply(code);
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <Ticket className="h-4 w-4 text-blue-500" aria-hidden="true" />
        Apply coupon
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Enter coupon code"
          className="h-12 rounded-full border-slate-200 bg-white/60 px-5 text-sm font-medium uppercase tracking-[0.2em] text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100"
          aria-label="Coupon code"
          disabled={state === 'loading'}
        />
        {state === 'applied' ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onRemove}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-50 px-6 text-sm font-semibold text-emerald-600 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
          >
            Remove
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={state === 'loading' || !draft.trim()}
            className="inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold"
          >
            {state === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              'Apply'
            )}
          </Button>
        )}
      </div>
      {error ? (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      {state === 'applied' ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-300">Coupon applied successfully.</p>
      ) : null}
    </form>
  );
};

export default CouponField;
