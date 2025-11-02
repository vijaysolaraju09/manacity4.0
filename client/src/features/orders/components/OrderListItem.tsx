import { memo, useMemo } from 'react';
import { ArrowRight, FileText, RefreshCw, Truck } from 'lucide-react';

import Badge, { type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatINR } from '@/utils/currency';
import fallbackImage from '@/assets/no-image.svg';

import type { Order, OrderStatus } from '@/store/orders';

const statusTone: Record<OrderStatus, BadgeVariant> = {
  draft: 'secondary',
  pending: 'warning',
  placed: 'default',
  confirmed: 'default',
  accepted: 'default',
  rejected: 'danger',
  preparing: 'default',
  ready: 'success',
  out_for_delivery: 'default',
  delivered: 'success',
  cancelled: 'secondary',
  completed: 'success',
  returned: 'warning',
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
  const addressSummary = useMemo(() => {
    const address = order.shippingAddress;
    if (!address) return null;
    return [address.address1, address.address2, address.city, address.pincode]
      .filter((value) => typeof value === 'string' && value.trim())
      .join(', ');
  }, [order.shippingAddress]);

  return (
    <Card className="flex flex-col gap-4 rounded-3xl border border-[color:var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-card)_92%,transparent)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-[color:var(--border-subtle)]/60 dark:bg-[color-mix(in_srgb,var(--surface-card)_70%,transparent)]">
      <CardContent className="flex flex-col gap-4 p-0">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-20 w-20 shrink-0 grid-cols-2 grid-rows-2 overflow-hidden rounded-2xl border border-[color:var(--border-subtle)]/60 bg-[color-mix(in_srgb,var(--surface-card)_88%,transparent)] shadow-inner dark:border-[color:var(--border-subtle)]/40 dark:bg-[color-mix(in_srgb,var(--surface-card)_60%,transparent)]">
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
                    <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--ink-900)_85%,transparent)] text-sm font-semibold text-white">
                      +{extraCount}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink-900 dark:text-ink-900">Order #{order.id.slice(-6)}</p>
                <Badge
                  variant={statusTone[order.status]}
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                >
                  {order.status.replace(/_/g, ' ').toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-ink-500 dark:text-ink-500">Placed {formatDate(order.createdAt)}</p>
              <p className="text-xs font-semibold text-ink-600 dark:text-ink-500">
                {shopName}
                {order.items?.length ? ` • ${order.items.length} item${order.items.length === 1 ? '' : 's'}` : ''}
              </p>
              {addressSummary ? (
                <p className="text-xs text-ink-500 dark:text-ink-500">Deliver to: {addressSummary}</p>
              ) : null}
            </div>
          </div>
          <div className="ml-auto flex flex-col items-end gap-2 text-right">
            <span className="text-sm text-ink-500 dark:text-ink-500">Grand total</span>
            <span className="text-lg font-semibold text-ink-900 dark:text-ink-900">{formatINR(totalPaise)}</span>
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
            className="rounded-full px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] hover:text-[var(--brand-600)] dark:text-ink-500 dark:hover:bg-[color-mix(in_srgb,var(--brand-500)_16%,transparent)]"
            onClick={onTrack}
          >
            <Truck className="mr-2 h-4 w-4" aria-hidden="true" />
            Track order
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] hover:text-[var(--brand-600)] dark:text-ink-500 dark:hover:bg-[color-mix(in_srgb,var(--brand-500)_16%,transparent)]"
            onClick={onInvoice}
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            Invoice
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-[color-mix(in_srgb,var(--brand-500)_12%,transparent)] hover:text-[var(--brand-600)] dark:text-ink-500 dark:hover:bg-[color-mix(in_srgb,var(--brand-500)_16%,transparent)]"
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
