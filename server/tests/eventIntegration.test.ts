import Event from '../models/Event';
import { getAllEvents, registerForEvent } from '../controllers/eventController';

describe('event flows', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists only upcoming events when requested', async () => {
    const events: any[] = [];
    const cursor: any = Promise.resolve(events);
    cursor.sort = jest.fn().mockReturnThis();
    cursor.skip = jest.fn().mockReturnThis();
    cursor.limit = jest.fn().mockResolvedValue(events);
    jest.spyOn(Event, 'find').mockReturnValue(cursor);
    jest.spyOn(Event, 'countDocuments').mockResolvedValue(0);

    const req: any = { query: { status: 'upcoming', page: '1', pageSize: '10' } };
    const json = jest.fn();
    await getAllEvents(req, { json } as any);
    expect(Event.find).toHaveBeenCalledWith({ startAt: { $gt: expect.any(Date) } });
    expect(json).toHaveBeenCalledWith({ items: events, total: 0 });
  });

  it('registers for event', async () => {
    const save = jest.fn();
    const event: any = {
      _id: 'e1',
      registeredUsers: [],
      capacity: 10,
      startAt: new Date(Date.now() + 60_000),
      save,
    };
    jest.spyOn(Event, 'findById').mockResolvedValue(event);
    const req: any = { params: { id: 'e1' }, user: { _id: 'u1' } };
    const json = jest.fn();
    await registerForEvent(req, { json } as any);
    expect(save).toHaveBeenCalled();
    expect(event.registeredUsers).toContain('u1');
    expect(json).toHaveBeenCalledWith({ message: 'Registered successfully' });
  });
});
