import { http } from '@/lib/http';
import { toItems, toItem } from '@/lib/response';
import { adaptEventDetail, adaptEventSummary, EventDetail, EventSummary } from '@/types/events';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const fetchPublicEvents = async (
  params: Record<string, any> = {}
): Promise<PaginatedResult<EventSummary>> => {
  const res = await http.get('/events', { params });
  const items = toItems(res);
  const data = res?.data?.data ?? {};
  const normalized = items
    .map((item) => adaptEventSummary(item))
    .filter(Boolean) as EventSummary[];

  return {
    items: normalized,
    total: typeof data.total === 'number' ? data.total : normalized.length,
    page: typeof data.page === 'number' ? data.page : 1,
    pageSize: typeof data.pageSize === 'number' ? data.pageSize : normalized.length,
  };
};

export const fetchPublicEventById = async (id: string): Promise<EventDetail> => {
  if (!id) throw new Error('Event id is required');
  const res = await http.get(`/events/${id}`);
  const item = toItem(res);
  const event = adaptEventDetail(item);
  if (!event) throw new Error('Event not found');
  return event;
};
