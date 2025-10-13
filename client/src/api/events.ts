import { http } from '@/lib/http';
import { toItems, toItem } from '@/lib/response';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const fetchPublicEvents = async (
  params: Record<string, any> = {}
): Promise<PaginatedResult<any>> => {
  const res = await http.get('/events', { params });
  const items = toItems(res);
  const data = res?.data?.data ?? {};

  return {
    items,
    total: typeof data.total === 'number' ? data.total : items.length,
    page: typeof data.page === 'number' ? data.page : 1,
    pageSize: typeof data.pageSize === 'number' ? data.pageSize : items.length,
  };
};

export const fetchPublicEventById = async (id: string) => {
  if (!id) throw new Error('Event id is required');
  const res = await http.get(`/events/${id}`);
  const item = toItem(res);
  if (!item) throw new Error('Event not found');
  return item;
};
