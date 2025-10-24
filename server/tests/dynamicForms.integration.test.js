const request = require('supertest');
const express = require('express');

let currentUser = null;

jest.mock('../middleware/authMiddleware', () =>
  jest.fn((req, _res, next) => {
    if (currentUser) {
      req.user = currentUser;
    }
    next();
  })
);

const registrationsStore = new Map();
const templatesStore = new Map();
const eventsStore = new Map();

const clone = (value) => JSON.parse(JSON.stringify(value));

jest.mock('../models/FormTemplate', () => {
  class TemplateDoc {
    constructor(data) {
      Object.assign(this, data);
    }

    toObject() {
      return clone(this);
    }

    async save() {
      templatesStore.set(String(this._id), clone(this));
      return this;
    }

    async deleteOne() {
      templatesStore.delete(String(this._id));
    }
  }

  return {
    create: async (payload) => {
      const id = `tpl_${templatesStore.size + 1}`;
      const doc = new TemplateDoc({ ...payload, _id: id, createdAt: new Date(), updatedAt: new Date() });
      templatesStore.set(id, clone(doc));
      return doc;
    },
    find: (filter = {}) => {
      const items = Array.from(templatesStore.values()).filter((tpl) => {
        if (filter.category && tpl.category !== filter.category) return false;
        return true;
      });
      return {
        sort: () => ({
          lean: async () => clone(items),
        }),
      };
    },
    findById: async (id) => {
      const data = templatesStore.get(String(id));
      if (!data) return null;
      const doc = new TemplateDoc(clone(data));
      doc.lean = async () => clone(data);
      return doc;
    },
    findOneAndUpdate: async (filter, update, options = {}) => {
      const existing = Array.from(templatesStore.values()).find((tpl) => tpl.name === filter.name);
      if (existing) {
        const merged = { ...existing, ...update.$set };
        templatesStore.set(String(existing._id), merged);
        return clone(merged);
      }
      if (options.upsert) {
        const id = `tpl_${templatesStore.size + 1}`;
        const created = {
          _id: id,
          ...update.$set,
          ...update.$setOnInsert,
        };
        templatesStore.set(id, clone(created));
        return clone(created);
      }
      return null;
    },
    exists: async (filter) => {
      return Array.from(eventsStore.values()).some((evt) => {
        return (
          evt.dynamicForm?.templateId && String(evt.dynamicForm.templateId) === String(filter['dynamicForm.templateId'])
        );
      });
    },
  };
});

jest.mock('../models/Event', () => {
  class EventDoc {
    constructor(data) {
      Object.assign(this, data);
    }

    async save() {
      this.updatedAt = new Date();
      eventsStore.set(String(this._id), clone(this));
      return this;
    }

    markModified() {}

    toDetailJSON() {
      return { ...clone(this), id: this._id };
    }
  }

  return {
    findById: async (id) => {
      const data = eventsStore.get(String(id));
      if (!data) return null;
      return new EventDoc(clone(data));
    },
    updateOne: async (filter, update) => {
      const doc = eventsStore.get(String(filter._id));
      if (!doc) return { modifiedCount: 0 };
      if (filter.registeredCount && !(doc.registeredCount < doc.maxParticipants)) {
        return { modifiedCount: 0 };
      }
      if (update.$inc?.registeredCount) {
        doc.registeredCount = (doc.registeredCount || 0) + update.$inc.registeredCount;
      }
      doc.updatedAt = new Date();
      eventsStore.set(String(doc._id), clone(doc));
      return { modifiedCount: 1 };
    },
    create: async (payload) => {
      const id = `evt_${eventsStore.size + 1}`;
      const doc = new EventDoc({ ...payload, _id: id });
      eventsStore.set(id, clone(doc));
      return doc;
    },
  };
});

