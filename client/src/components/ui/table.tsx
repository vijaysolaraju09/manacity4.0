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
          'w-full caption-bottom text-sm text-slate-700 dark:text-slate-200',
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
          'bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400',
          context?.stickyHeader && 'sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-slate-950/80',
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
      className={cn('divide-y divide-slate-100 dark:divide-slate-800', className)}
      {...props}
    />
  ),
);
TableBody.displayName = 'TableBody';

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableSectionProps<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('bg-slate-50/60 text-slate-600 dark:bg-slate-900/60 dark:text-slate-300', className)}
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
        'transition hover:bg-blue-50/60 dark:hover:bg-blue-500/10 [&:nth-child(odd)]:bg-slate-50/40 dark:[&:nth-child(odd)]:bg-slate-900/40',
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
      className={cn(
        'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400',
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('px-6 py-4 align-middle text-sm text-slate-700 dark:text-slate-200', className)}
      {...props}
    />
  ),
);
TableCell.displayName = 'TableCell';

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      className={cn('mt-4 text-sm text-slate-500 dark:text-slate-400', className)}
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
