import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, Plus, Tag, Trash2, Truck } from 'lucide-react';

import Badge from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import QuantityStepper from '@/components/ui/QuantityStepper/QuantityStepper';
import { cn } from '@/lib/utils';
import { formatINR } from '@/utils/currency';
import { computeSavings, formatPercent, formatSavings } from '@/utils/pricing';

import type { CartDisplayItem } from '../types';

type CartItemCardProps = {
  item: CartDisplayItem;
  selected: boolean;
  onSelectChange: (selected: boolean) => void;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
  onSaveForLater: () => void;
  disabled?: boolean;
};

const availabilityToneStyles: Record<NonNullable<CartDisplayItem['availabilityTone']>, string> = {
  default: 'text-emerald-600 dark:text-emerald-400',
  low: 'text-amber-600 dark:text-amber-400',
  out: 'text-rose-600 dark:text-rose-400',
};

const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const CartItemCard = ({
  item,
  selected,
  onSelectChange,
  onQtyChange,
  onRemove,
  onSaveForLater,
  disabled = false,
}: CartItemCardProps) => {
  const { savingsPaise, savingsPercent } = useMemo(
    () => computeSavings(item.mrpPaise, item.unitPricePaise),
    [item.mrpPaise, item.unitPricePaise],
  );

  const savingsLabel = useMemo(() => formatPercent(savingsPercent), [savingsPercent]);
  const savingsValue = useMemo(() => formatSavings(savingsPaise), [savingsPaise]);

  const availabilityTone = item.availabilityTone ?? 'default';
  const availabilityClass = availabilityToneStyles[availabilityTone];

  return (
    <motion.li
      layout
      variants={itemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="list-none"
    >
      <Card
        className={cn(
          'relative flex flex-col gap-5 rounded-3xl border border-slate-200/60 bg-white/80 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl focus-within:ring-2 focus-within:ring-blue-500/70 dark:border-slate-800/70 dark:bg-slate-900/70 dark:hover:border-blue-500/50',
          disabled && 'opacity-60',
        )}
      >
        <CardContent className="flex flex-col gap-5 p-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
            <div className="flex items-start gap-4 md:w-2/3">
              <div className="flex flex-col items-center gap-3 pt-1">
                <label className="inline-flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded-full border border-slate-300 text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-600"
                    checked={selected}
                    onChange={(event) => onSelectChange(event.target.checked)}
                    aria-label={`Select ${item.name}`}
                    disabled={disabled}
                  />
                </label>
                <div className="hidden flex-col items-center gap-1 text-xs font-medium text-slate-400 md:flex">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500/60"
                    onClick={() => onQtyChange(Math.max(1, item.qty - 1))}
                    aria-label={`Reduce quantity of ${item.name}`}
                    disabled={disabled || item.qty <= 1}
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <span>{item.qty}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500/60"
                    onClick={() => onQtyChange(item.qty + 1)}
                    aria-label={`Increase quantity of ${item.name}`}
                    disabled={disabled}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50 shadow-inner dark:border-slate-700/80 dark:bg-slate-800">
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {savingsLabel ? (
                    <Badge className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                      <Tag className="h-3 w-3" aria-hidden="true" />
                      Save {savingsLabel}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    {item.brand ? (
                      <a
                        href={item.shopUrl ?? '#'}
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300"
                      >
                        {item.brand}
                      </a>
                    ) : null}
                    <a
                      href={item.productUrl ?? '#'}
                      className="text-base font-semibold leading-tight text-slate-900 transition hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-50"
                    >
                      <span className="line-clamp-2" title={item.name}>
                        {item.name}
                      </span>
                    </a>
                    {item.variantLabels && item.variantLabels.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                        {item.variantLabels.map((label) => (
                          <span
                            key={label}
                            className="rounded-full border border-slate-200/80 bg-slate-50 px-2 py-1 text-[11px] font-medium uppercase tracking-wide dark:border-slate-700 dark:bg-slate-800"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex flex-wrap items-baseline gap-2 text-base font-semibold text-slate-900 dark:text-white" aria-live="polite">
                      <span>{formatINR(item.unitPricePaise)}</span>
                      {item.mrpPaise && item.mrpPaise > item.unitPricePaise ? (
                        <span className="text-sm font-normal text-slate-500 line-through dark:text-slate-400">
                          {formatINR(item.mrpPaise)}
                        </span>
                      ) : null}
                      {savingsValue ? (
                        <Badge className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200">
                          You save {savingsValue}
                        </Badge>
                      ) : null}
                    </div>

                    <p className={cn('flex items-center gap-2 text-xs font-medium', availabilityClass)}>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.availabilityLabel ?? 'In stock'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col items-end gap-4 md:w-1/3">
              <div className="flex items-center gap-3 self-stretch rounded-2xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Qty</span>
                <QuantityStepper
                  value={item.qty}
                  onChange={onQtyChange}
                  ariaLabel={`Update quantity for ${item.name}`}
                  className="ml-auto"
                  disabled={disabled}
                />
              </div>

              <div className="flex items-baseline gap-2 text-right text-lg font-semibold text-slate-900 dark:text-white" aria-live="polite">
                <span>{formatINR(item.lineTotalPaise)}</span>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={onSaveForLater}
                  disabled={disabled}
                >
                  Save for later
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-500/20"
                  onClick={onRemove}
                  disabled={disabled}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </Button>
              </div>

              <div className="flex flex-col gap-2 self-stretch rounded-2xl bg-slate-900/90 px-4 py-3 text-xs text-white shadow-md dark:bg-slate-800">
                <p className="flex items-center gap-2 font-medium">
                  <Truck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                  {item.deliveryMessage ?? 'Delivery in 2-4 days'}
                </p>
                {item.shippingNote ? (
                  <p className="text-[11px] text-slate-300">{item.shippingNote}</p>
                ) : (
                  <p className="text-[11px] text-slate-300">Free above ₹499 • Easy returns</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.li>
  );
};

export default memo(CartItemCard);
