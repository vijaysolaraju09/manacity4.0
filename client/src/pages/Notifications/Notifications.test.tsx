import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Notifications from './Notifications';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const fetchNotifsMock = vi.fn(() => ({ type: 'fetchNotifs' }));
const markNotifReadMock = vi.fn(() => ({ type: 'markNotifRead' }));
const removeNotifMock = vi.fn(() => ({ type: 'removeNotif' }));

vi.mock('react-redux', () => ({
  useDispatch: vi.fn(),
  useSelector: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('@/store/notifs', () => ({
  __esModule: true,
  fetchNotifs: fetchNotifsMock,
  markNotifRead: markNotifReadMock,
  removeNotif: removeNotifMock,
}));

const useDispatchMock = useDispatch as unknown as vi.Mock;
const useSelectorMock = useSelector as unknown as vi.Mock;
const useNavigateMock = useNavigate as unknown as vi.Mock;

beforeAll(() => {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as any).IntersectionObserver = MockIntersectionObserver;
});

describe('Notifications page', () => {
  const dispatchMock = vi.fn(() => ({ unwrap: () => Promise.resolve() }));
  const navigateMock = vi.fn();
  let openSpy: ReturnType<typeof vi.spyOn>;
  const mockState = {
    notifs: {
      items: [
        {
          _id: 'notif-1',
          type: 'order',
          message: 'Order shipped',
          read: false,
          createdAt: new Date().toISOString(),
          entityType: 'order',
          targetType: 'order',
          targetId: 'order-99',
          targetLink: '/orders/order-99',
        },
        {
          _id: 'promo-1',
          type: 'announcement',
          title: 'Festival deals',
          message: '50% off on essentials',
          subtitle: 'Limited time announcement',
          read: false,
          createdAt: new Date().toISOString(),
          entityType: 'announcement',
          targetType: 'announcement',
          targetLink: 'https://example.com/promo',
          ctaText: 'Claim offer',
          imageUrl: 'https://img.example.com/promo.png',
          pinned: true,
          priority: 'high',
        },
      ],
      status: 'succeeded',
      error: null,
      hasMore: false,
      page: 1,
      unread: 2,
    },
  };

  beforeEach(() => {
    dispatchMock.mockReturnValue({ unwrap: () => Promise.resolve() });
    useDispatchMock.mockReturnValue(dispatchMock);
    useSelectorMock.mockImplementation((selector: any) => selector(mockState));
    useNavigateMock.mockReturnValue(navigateMock);
    markNotifReadMock.mockClear();
    fetchNotifsMock.mockClear();
    removeNotifMock.mockClear();
    dispatchMock.mockClear();
    navigateMock.mockClear();
    openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it('marks a notification as read and navigates to its target when clicked', async () => {
    const user = userEvent.setup();
    render(<Notifications />);

    const cardButton = await screen.findByRole('button', { name: /order shipped/i });
    await user.click(cardButton);

    expect(markNotifReadMock).toHaveBeenCalledWith('notif-1');
    expect(navigateMock).toHaveBeenCalledWith('/orders/order-99');
  });

  it('opens promotion CTAs externally and marks them as read', async () => {
    const user = userEvent.setup();
    render(<Notifications />);

    const ctaButton = await screen.findByRole('button', { name: /claim offer/i });
    await user.click(ctaButton);

    expect(markNotifReadMock).toHaveBeenCalledWith('promo-1');
    expect(openSpy).toHaveBeenCalledWith('https://example.com/promo', '_blank', 'noopener');
  });
});
