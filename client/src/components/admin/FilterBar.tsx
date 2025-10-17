import type { ReactNode } from 'react';
import { Calendar, Filter as FilterIcon, Search, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface FilterOption {
  label: string;
  value: string;
}

export interface SelectFilterConfig {
  id: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface DateRangeValue {
  from?: string;
  to?: string;
}

export interface DateRangeFilterConfig {
  label?: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: SelectFilterConfig[];
  dateRange?: DateRangeFilterConfig;
  actions?: ReactNode;
  className?: string;
  onReset?: () => void;
  children?: ReactNode;
}

const inputBaseClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:ring-blue-400';

const labelBaseClass = 'flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';

const FilterBar = ({
  searchPlaceholder = 'Search',
  searchValue = '',
  onSearchChange,
  filters = [],
  dateRange,
  actions,
  className,
  onReset,
  children,
}: FilterBarProps) => {
  const hasFilters = filters.length > 0;
  const showDateRange = Boolean(dateRange);

  return (
    <div
      className={cn(
        'rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:border-slate-800 dark:bg-slate-950/40',
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {onSearchChange ? (
            <label className={labelBaseClass} htmlFor="admin-filter-search">
              Search
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  id="admin-filter-search"
                  type="search"
                  className={cn(inputBaseClass, 'pl-9')}
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(event) => onSearchChange(event.target.value)}
                />
                {searchValue && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                    aria-label="Clear search"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </label>
          ) : null}

          {hasFilters
            ? filters.map((filter) => (
                <label key={filter.id} className={labelBaseClass} htmlFor={`admin-filter-${filter.id}`}>
                  {filter.label}
                  <div className="relative">
                    <FilterIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <select
                      id={`admin-filter-${filter.id}`}
                      className={cn(inputBaseClass, 'appearance-none pl-9 pr-8')}
                      value={filter.value}
                      onChange={(event) => filter.onChange(event.target.value)}
                    >
                      {filter.placeholder ? (
                        <option value="">{filter.placeholder}</option>
                      ) : null}
                      {filter.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">▾</span>
                  </div>
                </label>
              ))
            : null}

          {showDateRange && dateRange ? (
            <div className={labelBaseClass}>
              {dateRange.label || 'Date range'}
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="date"
                    className={cn(inputBaseClass, 'pl-9')}
                    value={dateRange.value.from ?? ''}
                    onChange={(event) => dateRange.onChange({ ...dateRange.value, from: event.target.value })}
                  />
                </div>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="date"
                    className={cn(inputBaseClass, 'pl-9')}
                    value={dateRange.value.to ?? ''}
                    onChange={(event) => dateRange.onChange({ ...dateRange.value, to: event.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {onReset ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onReset}
              className="justify-center rounded-full border border-transparent px-4 py-2 text-sm text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800"
            >
              Reset
            </Button>
          ) : null}
          {actions}
          {children}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
