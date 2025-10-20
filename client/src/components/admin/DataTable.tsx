import { useState, type ReactNode } from 'react';
import Shimmer from '../Shimmer';
import styles from './DataTable.module.scss';

const joinClasses = (
  ...values: Array<string | false | null | undefined>
) => values.filter(Boolean).join(' ');

export type ColumnKey<T> = keyof T & string;

export interface Column<T> {
  key: ColumnKey<T>;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export interface FilterConfig {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface DataTableProps<T extends Record<string, any>> {
  columns: Column<T>[];
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onSort?: (key: ColumnKey<T>, direction: 'asc' | 'desc') => void;
  filters?: Record<ColumnKey<T>, FilterConfig>;
  loading?: boolean;
  selectable?: boolean;
  selected?: string[];
  onSelectionChange?: (ids: string[]) => void;
  rowKey?: (row: T, index: number) => string;
  classNames?: {
    tableWrap?: string;
    table?: string;
    th?: string;
    td?: string;
    row?: string;
    actions?: string;
    empty?: string;
  };
}

function DataTable<T extends Record<string, any>>({
  columns,
  rows,
  page,
  pageSize,
  total,
  onPageChange,
  onSort,
  filters,
  loading = false,
  selectable = false,
  selected = [],
  onSelectionChange,
  rowKey,
  classNames,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<ColumnKey<T> | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const getRowId = (row: T, idx: number) =>
    rowKey ? rowKey(row, idx) : (row as any).id ?? (row as any)._id ?? String(idx);

  const selectedSet = new Set(selected);

  const handleSort = (key: ColumnKey<T>) => {
    let dir: 'asc' | 'desc' = 'asc';
    if (sortKey === key && sortDir === 'asc') {
      dir = 'desc';
    }
    setSortKey(key);
    setSortDir(dir);
    onSort?.(key, dir);
  };

  const toggleAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(rows.map((r, i) => getRowId(r, i)));
    } else {
      onSelectionChange([]);
    }
  };

  const toggleRow = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedSet);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    onSelectionChange(Array.from(next));
  };

  const renderBody = () => {
    if (loading) {
      return Array.from({ length: Math.max(pageSize, 3) }, (_, i) => (
        <tr
          key={i}
          className={joinClasses(styles.row, classNames?.row)}
        >
          <td
            colSpan={columns.length + (selectable ? 1 : 0)}
            className={joinClasses(styles.cell, classNames?.td)}
          >
            <Shimmer height="20px" />
          </td>
        </tr>
      ));
    }

    if (!rows.length) {
      return (
        <tr className={joinClasses(styles.row, classNames?.row)}>
          <td
            colSpan={columns.length + (selectable ? 1 : 0)}
            className={joinClasses(styles.empty, classNames?.empty, classNames?.td)}
          >
            No records
          </td>
        </tr>
      );
    }

    return rows.map((row, rowIndex) => {
      const id = getRowId(row, rowIndex);
      return (
        <tr key={id} className={joinClasses(styles.row, classNames?.row)}>
          {selectable && (
            <td
              className={joinClasses(styles.cell, classNames?.td)}
              data-label="Select"
            >
              <input
                type="checkbox"
                aria-label="Select row"
                checked={selectedSet.has(id)}
                onChange={(e) => toggleRow(id, e.target.checked)}
              />
            </td>
          )}
          {columns.map((col) => (
            <td
              key={col.key}
              className={joinClasses(styles.cell, classNames?.td)}
              data-label={col.label}
            >
              {col.key === 'actions' && classNames?.actions ? (
                <div className={classNames.actions}>
                  {col.render ? col.render(row) : (row as any)[col.key]}
                </div>
              ) : col.render ? (
                col.render(row)
              ) : (
                (row as any)[col.key]
              )}
            </td>
          ))}
        </tr>
      );
    });
  };

  return (
    <div className={joinClasses(styles.container, classNames?.tableWrap)}>
      <div className={styles.scroller}>
        <table className={joinClasses(styles.table, classNames?.table)}>
          <thead>
          <tr className={joinClasses(styles.headerRow, classNames?.row)}>
            {selectable && (
              <th className={joinClasses(styles.headerCell, classNames?.th)}>
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={rows.length > 0 && selectedSet.size === rows.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={joinClasses(styles.headerCell, classNames?.th)}
              >
                {col.sortable ? (
                  <button
                    type="button"
                    className={styles.sortButton}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <span>{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
          {filters && (
            <tr className={joinClasses(styles.filtersRow, classNames?.row)}>
              {selectable && (
                <th className={joinClasses(styles.headerCell, classNames?.th)} />
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={joinClasses(styles.headerCell, classNames?.th)}
                >
                  {filters[col.key] ? (
                    <input
                      type="text"
                      value={filters[col.key].value}
                      placeholder={filters[col.key].placeholder}
                      onChange={(e) => filters[col.key].onChange(e.target.value)}
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          )}
        </thead>
          <tbody>{renderBody()}</tbody>
        </table>
      </div>
      <nav className={styles.pagination} aria-label="Pagination">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Prev
        </button>
        <span>
          {page} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next
        </button>
      </nav>
    </div>
  );
}

export default DataTable;