jest.mock('../models/Registration', () => {
  class RegistrationDoc {
    constructor(data) {
      Object.assign(this, data);
      this.data = data.data instanceof Map ? data.data : new Map(Object.entries(data.data || {}));
      this.createdAt = data.createdAt || new Date();
      this.updatedAt = data.updatedAt || new Date();
    }

    async save() {
      this.updatedAt = new Date();
      registrationsStore.set(String(this._id), clone({
        ...this,
        data: Object.fromEntries(this.data.entries()),
      }));
      return this;
    }

    deleteOne() {
      registrationsStore.delete(String(this._id));
    }
  }

  return {
    findOne: (filter) => {
      const match = Array.from(registrationsStore.values()).find((item) => {
        return (
          (!filter.eventId || String(item.eventId) === String(filter.eventId)) &&
          (!filter.userId || String(item.userId) === String(filter.userId))
        );
      });
      return {
        lean: async () => (match ? clone(match) : null),
      };
    },
    create: async (docs) => {
      const createdDocs = docs.map((doc) => {
        const id = `reg_${registrationsStore.size + 1}`;
        const payload = {
          ...doc,
          _id: id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        registrationsStore.set(id, clone({
          ...payload,
          data: Object.fromEntries(payload.data.entries()),
        }));
        return new RegistrationDoc(payload);
      });
      return createdDocs;
    },
    aggregate: async () => [],
    findById: async (id) => {
      const data = registrationsStore.get(String(id));
      if (!data) return null;
      return new RegistrationDoc({ ...data, data: new Map(Object.entries(data.data || {})) });
    },
  };
});

jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    startSession: jest.fn(async () => {
      return {
        async withTransaction(fn) {
          await fn();
        },
        async abortTransaction() {},
        async endSession() {},
      };
    }),
  };
});

const eventRoutes = require('../routes/eventRoutes');
const formTemplateRoutes = require('../routes/formTemplates');
const registrationRoutes = require('../routes/registrations');
const errorHandler = require('../middleware/error');

const app = express();
app.use(express.json());
app.use('/api/events', eventRoutes);
app.use('/api/form-templates', formTemplateRoutes);
app.use('/api/registrations', registrationRoutes);
app.use(errorHandler);

beforeEach(() => {
  currentUser = { _id: 'admin', role: 'admin' };
  eventsStore.clear();
  templatesStore.clear();
  registrationsStore.clear();
});

describe('Form templates admin guard', () => {
  it('blocks non-admin template creation', async () => {
    currentUser = { _id: 'user-1', role: 'customer' };
    const res = await request(app)
      .post('/api/form-templates')
      .send({
        name: 'Test Template',
        category: 'other',
        fields: [
          { id: 'field1', label: 'Field 1', type: 'short_text' },
        ],
      });
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_ONLY');
    expect(res.body.error.message).toBe('Admin access required');
  });

  it('prevents non-admins from mutating event forms', async () => {
    currentUser = { _id: 'user-1', role: 'customer' };
    templatesStore.set('tpl_1', {
      _id: 'tpl_1',
      name: 'Test Template',
      category: 'other',
      fields: [{ id: 'field1', label: 'Field', type: 'short_text' }],
    });
    eventsStore.set('evt_2', {
      _id: 'evt_2',
      dynamicForm: { mode: 'embedded', fields: [], isActive: true },
    });
    const res = await request(app)
      .put('/api/events/evt_2/form/attach')
      .send({ templateId: 'tpl_1' });

    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_ONLY');
  });

  it('filters templates by category when requested', async () => {
    templatesStore.set('tpl_a', {
      _id: 'tpl_a',
      name: 'Solo Cup',
      category: 'esports',
      fields: [{ id: 'ign', label: 'IGN', type: 'short_text' }],
    });
    templatesStore.set('tpl_b', {
      _id: 'tpl_b',
      name: 'Trivia Night',
      category: 'quiz',
      fields: [{ id: 'team', label: 'Team', type: 'short_text' }],
    });

    const res = await request(app).get('/api/form-templates?category=esports');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].category).toBe('esports');
  });
});

