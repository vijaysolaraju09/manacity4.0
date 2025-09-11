import { http } from '@/lib/http';

export interface Notification {
  _id: string;
  userId: string;
  type: 'order' | 'system' | 'offer' | 'event';
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  hasMore: boolean;
}

export const fetchNotifications = async ({
  page = 1,
  limit = 10,
}: { page?: number; limit?: number } = {}): Promise<NotificationsResponse> => {
  const res = await http.get('/notifications', { params: { page, limit } });
  return res.data as NotificationsResponse;
};

export const markNotificationRead = async (id: string) => {
  await http.patch(`/notifications/${id}/read`);
};
