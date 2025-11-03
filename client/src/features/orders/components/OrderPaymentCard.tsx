import { CreditCard } from 'lucide-react';

import Badge from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatINR } from '@/utils/currency';

import type { OrderTotals } from '@/store/orders';

type OrderPaymentCardProps = {
  totals: OrderTotals;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
};

const OrderPaymentCard = ({ totals, paymentMethod, paymentStatus }: OrderPaymentCardProps) => {
  return (
    <Card className="rounded-3xl border border-borderc/40 bg-surface-1/90 shadow-sm dark:border-borderc/40 dark:bg-surface-1/70">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg font-semibold">Payment summary</CardTitle>
        <Badge className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
          {paymentStatus ? paymentStatus : 'Paid'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-text-secondary dark:text-text-secondary">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>Items total</span>
            <span className="font-semibold text-text-primary dark:text-white">{formatINR(totals.itemsPaise)}</span>
          </div>
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-300">
            <span>Discount</span>
            <span>-{formatINR(totals.discountPaise)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Taxes &amp; fees</span>
            <span>{formatINR(totals.taxPaise)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Shipping</span>
            <span>{formatINR(totals.shippingPaise)}</span>
          </div>
        </div>
        <Separator className="bg-surface-2 dark:bg-surface-2" />
        <div className="flex items-center justify-between text-base font-semibold text-text-primary dark:text-white">
          <span>Grand total</span>
          <span>{formatINR(totals.grandPaise)}</span>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-borderc/40 bg-surface-1/70 px-4 py-3 text-xs text-text-secondary dark:border-borderc/40 dark:bg-surface-2/70 dark:text-text-secondary">
          <CreditCard className="h-4 w-4 text-[color:var(--brand-500)]" aria-hidden="true" />
          <span>{paymentMethod ? `Paid via ${paymentMethod}` : 'Paid using saved method'}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderPaymentCard;
