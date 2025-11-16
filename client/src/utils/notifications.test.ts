import { describe, expect, it } from 'vitest';
import { goToNotificationTarget } from './notifications';
import type { Notif } from '@/store/notifs';

const createNotif = (overrides: Partial<Notif>): Notif => ({
  _id: 'notif-1',
  type: 'system',
  message: 'Test notification',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('goToNotificationTarget', () => {
  it('routes orders to the order detail page', () => {
    const notif = createNotif({ targetType: 'order', targetId: 'order-123' });
    const destination = goToNotificationTarget(notif);
    expect(destination).toEqual({ kind: 'internal', path: '/orders/order-123' });
  });

  it('routes service requests to their detail page', () => {
    const notif = createNotif({ targetType: 'serviceRequest', targetId: 'req-42' });
    const destination = goToNotificationTarget(notif);
    expect(destination).toEqual({ kind: 'internal', path: '/requests/req-42' });
  });

  it('returns a registration link for event notifications with registration metadata', () => {
    const notif = createNotif({
      targetType: 'event',
      targetId: 'event-77',
      payload: { registrationId: 'reg-1' },
    });
    const destination = goToNotificationTarget(notif);
    expect(destination).toEqual({ kind: 'internal', path: '/events/event-77/register' });
  });

  it('opens announcements using the provided target link', () => {
    const notif = createNotif({ targetType: 'announcement', targetLink: 'https://example.com/info' });
    const destination = goToNotificationTarget(notif);
    expect(destination).toEqual({ kind: 'external', url: 'https://example.com/info' });
  });
});
