import { api } from '@/lib/http';

export interface Notification {
  _id: string;
  userId: string;
  type: 'order' | 'system' | 'offer' | 'event';
  title: string;
  body: string;
  cta?: { label: string; href: string };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  hasMore: boolean;
}

export const fetchNotifications = async (
  {
    page = 1,
    limit = 10,
    type,
    unread,
  }: { page?: number; limit?: number; type?: string; unread?: boolean } = {},
): Promise<NotificationsResponse> => {
  const res = await api.get('/notifications', {
    params: { page, limit, type, unread },
  });
  if (Array.isArray(res.data)) {
    return { notifications: res.data, hasMore: res.data.length === limit };
  }
  return res.data as NotificationsResponse;
};

export const markNotificationRead = async (id: string) => {
  await api.post(`/notifications/read/${id}`);
};
