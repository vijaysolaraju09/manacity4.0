import { describe, expect, it } from 'vitest';
import type { EventSummary } from '@/types/events';
import type { ServiceRequest } from '@/types/services';
import type { RootState } from './index';
import type { Order } from './orders';
import {
  selectCombinedHistoryEntries,
  selectOrderHistoryEntries,
  selectServiceRequestHistoryEntries,
} from './historySelectors';

const createState = (overrides: Partial<RootState> = {}): RootState => {
  const state: any = {
    orders: {
      mine: { ids: [], entities: {}, status: 'idle', error: null },
      received: { ids: [], entities: {}, status: 'idle', error: null },
    },
    serviceRequests: {
      createStatus: 'idle',
      createError: null,
      mine: { items: [], status: 'idle', error: null },
      admin: { items: [], status: 'idle', error: null, total: 0, page: 1, pageSize: 20 },
      publicList: { items: [], status: 'idle', error: null, total: 0, page: 1, pageSize: 20 },
      detail: { item: null, status: 'idle', error: null, currentId: null },
    },
    events: {
      list: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 12,
        loading: false,
        error: null,
        hasMore: false,
        queryKey: '__default__',
      },
      detail: { data: null, loading: false, error: null, refreshing: false },
      registrations: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 12,
        loading: false,
        error: null,
        hasMore: false,
        preview: false,
      },
      myRegistration: { data: null, loading: false, error: null },
      updates: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 12,
        loading: false,
        error: null,
        hasMore: false,
      },
      leaderboard: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 12,
        loading: false,
        error: null,
        hasMore: false,
        version: 0,
      },
      actions: { register: 'idle', unregister: 'idle', postUpdate: 'idle', postLeaderboard: 'idle' },
    },
  };

  if ('orders' in overrides) {
    state.orders = { ...state.orders, ...(overrides as any).orders };
  }
  if ('serviceRequests' in overrides) {
    state.serviceRequests = { ...state.serviceRequests, ...(overrides as any).serviceRequests };
  }
  if ('events' in overrides) {
    state.events = { ...state.events, ...(overrides as any).events };
  }

  return { ...state, ...overrides } as RootState;
};

