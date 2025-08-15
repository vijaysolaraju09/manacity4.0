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

export const fetchNotifications = async (): Promise<Notification[]> => {
  const res = await api.get('/notifications');
  return res.data;
};

export const markNotificationRead = async (id: string) => {
  await api.post(`/notifications/view/${id}`);
};