describe('Event registration validations', () => {
  const baseEvent = {
    _id: 'evt_1',
    title: 'Sample Event',
    status: 'published',
    registrationOpenAt: new Date(Date.now() - 1000),
    registrationCloseAt: new Date(Date.now() + 100000),
    maxParticipants: 1,
    registeredCount: 0,
    teamSize: 1,
    dynamicForm: {
      mode: 'embedded',
      isActive: true,
      fields: [
        { id: 'player_name', label: 'Player Name', type: 'short_text', required: true },
      ],
    },
  };

  beforeEach(() => {
    eventsStore.set('evt_1', clone(baseEvent));
  });

  it('rejects submissions with unknown fields', async () => {
    const res = await request(app)
      .post('/api/events/evt_1/register')
      .send({
        data: {
          player_name: 'Alpha',
          extra: 'oops',
        },
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('UNKNOWN_FORM_FIELD');
    expect(res.body.error.details.fields).toContain('extra');
  });

  it('rejects submissions with undefined field id', async () => {
    const res = await request(app)
      .post('/api/events/evt_1/register')
      .send({
        data: {
          undefined: 'Alpha',
        },
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('UNKNOWN_FORM_FIELD');
    expect(res.body.error.details.fields).toContain('undefined');
  });

  it('prevents duplicate solo registrations', async () => {
    await request(app)
      .post('/api/events/evt_1/register')
      .send({ data: { player_name: 'Alpha' } });

    const res = await request(app)
      .post('/api/events/evt_1/register')
      .send({ data: { player_name: 'Bravo' } });

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_REGISTERED');
  });

  it('detects when event is full', async () => {
    const event = eventsStore.get('evt_1');
    event.registeredCount = 1;
    eventsStore.set('evt_1', event);

    const res = await request(app)
      .post('/api/events/evt_1/register')
      .send({ data: { player_name: 'Charlie' } });

    expect(res.statusCode).toBe(409);
    expect(res.body.error.code).toBe('EVENT_FULL');
  });

  it('returns 403 when form is inactive', async () => {
    const event = eventsStore.get('evt_1');
    event.dynamicForm.isActive = false;
    eventsStore.set('evt_1', event);

    const res = await request(app).get('/api/events/evt_1/form');
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('FORM_INACTIVE');
  });
});

describe('Template attach and preview flow', () => {
  beforeEach(() => {
    templatesStore.set('tpl_1', {
      _id: 'tpl_1',
      name: 'BGMI Solo Registration',
      category: 'esports',
      fields: [
        { id: 'ign', label: 'IGN', type: 'short_text', required: true },
      ],
    });
    eventsStore.set('evt_2', {
      _id: 'evt_2',
      title: 'BGMI Cup',
      status: 'published',
      registrationOpenAt: new Date(Date.now() - 1000),
      registrationCloseAt: new Date(Date.now() + 100000),
      maxParticipants: 10,
      registeredCount: 0,
      teamSize: 1,
      dynamicForm: { mode: 'embedded', isActive: false, fields: [] },
    });
  });

  it('attaches template and allows registration', async () => {
    await request(app)
      .put('/api/events/evt_2/form/attach')
      .send({ templateId: 'tpl_1' });

    await request(app)
      .put('/api/events/evt_2/form/toggle')
      .send({ isActive: true });

    const preview = await request(app).get('/api/events/evt_2/form/preview');
    expect(preview.statusCode).toBe(200);
    expect(preview.body.data.isActive).toBe(true);
    expect(preview.body.data.fields).toHaveLength(1);
    expect(preview.body.data.exampleSubmission).toBeDefined();

    currentUser = { _id: 'player-1', role: 'customer' };
    const formResponse = await request(app).get('/api/events/evt_2/form');
    expect(formResponse.statusCode).toBe(200);
    expect(formResponse.body.data.isActive).toBe(true);

    const res = await request(app)
      .post('/api/events/evt_2/register')
      .send({ data: { ign: 'PlayerOne' } });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.status).toBe('submitted');

    currentUser = { _id: 'admin', role: 'admin' };
    await request(app)
      .put('/api/events/evt_2/form/toggle')
      .send({ isActive: false });

    currentUser = { _id: 'player-2', role: 'customer' };
    const inactive = await request(app).get('/api/events/evt_2/form');
    expect(inactive.statusCode).toBe(403);
    expect(inactive.body.error.code).toBe('FORM_INACTIVE');
  });
});
