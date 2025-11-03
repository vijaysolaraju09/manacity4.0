import * as React from 'react';
import { cn } from '@/lib/utils';

type TableElement = HTMLTableElement;

type TableProps = React.TableHTMLAttributes<TableElement>;

type TableSectionProps<T extends HTMLElement> = React.HTMLAttributes<T> & {
  asChild?: boolean;
};

const TableContext = React.createContext<{
  stickyHeader: boolean;
} | null>(null);

export interface TableProviderProps {
  stickyHeader?: boolean;
  children: React.ReactNode;
}

const TableProvider = ({ stickyHeader = false, children }: TableProviderProps) => (
  <TableContext.Provider value={{ stickyHeader }}>{children}</TableContext.Provider>
);

const TableRoot = React.forwardRef<TableElement, TableProps>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table
        ref={ref}
        className={cn(
          'w-full caption-bottom text-sm text-ink-700 dark:text-ink-500',
          className,
        )}
        {...props}
      />
    </div>
  ),
);
TableRoot.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableSectionProps<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => {
    const context = React.useContext(TableContext);
    return (
      <thead
        ref={ref}
        className={cn(
          'bg-[color-mix(in_srgb,var(--surface-card)_92%,transparent)] text-xs font-semibold uppercase tracking-wide text-ink-500 dark:bg-[color-mix(in_srgb,var(--surface-card)_72%,transparent)]',
          context?.stickyHeader && 'sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] dark:supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--surface-card)_70%,transparent)]',
          className,
        )}
        {...props}
      />
    );
  },
);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, TableSectionProps<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn('divide-y divide-[color:var(--border-subtle)]/60 dark:divide-[color:var(--border-subtle)]/30', className)}
      {...props}
    />
  ),
);
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableSectionProps<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('bg-[color-mix(in_srgb,var(--surface-card)_90%,transparent)] text-ink-500 dark:bg-[color-mix(in_srgb,var(--surface-card)_65%,transparent)] dark:text-ink-500', className)}
      {...props}
    />
  ),
);
TableFooter.displayName = 'TableFooter';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
        className={cn(
          'transition hover:bg-[color-mix(in_srgb,var(--brand-500)_14%,transparent)] dark:hover:bg-[color-mix(in_srgb,var(--brand-500)_20%,transparent)] [&:nth-child(odd)]:bg-[color-mix(in_srgb,var(--surface-card)_86%,transparent)] dark:[&:nth-child(odd)]:bg-[color-mix(in_srgb,var(--surface-card)_50%,transparent)]',
          className,
        )}
        {...props}
      />
  ),
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn('px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500', className)}
      {...props}
    />
  ),
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('px-6 py-4 align-middle text-sm text-ink-700 dark:text-ink-500', className)}
      {...props}
    />
  ),
);
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      className={cn('mt-4 text-sm text-text-muted dark:text-text-muted', className)}
      {...props}
    />
  ),
);
TableCaption.displayName = 'TableCaption';

export {
  TableProvider,
  TableRoot as Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
