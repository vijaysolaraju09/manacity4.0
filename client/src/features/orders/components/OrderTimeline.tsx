import { memo, useMemo } from 'react';
import { CheckCircle2, Clock, Package, Truck, Smile } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { OrderStatus, OrderTimelineEntry } from '@/store/orders';

const baseSteps: { key: OrderStatus; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'placed', label: 'Order placed', icon: Clock },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'preparing', label: 'Preparing', icon: Package },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Smile },
];

type OrderTimelineProps = {
  status: OrderStatus;
  timeline: OrderTimelineEntry[];
};

const resolveStepState = (step: OrderStatus, status: OrderStatus): 'done' | 'current' | 'upcoming' | 'cancelled' => {
  if (status === 'cancelled' || status === 'returned' || status === 'rejected') {
    if (step === status) return 'cancelled';
    if (step === 'placed') return 'done';
    return 'cancelled';
  }

  const order = baseSteps.map((entry) => entry.key);
  const statusIndex = order.indexOf(status);
  const stepIndex = order.indexOf(step);
  if (statusIndex === -1 || stepIndex === -1) return 'upcoming';
  if (stepIndex < statusIndex) return 'done';
  if (stepIndex === statusIndex) return 'current';
  return 'upcoming';
};

const OrderTimeline = ({ status, timeline }: OrderTimelineProps) => {
  const timelineMap = useMemo(() => {
    const map = new Map<OrderStatus, OrderTimelineEntry>();
    for (const entry of timeline) {
      if (!entry) continue;
      map.set(entry.status, entry);
    }
    return map;
  }, [timeline]);

  const steps = baseSteps.map((step) => {
    const entry = timelineMap.get(step.key);
    const state = resolveStepState(step.key, status);
    return {
      ...step,
      state,
      note: entry?.note,
      at: entry?.at,
    };
  });

  return (
    <ol className="relative space-y-6 pl-6">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-[color:var(--border-subtle)]/70 dark:bg-[color:var(--border-subtle)]/40" aria-hidden="true" />
      {steps.map((step) => {
        const Icon = step.icon;
        return (
          <li key={step.key} className="relative flex flex-col gap-1">
            <div
              className={cn(
                'absolute -left-[22px] flex h-10 w-10 items-center justify-center rounded-full border-2 border-[color:var(--border-subtle)] bg-[var(--surface)] text-ink-400 shadow-sm dark:border-[color:var(--border-subtle)]/50 dark:bg-[var(--surface-card)]',
                step.state === 'done' && 'border-[color:var(--success-500)]/40 bg-[color-mix(in_srgb,var(--success-500)_18%,transparent)] text-[var(--success-500)] dark:text-[var(--success-500)]',
                step.state === 'current' && 'border-[color:var(--brand-400)] bg-[color-mix(in_srgb,var(--brand-500)_18%,transparent)] text-[var(--brand-600)] dark:text-[var(--brand-400)]',
                step.state === 'cancelled' && 'border-[color:var(--danger-500)]/40 bg-[color-mix(in_srgb,var(--danger-500)_18%,transparent)] text-[var(--danger-500)] dark:text-[var(--danger-500)]',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="ml-3 flex flex-col gap-1 rounded-2xl bg-[color-mix(in_srgb,var(--surface-card)_88%,transparent)] px-5 py-3 text-sm text-ink-500 shadow-sm dark:bg-[color-mix(in_srgb,var(--surface-card)_62%,transparent)] dark:text-ink-500">
              <p className="font-semibold text-ink-900 dark:text-ink-900">{step.label}</p>
              {step.at ? (
                <span className="text-xs text-ink-400 dark:text-ink-500">
                  {new Date(step.at).toLocaleString()}
                </span>
              ) : null}
              {step.note ? <p className="text-xs text-ink-400 dark:text-ink-500">{step.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default memo(OrderTimeline);
