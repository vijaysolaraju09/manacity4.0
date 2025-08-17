import api from './client';

export interface Notification {
  _id: string;
  title: string;
  message: string;
  image?: string;
  link?: string;
  type: string;
  createdAt: string;
  isRead?: boolean;
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
  }: { page?: number; limit?: number; type?: string } = {},
): Promise<NotificationsResponse> => {
  const res = await api.get('/notifications', {
    params: { page, limit, type },
  });
  if (Array.isArray(res.data)) {
    return { notifications: res.data, hasMore: res.data.length === limit };
  }
  return res.data as NotificationsResponse;
};

export const markNotificationRead = async (id: string) => {
  await api.post(`/notifications/view/${id}`);
};

