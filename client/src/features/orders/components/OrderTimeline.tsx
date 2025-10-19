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
      <div className="absolute left-3 top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
      {steps.map((step) => {
        const Icon = step.icon;
        return (
          <li key={step.key} className="relative flex flex-col gap-1">
            <div
              className={cn(
                'absolute -left-[22px] flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900',
                step.state === 'done' && 'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/40 dark:text-emerald-300',
                step.state === 'current' && 'border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-500/40 dark:text-blue-300',
                step.state === 'cancelled' && 'border-rose-200 bg-rose-500/10 text-rose-600 dark:border-rose-500/40 dark:text-rose-300',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="ml-3 flex flex-col gap-1 rounded-2xl bg-slate-50/60 px-5 py-3 text-sm text-slate-600 shadow-sm dark:bg-slate-800/60 dark:text-slate-200">
              <p className="font-semibold text-slate-900 dark:text-white">{step.label}</p>
              {step.at ? (
                <span className="text-xs text-slate-500 dark:text-slate-300">
                  {new Date(step.at).toLocaleString()}
                </span>
              ) : null}
              {step.note ? <p className="text-xs text-slate-500 dark:text-slate-300">{step.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default memo(OrderTimeline);
