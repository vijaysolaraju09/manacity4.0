import type { Query } from 'mongoose';

export interface PaginationQuery {
  page?: unknown;
  limit?: unknown;
  sort?: string;
  q?: string;
  status?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
  sort: Record<string, 1 | -1>;
  q?: string;
  status?: string;
  projection?: Record<string, 0 | 1> | string;
  lean: boolean;
}

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;
const SORT_FIELDS = ['createdAt', 'updatedAt', 'ratingAvg'];

export function parsePagination(query: PaginationQuery = {}): PaginationOptions {
  const pageNum = Math.max(parseInt(String(query.page ?? '1'), 10) || 1, 1);
  const limitNum = Math.min(
    Math.max(parseInt(String(query.limit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const skip = (pageNum - 1) * limitNum;

  const sort: Record<string, 1 | -1> = {};
  if (typeof query.sort === 'string') {
    query.sort.split(',').forEach((field) => {
      if (!field) return;
      const direction: 1 | -1 = field.startsWith('-') ? -1 : 1;
      const key = field.replace(/^[-+]/, '');
      if (SORT_FIELDS.includes(key)) {
        sort[key] = direction;
      }
    });
  }

  const q = typeof query.q === 'string' ? query.q.trim() : undefined;
  const status = typeof query.status === 'string' ? query.status.trim() : undefined;

  return {
    page: pageNum,
    limit: limitNum,
    skip,
    sort,
    q,
    status,
    projection: undefined,
    lean: true,
  };
}

export function applyPagination<T>(
  query: Query<T[], any>,
  options: PaginationOptions,
  projection?: PaginationOptions['projection']
): Query<T[], any> {
  const q = query.skip(options.skip).limit(options.limit);
  if (Object.keys(options.sort).length) q.sort(options.sort);
  if (options.lean) q.lean();
  if (projection) q.select(projection);
  return q;
}

