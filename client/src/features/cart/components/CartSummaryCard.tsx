import { useMemo } from 'react';
import { BadgeIndianRupee, CreditCard, Lock, ShieldCheck } from 'lucide-react';

import Badge from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import showToast from '@/components/ui/Toast';
import { formatINR } from '@/utils/currency';

import CouponField from './CouponField';
import FreeShippingBar from './FreeShippingBar';

type CartSummaryCardProps = {
  subtotalPaise: number;
  discountPaise?: number;
  shippingPaise?: number;
  onCheckout: () => void;
  disabled?: boolean;
  couponCode: string;
  onApplyCoupon: (code: string) => Promise<void> | void;
  onRemoveCoupon: () => void;
  couponState?: 'idle' | 'loading' | 'applied' | 'error';
  couponError?: string | null;
  itemCount: number;
  freeShippingThresholdPaise: number;
};

const paymentIcons = [
  { label: 'COD', icon: CreditCard },
  { label: 'UPI', icon: BadgeIndianRupee },
  { label: 'Cards', icon: CreditCard },
];

const CartSummaryCard = ({
  subtotalPaise,
  discountPaise = 0,
  shippingPaise = 0,
  onCheckout,
  disabled,
  couponCode,
  onApplyCoupon,
  onRemoveCoupon,
  couponState = 'idle',
  couponError,
  itemCount,
  freeShippingThresholdPaise,
}: CartSummaryCardProps) => {
  const totalPaise = useMemo(
    () => Math.max(0, subtotalPaise - Math.max(0, discountPaise) + Math.max(0, shippingPaise)),
    [subtotalPaise, discountPaise, shippingPaise],
  );

  const savingsPaise = Math.max(0, discountPaise);

  return (
    <Card className="sticky top-24 flex flex-col rounded-3xl border border-slate-200/80 bg-white/90 shadow-xl backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
      <CardHeader className="gap-2">
        <CardTitle className="text-lg font-semibold tracking-tight">Price details</CardTitle>
        <p className="text-sm text-slate-500 dark:text-slate-400">{itemCount} item{itemCount === 1 ? '' : 's'} in cart</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <CouponField
          value={couponCode}
          onApply={async (code) => {
            try {
              await onApplyCoupon(code);
              showToast('Coupon applied', 'success');
            } catch (error) {
              showToast((error as Error)?.message ?? 'Coupon failed', 'error');
            }
          }}
          onRemove={() => {
            onRemoveCoupon();
            showToast('Coupon removed', 'info');
          }}
          state={couponState}
          error={couponError}
        />

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Item total</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{formatINR(subtotalPaise)}</span>
          </div>
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-300">
            <span>Discounts</span>
            <span>-{formatINR(savingsPaise)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Shipping</span>
            <span>{shippingPaise > 0 ? formatINR(shippingPaise) : 'Calculated at checkout'}</span>
          </div>
        </div>

        <Separator className="bg-slate-200 dark:bg-slate-800" />

        <div className="flex items-center justify-between text-base font-semibold text-slate-900 dark:text-white">
          <span>Grand total</span>
          <span>{formatINR(totalPaise)}</span>
        </div>

        <Badge className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
          You saved {formatINR(savingsPaise)} on this order
        </Badge>

        <FreeShippingBar
          subtotalPaise={subtotalPaise}
          thresholdPaise={freeShippingThresholdPaise}
        />

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-xs text-slate-500 shadow-inner dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-blue-500" aria-hidden="true" />
            <span>100% secure payments with PCI-DSS compliance.</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-500" aria-hidden="true" />
            <span>We never store your card details.</span>
          </div>
          <div className="flex items-center gap-3">
            {paymentIcons.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-300"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button
          type="button"
          className="w-full rounded-full py-3 text-base font-semibold shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          onClick={onCheckout}
          disabled={disabled}
        >
          Proceed to checkout
        </Button>
        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Secure checkout powered by Manacity Pay
        </p>
      </CardFooter>
    </Card>
  );
};

export default CartSummaryCard;
