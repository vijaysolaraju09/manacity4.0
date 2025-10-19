import { ShoppingCart } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyCartProps {
  onContinue: () => void;
}

const EmptyCart = ({ onContinue }: EmptyCartProps) => (
  <Card className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-blue-50/40 to-blue-100/30 px-8 py-10 text-center shadow-xl dark:border-slate-800/70 dark:from-slate-900 dark:via-slate-900/60 dark:to-blue-900/30">
    <CardContent className="flex flex-col items-center gap-6 p-0">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 shadow-inner dark:bg-blue-500/20">
        <ShoppingCart className="h-12 w-12" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Your cart awaits premium finds</h1>
        <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-300">
          Discover curated products from trusted neighbourhood shops. Add items you love and check out in a single, secure flow.
        </p>
      </div>
      <Button
        type="button"
        onClick={onContinue}
        className="rounded-full px-6 py-2.5 text-sm font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        Continue shopping
      </Button>
    </CardContent>
  </Card>
);

export default EmptyCart;
