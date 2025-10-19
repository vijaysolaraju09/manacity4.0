import { memo, useMemo } from 'react';
import { ArrowRight, FileText, RefreshCw, Truck } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatINR } from '@/utils/currency';
import fallbackImage from '@/assets/no-image.svg';

import type { Order, OrderStatus } from '@/store/orders';

const statusTone: Record<OrderStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  placed: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  confirmed: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
  accepted: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
  preparing: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200',
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  out_for_delivery: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200',
  cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
  completed: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-500/30 dark:text-emerald-100',
  returned: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200',
};

type OrderListItemProps = {
  order: Order;
  onView: () => void;
  onTrack?: () => void;
  onInvoice?: () => void;
  onReorder?: () => void;
  onCancel?: () => void;
  onReturn?: () => void;
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return new Date(value).toLocaleString();
  }
};

const OrderListItem = ({
  order,
  onView,
  onTrack,
  onInvoice,
  onReorder,
  onCancel,
  onReturn,
}: OrderListItemProps) => {
  const productImages = useMemo(() => {
    const images = order.items?.map((item) => item.image || fallbackImage).slice(0, 3) ?? [];
    return images.length > 0 ? images : [fallbackImage];
  }, [order.items]);

  const extraCount = Math.max(0, (order.items?.length ?? 0) - 3);
  const shopName = order.shop?.name ?? 'Shop';
  const totalPaise = order.totals?.grandPaise ?? 0;
  const showCancel = Boolean(onCancel);
  const showReturn = Boolean(onReturn);

  return (
    <Card className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800/70 dark:bg-slate-900/70">
      <CardContent className="flex flex-col gap-4 p-0">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-20 w-20 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 shadow-inner dark:border-slate-700/70 dark:bg-slate-800/60">
              {productImages.map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="relative h-full w-full"
                  style={{ gridColumn: productImages.length === 1 ? '1 / span 2' : undefined, gridRow: productImages.length === 1 ? '1 / span 2' : undefined }}
                >
                  <img
                    src={src}
                    alt="Order item"
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {index === productImages.length - 1 && extraCount > 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-sm font-semibold text-white">
                      +{extraCount}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Order #{order.id.slice(-6)}</p>
                <Badge className={cn('rounded-full px-3 py-1 text-xs font-semibold', statusTone[order.status])}>
                  {order.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-300">Placed {formatDate(order.createdAt)}</p>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {shopName}
                {order.items?.length ? ` • ${order.items.length} item${order.items.length === 1 ? '' : 's'}` : ''}
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-col items-end gap-2 text-right">
            <span className="text-sm text-slate-500 dark:text-slate-300">Grand total</span>
            <span className="text-lg font-semibold text-slate-900 dark:text-white">{formatINR(totalPaise)}</span>
            <Button
              type="button"
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              onClick={onView}
            >
              View details
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onTrack}
          >
            <Truck className="mr-2 h-4 w-4" aria-hidden="true" />
            Track order
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onInvoice}
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            Invoice
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onReorder}
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reorder
          </Button>
          {showCancel ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-full px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-500/20"
              onClick={onCancel}
            >
              Cancel
            </Button>
          ) : null}
          {showReturn ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-full px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-300 dark:hover:bg-amber-500/20"
              onClick={onReturn}
            >
              Return
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(OrderListItem);
