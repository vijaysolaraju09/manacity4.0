import { http } from '@/lib/http';
import { toItems, toErrorMessage } from '@/lib/response';

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
  try {
    const res = await http.get('/notifications', { params: { page, limit } });
    const notifications = toItems(res) as Notification[];
    const hasMore = res.data?.hasMore ?? false;
    return { notifications, hasMore };
  } catch (err) {
    throw new Error(toErrorMessage(err));
  }
};

export const markNotificationRead = async (id: string) => {
  await http.patch(`/notifications/${id}/read`);
};
