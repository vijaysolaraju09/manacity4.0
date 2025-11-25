import { describe, expect, it } from 'vitest';
import reducer, {
  clearAll,
  fetchNotifs,
  markAllAsRead,
  markNotifRead,
  type Notif,
} from './notifs';

const createNotif = (overrides: Partial<Notif> = {}): Notif => ({
  _id: 'notif-1',
  type: 'order',
  message: 'Order update',
  read: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  targetType: 'order',
  targetId: 'order-1',
  ...overrides,
});

const initialState = reducer(undefined, { type: '@@INIT' } as any);

describe('notifications slice', () => {
  it('stores fetched notifications and unread count', () => {
    const items = [createNotif()];
    const state = reducer(
      initialState,
      fetchNotifs.fulfilled(
        { items, hasMore: false, unread: 1, page: 1 },
        'request-1',
        { page: 1, limit: 20 },
      ),
    );

    expect(state.items).toHaveLength(1);
    expect(state.items[0]?._id).toBe('notif-1');
    expect(state.unread).toBe(1);
    expect(state.status).toBe('succeeded');
    expect(state.hasMore).toBe(false);
  });

  it('marks a notification as read and updates the unread counter', () => {
    const state = reducer(
      { ...initialState, status: 'succeeded', unread: 1, items: [createNotif()], hasMore: false, page: 1, error: null },
      markNotifRead.fulfilled('notif-1', 'request-2', 'notif-1'),
    );

    expect(state.items[0]?.read).toBe(true);
    expect(state.unread).toBe(0);
  });

  it('marks all notifications as read locally', () => {
    const state = reducer(
      {
        ...initialState,
        status: 'idle',
        unread: 2,
        items: [createNotif({ _id: 'notif-1' }), createNotif({ _id: 'notif-2' })],
        hasMore: true,
        page: 1,
        error: null,
      },
      { type: markAllAsRead.type },
    );

    expect(state.items.every((notif) => notif.read)).toBe(true);
    expect(state.unread).toBe(0);
    expect(state.status).toBe('succeeded');
  });

  it('clears notifications when requested', () => {
    const state = reducer(
      {
        ...initialState,
        status: 'succeeded',
        unread: 1,
        items: [createNotif()],
        hasMore: true,
        page: 2,
        error: null,
      },
      { type: clearAll.type },
    );

    expect(state.items).toHaveLength(0);
    expect(state.unread).toBe(0);
    expect(state.hasMore).toBe(false);
    expect(state.page).toBe(1);
  });
});
