jest.mock('../models/Event', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../models/EventRegistration', () => ({
  deleteMany: jest.fn(),
}));

jest.mock('../models/EventUpdate', () => ({
  deleteMany: jest.fn(),
}));

jest.mock('../models/FormTemplate', () => ({
  findById: jest.fn(),
}));

const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventUpdate = require('../models/EventUpdate');
const FormTemplate = require('../models/FormTemplate');
const controller = require('../controllers/adminEventController');

describe('adminEventController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listEvents', () => {
    it('returns paginated events with derived fields', async () => {
      const eventDoc = {
        _id: '1',
        title: 'Launch',
        startAt: new Date('2099-01-01T10:00:00Z'),
        endAt: new Date('2099-01-01T12:00:00Z'),
        maxParticipants: 100,
        registeredCount: 10,
        status: 'published',
      };
      const lean = jest.fn().mockResolvedValue([eventDoc]);
      const limit = jest.fn().mockReturnValue({ lean });
      const skip = jest.fn().mockReturnValue({ limit });
      const sort = jest.fn().mockReturnValue({ skip });
      Event.find.mockReturnValue({ sort });
      Event.countDocuments.mockResolvedValue(1);

      const req = {
        query: { status: 'upcoming', page: '1', pageSize: '5', sort: '-startAt' },
        traceId: 'trace',
      };
      const res = { json: jest.fn() };

      await controller.listEvents(req, res, jest.fn());

      expect(Event.find).toHaveBeenCalled();
      expect(Event.countDocuments).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: {
          items: [
            expect.objectContaining({
              _id: '1',
              title: 'Launch',
              status: 'published',
              lifecycleStatus: 'upcoming',
              capacity: 100,
              registered: 10,
            }),
          ],
          total: 1,
          page: 1,
          pageSize: 5,
        },
        traceId: 'trace',
      });
    });
  });

  describe('createEvent', () => {
    it('creates an event with defaults and returns mapped payload', async () => {
      const start = new Date(Date.now() + 3600000);
      const end = new Date(Date.now() + 7200000);
      const created = {
        _id: 'evt1',
        title: 'Gala',
        startAt: start,
        endAt: end,
        maxParticipants: 50,
        registeredCount: 0,
        status: 'published',
      };
      Event.create.mockResolvedValue(created);
      const req = {
        body: {
          title: 'Gala',
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          capacity: 50,
        },
        user: { _id: 'admin-user' },
        traceId: 'trace',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await controller.createEvent(req, res, next);

      expect(Event.create).toHaveBeenCalled();
      expect(FormTemplate.findById).not.toHaveBeenCalled();
      const payload = Event.create.mock.calls[0][0];
      expect(payload).toMatchObject({
        title: 'Gala',
        maxParticipants: 50,
        createdBy: 'admin-user',
        status: 'draft',
      });
      expect(payload.startAt).toBeInstanceOf(Date);
      expect(payload.endAt).toBeInstanceOf(Date);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({
          _id: 'evt1',
          title: 'Gala',
          status: 'published',
          lifecycleStatus: 'upcoming',
          capacity: 50,
          startAt: start,
          endAt: end,
        }),
        traceId: 'trace',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects events when end precedes start', async () => {
      const start = new Date(Date.now() + 7200000);
      const end = new Date(Date.now() + 3600000);
      const req = {
        body: {
          title: 'Invalid range',
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          capacity: 10,
        },
        user: { _id: 'admin-user' },
        traceId: 'trace',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await controller.createEvent(req, res, next);

      expect(Event.create).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const error = next.mock.calls[0][0];
      expect(error.code).toBe('END_BEFORE_START');
    });

    it('attaches template metadata when templateId is provided', async () => {
      const start = new Date(Date.now() + 3600000);
      const end = new Date(Date.now() + 7200000);
      const templateId = '507f1f77bcf86cd799439011';
      const created = {
        _id: 'evt2',
        title: 'Lan Party',
        startAt: start,
        endAt: end,
        maxParticipants: 16,
        registeredCount: 0,
        status: 'draft',
      };

      FormTemplate.findById.mockResolvedValue({ _id: templateId });
      Event.create.mockResolvedValue(created);

      const req = {
        body: {
          title: 'Lan Party',
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          capacity: 16,
          templateId,
        },
        user: { _id: 'admin-user' },
        traceId: 'trace',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await controller.createEvent(req, res, jest.fn());

      expect(FormTemplate.findById).toHaveBeenCalledWith(templateId);
      expect(Event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          dynamicForm: {
            mode: 'template',
            templateId,
            fields: [],
            isActive: true,
          },
        })
      );
    });

    it('rejects creation when template id is invalid', async () => {
      const start = new Date(Date.now() + 3600000);
      const end = new Date(Date.now() + 7200000);
      const templateId = '507f1f77bcf86cd799439012';

      FormTemplate.findById.mockResolvedValue(null);

      const req = {
        body: {
          title: 'With template',
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          capacity: 8,
          templateId,
        },
        user: { _id: 'admin-user' },
        traceId: 'trace',
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await controller.createEvent(req, res, next);

      expect(FormTemplate.findById).toHaveBeenCalledWith(templateId);
      expect(Event.create).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'TEMPLATE_NOT_FOUND' }));
    });
  });

  describe('publishEvent', () => {
    it('publishes a draft event', async () => {
      const event = {
        _id: 'evt',
        status: 'draft',
        registrationOpenAt: new Date(Date.now() - 3600000),
        registrationCloseAt: new Date(Date.now() + 3600000),
        save: jest.fn().mockResolvedValue(),
      };
      Event.findById.mockResolvedValue(event);

      const req = { params: { id: 'evt' }, traceId: 'trace' };
      const res = { json: jest.fn() };

      await controller.publishEvent(req, res, jest.fn());

      expect(event.status).toBe('published');
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({ status: 'published' }),
        traceId: 'trace',
      });
    });

    it('rejects publishing non-draft events', async () => {
      const event = {
        _id: 'evt',
        status: 'published',
      };
      Event.findById.mockResolvedValue(event);

      const next = jest.fn();

      await controller.publishEvent({ params: { id: 'evt' } }, { json: jest.fn() }, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_STATUS' }));
    });
  });

  describe('startEvent', () => {
    it('transitions published events to ongoing', async () => {
      const event = { _id: 'evt', status: 'published', save: jest.fn().mockResolvedValue() };
      Event.findById.mockResolvedValue(event);

      const res = { json: jest.fn() };
      await controller.startEvent({ params: { id: 'evt' }, traceId: 'trace' }, res, jest.fn());

      expect(event.status).toBe('ongoing');
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({ status: 'ongoing' }),
        traceId: 'trace',
      });
    });
  });

  describe('completeEvent', () => {
    it('marks ongoing events as completed', async () => {
      const event = { _id: 'evt', status: 'ongoing', save: jest.fn().mockResolvedValue() };
      Event.findById.mockResolvedValue(event);

      const res = { json: jest.fn() };
      await controller.completeEvent({ params: { id: 'evt' }, traceId: 'trace' }, res, jest.fn());

      expect(event.status).toBe('completed');
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({ status: 'completed' }),
        traceId: 'trace',
      });
    });
  });

  describe('cancelEvent', () => {
    it('marks events as canceled', async () => {
      const event = { _id: 'evt', status: 'published', save: jest.fn().mockResolvedValue() };
      Event.findById.mockResolvedValue(event);

      const res = { json: jest.fn() };
      await controller.cancelEvent({ params: { id: 'evt' }, traceId: 'trace' }, res, jest.fn());

      expect(event.status).toBe('canceled');
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({ status: 'canceled' }),
        traceId: 'trace',
      });
    });
  });

  describe('updateEvent', () => {
    it('updates fields and recalculates status', async () => {
      const start = new Date(Date.now() + 3600000);
      const end = new Date(Date.now() + 7200000);
      const event = {
        _id: 'evt',
        title: 'Original',
        startAt: new Date('2025-01-01T00:00:00Z'),
        endAt: new Date('2025-01-02T00:00:00Z'),
        registrationOpenAt: new Date('2025-01-01T00:00:00Z'),
        registrationCloseAt: new Date('2025-01-02T00:00:00Z'),
        maxParticipants: 100,
        registeredCount: 5,
        status: 'published',
        save: jest.fn().mockResolvedValue(),
      };
      Event.findById.mockResolvedValue(event);

      const req = {
        params: { id: 'evt' },
        body: {
          title: 'Updated',
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          capacity: 60,
        },
        traceId: 'trace',
      };
      const res = { json: jest.fn() };

      await controller.updateEvent(req, res, jest.fn());

      expect(event.title).toBe('Updated');
      expect(event.startAt.toISOString()).toBe(start.toISOString());
      expect(event.endAt.toISOString()).toBe(end.toISOString());
      expect(event.registrationOpenAt.toISOString()).toBe(start.toISOString());
      expect(event.registrationCloseAt.toISOString()).toBe(end.toISOString());
      expect(event.maxParticipants).toBe(60);
      expect(event.status).toBe('published');
      expect(event.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        data: expect.objectContaining({
          _id: 'evt',
          title: 'Updated',
          status: 'upcoming',
          capacity: 60,
        }),
        traceId: 'trace',
      });
    });

    it('rejects capacity lower than registrations', async () => {
      const event = {
        _id: 'evt',
        title: 'Original',
        startAt: new Date(),
        endAt: new Date(Date.now() + 3600000),
        registrationOpenAt: new Date(),
        registrationCloseAt: new Date(Date.now() + 3600000),
        registeredCount: 10,
        status: 'published',
      };
      Event.findById.mockResolvedValue(event);
      const req = {
        params: { id: 'evt' },
        body: { capacity: 5 },
        traceId: 'trace',
      };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await controller.updateEvent(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const error = next.mock.calls[0][0];
      expect(error.code).toBe('CAPACITY_TOO_LOW');
    });
  });

  describe('deleteEvent', () => {
    it('removes event and related data', async () => {
      const event = {
        _id: 'evt',
        deleteOne: jest.fn().mockResolvedValue(),
      };
      Event.findById.mockResolvedValue(event);
      EventRegistration.deleteMany.mockResolvedValue();
      EventUpdate.deleteMany.mockResolvedValue();

      const req = { params: { id: 'evt' } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      await controller.deleteEvent(req, res, jest.fn());

      expect(EventRegistration.deleteMany).toHaveBeenCalledWith({ event: 'evt' });
      expect(EventUpdate.deleteMany).toHaveBeenCalledWith({ event: 'evt' });
      expect(event.deleteOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
    });

    it('passes error when event missing', async () => {
      Event.findById.mockResolvedValue(null);
      const next = jest.fn();
      await controller.deleteEvent({ params: { id: 'missing' } }, { status: jest.fn() }, next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      const error = next.mock.calls[0][0];
      expect(error.code).toBe('EVENT_NOT_FOUND');
    });
  });
});
