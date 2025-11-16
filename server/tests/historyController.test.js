const Order = require('../models/Order');
const ServiceRequest = require('../models/ServiceRequest');
const EventRegistration = require('../models/EventRegistration');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const { getHistory } = require('../controllers/historyController');

const createSortedQuery = (result) => {
  const lean = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ lean });
  const limit = jest.fn().mockReturnValue({ select });
  const sort = jest.fn().mockReturnValue({ limit });
  return { sort };
};

const createSelectQuery = (result) => {
  const lean = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ lean });
  return { select };
};

describe('historyController.getHistory', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns order and service request entries with accurate statuses and timestamps', async () => {
    jest.spyOn(Order, 'find').mockReturnValue(
      createSortedQuery([
        {
          _id: { toString: () => 'order-123abc' },
          shopSnapshot: { name: 'Daily Cafe' },
          shop: { toString: () => 'shop-1' },
          items: [{ qty: 2 }, { qty: 1 }],
          grandTotal: 6500,
          status: 'delivered',
          createdAt: '2024-01-05T10:00:00Z',
          updatedAt: '2024-01-05T11:00:00Z',
          rating: 5,
          review: 'Great',
        },
      ]),
    );
    jest.spyOn(ServiceRequest, 'find').mockReturnValue(
      createSortedQuery([
        {
          _id: { toString: () => 'sr-55' },
          customName: 'Fix AC',
          description: 'Urgent repair',
          preferredDate: '2024-01-04',
          preferredTime: '09:00',
          location: 'Lobby',
          status: 'completed',
          createdAt: '2024-01-04T08:00:00Z',
          updatedAt: '2024-01-06T08:30:00Z',
          service: { toString: () => 'svc-1' },
          serviceId: { toString: () => 'svc-1' },
          visibility: 'private',
        },
      ]),
    );
    jest.spyOn(EventRegistration, 'find').mockReturnValue(createSortedQuery([]));
    jest.spyOn(Event, 'find').mockReturnValue(createSelectQuery([]));
    jest.spyOn(Feedback, 'find').mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

    const req = { user: { _id: 'user-1' }, traceId: 'trace' };
    const json = jest.fn();

    await getHistory(req, { json });

    expect(json).toHaveBeenCalledTimes(1);
    const payload = json.mock.calls[0][0];
    const items = payload.data.items;
    expect(items).toHaveLength(2);

    const orderEntry = items.find((entry) => entry.type === 'order');
    expect(orderEntry.status).toBe('delivered');
    expect(orderEntry.occurredAt).toBe('2024-01-05T10:00:00.000Z');

    const requestEntry = items.find((entry) => entry.type === 'service_request');
    expect(requestEntry.status).toBe('completed');
    expect(requestEntry.occurredAt).toBe('2024-01-04T08:00:00.000Z');
    expect(requestEntry.metadata.serviceId).toBe('svc-1');
  });

  it('adds event registrations with metadata to the history feed', async () => {
    jest.spyOn(Order, 'find').mockReturnValue(createSortedQuery([]));
    jest.spyOn(ServiceRequest, 'find').mockReturnValue(createSortedQuery([]));
    jest.spyOn(EventRegistration, 'find').mockReturnValue(
      createSortedQuery([
        {
          _id: { toString: () => 'reg-1' },
          event: { toString: () => 'event-1' },
          status: 'checked_in',
          createdAt: '2024-02-10T09:00:00Z',
          teamName: 'Legends',
        },
      ]),
    );
    jest.spyOn(Event, 'find').mockReturnValue(
      createSelectQuery([
        {
          _id: { toString: () => 'event-1' },
          title: 'Free Fire Cup',
          startAt: '2024-02-12T18:00:00Z',
          endAt: '2024-02-12T20:00:00Z',
          status: 'ongoing',
          venue: 'Arena',
        },
      ]),
    );
    jest.spyOn(Feedback, 'find').mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

    const req = { user: { _id: 'user-2' }, traceId: 'trace' };
    const json = jest.fn();

    await getHistory(req, { json });

    const payload = json.mock.calls[0][0];
    expect(payload.data.items).toHaveLength(1);
    const eventEntry = payload.data.items[0];
    expect(eventEntry.type).toBe('event');
    expect(eventEntry.metadata.eventId).toBe('event-1');
    expect(eventEntry.status).toBe('checked_in');
  });
});