describe('history selectors', () => {
  it('maps orders to history entries with correct timestamps and totals', () => {
    const order: Order = {
      id: 'order-1001',
      type: 'product',
      status: 'delivered',
      items: [
        {
          id: 'oi-1',
          productId: 'p-1',
          title: 'Latte',
          qty: 2,
          unitPricePaise: 2500,
          subtotalPaise: 5000,
          options: null,
        },
      ],
      totals: {
        itemsPaise: 5000,
        discountPaise: 0,
        taxPaise: 0,
        shippingPaise: 0,
        grandPaise: 5000,
      },
      fulfillment: { type: 'delivery' },
      shippingAddress: null,
      notes: undefined,
      currency: 'INR',
      createdAt: '2024-03-01T10:00:00.000Z',
      updatedAt: '2024-03-01T11:00:00.000Z',
      timeline: [],
      customer: { id: 'u-1', name: 'Demo' },
      shop: { id: 's-1', name: 'Cafe' },
      payment: undefined,
      cancel: null,
      rating: 5,
      review: 'Great service',
      contactSharedAt: null,
    } as Order;

    const state = createState({
      orders: {
        mine: {
          ids: [order.id],
          entities: { [order.id]: order },
          status: 'succeeded',
          error: null,
        },
        received: { ids: [], entities: {}, status: 'idle', error: null },
      },
    } as Partial<RootState>);

    const [entry] = selectOrderHistoryEntries(state);
    expect(entry).toMatchObject({
      referenceId: 'order-1001',
      status: 'delivered',
      occurredAt: '2024-03-01T10:00:00.000Z',
      completedAt: '2024-03-01T11:00:00.000Z',
      canFeedback: true,
    });
    expect(entry.description).toContain('2 items');
    expect(entry.metadata?.totalPaise).toBe(5000);
  });

  it('maps service requests with normalized status and timestamp', () => {
    const request: ServiceRequest = {
      _id: 'sr-1',
      id: 'sr-1',
      userId: 'u-1',
      serviceId: 'svc-1',
      service: null,
      customName: 'Fix AC',
      description: 'Need urgent fix',
      details: '',
      location: 'Lobby',
      phone: '9999999999',
      preferredDate: '2024-04-01',
      preferredTime: '10:00',
      visibility: 'private',
      status: 'completed',
      adminNotes: '',
      reopenedCount: 0,
      assignedProviderId: null,
      assignedProvider: null,
      assignedProviders: [],
      assignedProviderIds: [],
      offers: [],
      offersCount: 0,
      history: [],
      isAnonymizedPublic: false,
      createdAt: '2024-03-30T09:00:00.000Z',
      updatedAt: '2024-04-02T09:30:00.000Z',
      feedback: { rating: 4, comment: 'Quick fix', updatedAt: '2024-04-02T10:00:00.000Z' },
    };

    const state = createState({
      serviceRequests: {
        mine: { items: [request], status: 'succeeded', error: null },
      } as any,
    } as Partial<RootState>);

    const [entry] = selectServiceRequestHistoryEntries(state);
    expect(entry).toMatchObject({
      referenceId: 'sr-1',
      status: 'completed',
      occurredAt: '2024-03-30T09:00:00.000Z',
      completedAt: '2024-04-02T09:30:00.000Z',
      canFeedback: true,
    });
    expect(entry.description).toContain('Lobby');
  });

  it('combines and sorts order, request, and event entries', () => {
    const order: Order = {
      id: 'order-2',
      type: 'product',
      status: 'pending',
      items: [
        {
          id: 'oi-2',
          title: 'Sandwich',
          qty: 1,
          unitPricePaise: 2000,
          subtotalPaise: 2000,
          options: null,
        },
      ],
      totals: {
        itemsPaise: 2000,
        discountPaise: 0,
        taxPaise: 0,
        shippingPaise: 0,
        grandPaise: 2000,
      },
      fulfillment: { type: 'pickup' },
      shippingAddress: null,
      notes: undefined,
      currency: 'INR',
      createdAt: '2024-02-01T08:00:00.000Z',
      updatedAt: '2024-02-01T08:30:00.000Z',
      timeline: [],
      customer: { id: 'u-1', name: 'Demo' },
      shop: { id: 's-2', name: 'Bistro' },
      payment: undefined,
      cancel: null,
      rating: null,
      review: null,
      contactSharedAt: null,
    } as Order;

    const request: ServiceRequest = {
      _id: 'sr-2',
      id: 'sr-2',
      userId: 'u-1',
      serviceId: 'svc-2',
      service: null,
      customName: 'Deep clean',
      description: '',
      details: '',
      location: 'Office',
      phone: '',
      preferredDate: '2024-02-15',
      preferredTime: '15:00',
      visibility: 'public',
      status: 'in_progress',
      adminNotes: '',
      reopenedCount: 0,
      assignedProviderId: null,
      assignedProvider: null,
      assignedProviders: [],
      assignedProviderIds: [],
      offers: [],
      offersCount: 0,
      history: [],
      isAnonymizedPublic: false,
      createdAt: '2024-02-03T10:00:00.000Z',
      updatedAt: '2024-02-04T10:00:00.000Z',
      feedback: null,
    };

    const event: EventSummary = {
      _id: 'event-1',
      title: 'Community Jam',
      name: 'Community Jam',
      type: 'activity',
      category: 'community',
      format: 'single_match',
      teamSize: 1,
      maxParticipants: 50,
      registeredCount: 10,
      registrationOpenAt: '2024-01-01T08:00:00.000Z',
      registrationCloseAt: '2024-01-10T08:00:00.000Z',
      regOpenAt: '2024-01-01T08:00:00.000Z',
      regCloseAt: '2024-01-10T08:00:00.000Z',
      startAt: '2024-02-10T18:00:00.000Z',
      endAt: '2024-02-10T20:00:00.000Z',
      status: 'published',
      mode: 'venue',
      venue: 'Town Hall',
      visibility: 'public',
      bannerUrl: null,
      lifecycleStatus: 'upcoming',
      entryFee: 0,
      prizePool: null,
      shortDescription: 'Fun evening',
      featured: false,
      highlightLabel: null,
      accentColor: null,
      iconUrl: null,
      registration: {
        status: 'registered',
        paymentRequired: false,
        paymentAmount: null,
        paymentCurrency: null,
        paymentProofUrl: null,
        submittedAt: '2024-01-05T09:00:00.000Z',
      },
      registrationStatus: 'registered',
      myRegistrationStatus: 'registered',
    } as EventSummary;

    const state = createState({
      orders: {
        mine: {
          ids: [order.id],
          entities: { [order.id]: order },
          status: 'succeeded',
          error: null,
        },
        received: { ids: [], entities: {}, status: 'idle', error: null },
      },
      serviceRequests: { mine: { items: [request], status: 'succeeded', error: null } } as any,
      events: { list: { items: [event] } } as any,
    } as Partial<RootState>);

    const combined = selectCombinedHistoryEntries(state);
    expect(combined.map((entry) => entry.id)).toEqual([
      'service_request:sr-2',
      'event:event-1',
      'order:order-2',
    ]);
  });
});
