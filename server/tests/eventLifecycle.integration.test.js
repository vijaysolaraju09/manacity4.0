const request = require('supertest');
const express = require('express');
const { Types } = require('mongoose');

jest.mock('../models/Event', () => {
  const { deepClone, matchesFilter, generateId, toStringId } = require('../tests/helpers/mockUtils');
  const store = new Map();

  class EventDoc {
    constructor(data) {
      Object.assign(this, deepClone(data));
    }

    toDetailJSON() {
      return {
        id: this._id,
        _id: this._id,
        title: this.title,
        type: this.type,
        category: this.category,
        format: this.format,
        teamSize: this.teamSize,
        maxParticipants: this.maxParticipants,
        registeredCount: this.registeredCount,
        registrationOpenAt: this.registrationOpenAt,
        registrationCloseAt: this.registrationCloseAt,
        startAt: this.startAt,
        endAt: this.endAt,
        status: this.status,
        mode: this.mode,
        venue: this.venue,
        visibility: this.visibility,
        timezone: this.timezone,
        description: this.description,
        rules: this.rules,
        prizePool: this.prizePool,
        bannerUrl: this.bannerUrl,
        coverUrl: this.coverUrl,
        updatesCount: this.updatesCount,
        leaderboardVersion: this.leaderboardVersion,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    }

    async save() {
      this.updatedAt = new Date();
      store.set(this._id, serialize(this));
      return this;
    }
  }

  function serialize(doc) {
    const data = {};
    for (const key of Object.keys(doc)) {
      if (typeof doc[key] === 'function') continue;
      data[key] = deepClone(doc[key]);
    }
    return data;
  }

  function normalizePayload(payload) {
    const now = new Date();
    return {
      _id: generateId(),
      title: payload.title,
      type: payload.type || 'tournament',
      category: payload.category || 'other',
      format: payload.format || 'single_match',
      teamSize: payload.teamSize ?? 1,
      maxParticipants: payload.maxParticipants ?? payload.capacity ?? 0,
      registrationOpenAt: payload.registrationOpenAt ? new Date(payload.registrationOpenAt) : null,
      registrationCloseAt: payload.registrationCloseAt ? new Date(payload.registrationCloseAt) : null,
      startAt: payload.startAt ? new Date(payload.startAt) : null,
      endAt: payload.endAt ? new Date(payload.endAt) : null,
      timezone: payload.timezone || 'UTC',
      mode: payload.mode || 'online',
      venue: payload.venue || null,
      visibility: payload.visibility || 'public',
      status: payload.status || 'draft',
      description: payload.description || '',
      rules: payload.rules || '',
      prizePool: payload.prizePool || null,
      bannerUrl: payload.bannerUrl || null,
      coverUrl: payload.coverUrl || null,
      registeredCount: payload.registeredCount ?? 0,
      createdBy: payload.createdBy ? toStringId(payload.createdBy) : null,
      updatesCount: payload.updatesCount ?? 0,
      leaderboardVersion: payload.leaderboardVersion ?? 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  function applyUpdate(target, update = {}) {
    if (update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) {
        target[key] = (target[key] || 0) + value;
      }
    }
    if (update.$set) {
      for (const [key, value] of Object.entries(update.$set)) {
        target[key] = value;
      }
    }
  }

  return {
    create: async (payload) => {
      const data = normalizePayload(payload);
      store.set(data._id, data);
      return new EventDoc(data);
    },
    findById: async (id) => {
      const data = store.get(toStringId(id));
      return data ? new EventDoc(data) : null;
    },
    updateOne: async (filter = {}, update = {}) => {
      for (const [id, data] of store.entries()) {
        if (matchesFilter(data, filter)) {
          applyUpdate(data, update);
          data.updatedAt = new Date();
          store.set(id, data);
          return { modifiedCount: 1 };
        }
      }
      return { modifiedCount: 0 };
    },
    __reset: () => store.clear(),
    __store: store,
  };
});

jest.mock('../models/EventRegistration', () => {
  const { deepClone, matchesFilter, createQuery, generateId, toStringId } = require('../tests/helpers/mockUtils');
  const store = [];

  return {
    create: async (payload) => {
      const eventId = toStringId(payload.event);
      const userId = toStringId(payload.user);
      if (store.some((reg) => reg.event === eventId && reg.user === userId)) {
        const err = new Error('Duplicate registration');
        err.code = 11000;
        throw err;
      }
      const registration = {
        _id: generateId(),
        event: eventId,
        user: userId,
        teamName: payload.teamName || null,
        ign: payload.ign || null,
        contact: payload.contact || null,
        members: Array.isArray(payload.members)
          ? payload.members.map((member) => ({
              user: toStringId(member.user || member),
              ign: member.ign || null,
            }))
          : [],
        lobby: payload.lobby ? deepClone(payload.lobby) : null,
        metadata: payload.metadata ? deepClone(payload.metadata) : undefined,
        status: payload.status || 'registered',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.push(registration);
      return deepClone(registration);
    },
    find: (filter = {}) => createQuery(store, filter),
    findOne: (filter = {}) => createQuery(store, filter, { single: true }),
    countDocuments: async (filter = {}) => store.filter((doc) => matchesFilter(doc, filter)).length,
    __reset: () => {
      store.length = 0;
    },
    __store: store,
  };
});

jest.mock('../models/EventUpdate', () => {
  const { deepClone, createQuery, generateId, toStringId } = require('../tests/helpers/mockUtils');
  const store = [];

  return {
    create: async (payload) => {
      const update = {
        _id: generateId(),
        event: toStringId(payload.event),
        type: payload.type || 'pre',
        message: payload.message,
        postedBy: toStringId(payload.postedBy),
        isPinned: !!payload.isPinned,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      store.push(update);
      return deepClone(update);
    },
    find: (filter = {}) => createQuery(store, filter),
    __reset: () => {
      store.length = 0;
    },
    __store: store,
  };
});

jest.mock('../models/LeaderboardEntry', () => {
  const { deepClone, matchesFilter, createQuery, generateId, toStringId } = require('../tests/helpers/mockUtils');
  const store = [];

  function applySet(entry, set = {}) {
    for (const [key, value] of Object.entries(set)) {
      if (key === '_id') continue;
      entry[key] = deepClone(value);
    }
  }

  return {
    bulkWrite: async (operations = []) => {
      for (const op of operations) {
        if (!op.updateOne) continue;
        const { filter, update, upsert } = op.updateOne;
        const normalized = store.find((doc) => matchesFilter(doc, filter));
        if (normalized) {
          applySet(normalized, update?.$set || {});
        } else if (upsert) {
          const entry = {
            _id: generateId(),
            event: toStringId(filter.event || update?.$set?.event),
            participantId: update?.$set?.participantId ? toStringId(update.$set.participantId) : null,
            user: update?.$set?.user ? toStringId(update.$set.user) : null,
            teamName: update?.$set?.teamName || null,
            points: 0,
            rank: undefined,
            wins: undefined,
            losses: undefined,
            kills: undefined,
            time: undefined,
            metadata: undefined,
          };
          applySet(entry, update?.$set || {});
          entry.event = toStringId(entry.event);
          if (entry.participantId) entry.participantId = toStringId(entry.participantId);
          if (entry.user) entry.user = toStringId(entry.user);
          store.push(entry);
        }
      }
    },
    find: (filter = {}) => createQuery(store, filter),
    deleteMany: async (filter = {}) => {
      if (filter._id && filter._id.$in) {
        const ids = filter._id.$in.map((id) => toStringId(id));
        for (let i = store.length - 1; i >= 0; i -= 1) {
          if (ids.includes(toStringId(store[i]._id))) {
            store.splice(i, 1);
          }
        }
      }
    },
    __reset: () => {
      store.length = 0;
    },
    __store: store,
  };
});

jest.mock('../models/Notification', () => {
  const store = [];
  return {
    insertMany: async (docs = []) => {
      store.push(...docs);
    },
    __reset: () => {
      store.length = 0;
    },
    __store: store,
  };
});

jest.mock('../middleware/authMiddleware', () => {
  const { getUser } = require('../tests/helpers/authState');
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.split(' ')[1];
    const user = getUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    return next();
  };
});

const { setUsers, getUser } = require('./helpers/authState');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventUpdate = require('../models/EventUpdate');
const LeaderboardEntry = require('../models/LeaderboardEntry');
const Notification = require('../models/Notification');
const eventRoutes = require('../routes/eventRoutes');
const errorHandler = require('../middleware/error');

jest.setTimeout(10000);

describe('event lifecycle integration', () => {
  let app;
  let adminToken;
  let playerToken;
  let waitlistToken;
  let adminId;
  let playerId;
  let waitlistId;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      req.traceId = 'test-trace';
      const auth = req.headers.authorization;
      if (auth) {
        const token = auth.split(' ')[1];
        const user = getUser(token);
        if (user) req.user = user;
      }
      next();
    });
    app.use('/events', eventRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    Event.__reset();
    EventRegistration.__reset();
    EventUpdate.__reset();
    LeaderboardEntry.__reset();
    Notification.__reset();

    adminId = new Types.ObjectId().toString();
    playerId = new Types.ObjectId().toString();
    waitlistId = new Types.ObjectId().toString();

    adminToken = 'admin-token';
    playerToken = 'player-token';
    waitlistToken = 'waitlist-token';

    setUsers({
      [adminToken]: { _id: adminId, role: 'admin', name: 'Admin User' },
      [playerToken]: { _id: playerId, role: 'user', name: 'Player One' },
      [waitlistToken]: { _id: waitlistId, role: 'user', name: 'Player Two' },
    });
  });

  it('handles event creation, publishing, registration, updates, leaderboard, and completion', async () => {
    const now = Date.now();
    const payload = {
      title: 'Championship Finals',
      type: 'tournament',
      category: 'other',
      format: 'single_match',
      teamSize: 1,
      maxParticipants: 1,
      registrationOpenAt: new Date(now - 60 * 60 * 1000).toISOString(),
      registrationCloseAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
      startAt: new Date(now + 3 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(now + 4 * 60 * 60 * 1000).toISOString(),
      timezone: 'UTC',
      description: 'The ultimate showdown.',
      rules: 'Be fair and have fun.',
    };

    const createRes = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload)
      .expect(201);

    expect(createRes.body.ok).toBe(true);
    expect(createRes.body.data.title).toBe('Championship Finals');
    expect(createRes.body.data.status).toBe('draft');

    const eventId = createRes.body.data._id;

    const publishRes = await request(app)
      .post(`/events/${eventId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(publishRes.body.data.status).toBe('published');

    const registerRes = await request(app)
      .post(`/events/${eventId}/register`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})
      .expect(200);

    expect(registerRes.body.data.status).toBe('registered');
    expect(registerRes.body.data.registration.status).toBe('registered');

    await request(app)
      .post(`/events/${eventId}/register`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({})
      .expect(409);

    const waitlistRes = await request(app)
      .post(`/events/${eventId}/register`)
      .set('Authorization', `Bearer ${waitlistToken}`)
      .send({})
      .expect(200);

    expect(waitlistRes.body.data.status).toBe('waitlisted');

    const storedEvent = await Event.findById(eventId);
    expect(storedEvent.registeredCount).toBe(1);

    const updateRes = await request(app)
      .post(`/events/${eventId}/updates`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'Match schedule released', type: 'live' })
      .expect(201);

    expect(updateRes.body.data.message).toBe('Match schedule released');

    const leaderboardRes = await request(app)
      .post(`/events/${eventId}/leaderboard`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ entries: [{ user: playerId, points: 25, rank: 1, wins: 3, losses: 0 }] })
      .expect(200);

    expect(leaderboardRes.body.data.entries).toHaveLength(1);
    expect(leaderboardRes.body.data.entries[0].points).toBe(25);

    const completeRes = await request(app)
      .post(`/events/${eventId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(completeRes.body.data.status).toBe('completed');

    const detailRes = await request(app)
      .get(`/events/${eventId}`)
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);

    expect(detailRes.body.data.status).toBe('completed');
    expect(detailRes.body.data.registration.status).toBe('registered');
    expect(detailRes.body.data.isRegistrationOpen).toBe(false);

    const updatesRes = await request(app).get(`/events/${eventId}/updates`).expect(200);
    expect(updatesRes.body.data).toHaveLength(1);
    expect(updatesRes.body.data[0].message).toBe('Match schedule released');

    const leaderboardGet = await request(app).get(`/events/${eventId}/leaderboard`).expect(200);
    expect(leaderboardGet.body.data.entries).toHaveLength(1);
    expect(leaderboardGet.body.data.entries[0].points).toBe(25);

    const myRegRes = await request(app)
      .get(`/events/${eventId}/registered/me`)
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(200);

    expect(myRegRes.body.data.status).toBe('registered');
  });
});
