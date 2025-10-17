import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableProvider,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export type AdminTableColumn<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  cellClassName?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (row: T) => ReactNode;
};

export interface AdminTableProps<T> {
  data: T[];
  columns: AdminTableColumn<T>[];
  isLoading?: boolean;
  skeletonRows?: number;
  emptyState?: ReactNode;
  caption?: ReactNode;
  rowKey?: (row: T, index: number) => string;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortState?: { key?: string; direction?: 'asc' | 'desc' };
  className?: string;
}

const getAlignment = (align: AdminTableColumn<unknown>['align']) => {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
};

const AdminTable = <T extends Record<string, unknown>>({
  data,
  columns,
  isLoading = false,
  skeletonRows = 6,
  emptyState,
  caption,
  rowKey,
  onSort,
  sortState,
  className,
}: AdminTableProps<T>) => {
  const hasData = data.length > 0;
  const rowId = (row: T, index: number) =>
    rowKey?.(row, index) ?? String((row as any).id ?? (row as any)._id ?? index);

  const handleSort = (key: string) => {
    if (!onSort) return;
    const currentDirection = sortState?.key === key ? sortState.direction : undefined;
    const nextDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    onSort(key, nextDirection ?? 'asc');
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-lg shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950/60',
        className,
      )}
    >
      <TableProvider stickyHeader>
        <Table className="min-w-[960px]">
          <TableHeader>
            <TableRow className="bg-transparent">
              {columns.map((column) => {
                const isActive = sortState?.key === column.key;
                const direction = isActive ? sortState?.direction ?? 'asc' : undefined;
                return (
                  <TableHead
                    key={column.key}
                    scope="col"
                    className={cn('bg-transparent', column.className, getAlignment(column.align))}
                    style={column.width ? { width: column.width } : undefined}
                  >
                    {column.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-300 dark:hover:text-blue-300',
                          isActive && 'text-blue-600 dark:text-blue-300',
                        )}
                        aria-label={`Sort by ${String(column.header)}`}
                      >
                        <span>{column.header}</span>
                        {column.sortable ? (
                          <span aria-hidden="true" className="text-[10px]">
                            {direction === 'desc' ? '▾' : '▴'}
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        {column.header}
                      </span>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !hasData
              ? Array.from({ length: skeletonRows }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`} className="bg-transparent">
                    <TableCell colSpan={columns.length}>
                      <Skeleton className="h-8 w-full rounded-xl bg-slate-100/80 dark:bg-slate-800/60" />
                    </TableCell>
                  </TableRow>
                ))
              : null}

            {!isLoading && hasData
              ? data.map((row, index) => (
                  <TableRow key={rowId(row, index)} className="bg-transparent">
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          'whitespace-nowrap text-sm text-slate-700 dark:text-slate-200',
                          getAlignment(column.align),
                          column.cellClassName,
                        )}
                      >
                        {column.render ? column.render(row) : ((row as any)[column.key] as ReactNode)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : null}

            {!isLoading && !hasData ? (
              <TableRow className="bg-transparent">
                <TableCell colSpan={columns.length} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  {emptyState ?? 'No records found.'}
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableProvider>
      {caption ? (
        <div className="border-t border-slate-100/80 bg-slate-50/80 px-6 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
          {caption}
        </div>
      ) : null}
    </div>
  );
};

export default AdminTable;
