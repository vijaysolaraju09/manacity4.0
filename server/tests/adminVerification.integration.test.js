const request = require('supertest');
const express = require('express');
const { Types } = require('mongoose');

jest.mock('../middleware/authMiddleware', () =>
  jest.fn((req, _res, next) => {
    req.user = { _id: 'admin-user', role: 'admin' };
    next();
  }),
);
jest.mock('../middleware/isAdmin', () => jest.fn((_req, _res, next) => next()));

jest.mock('../models/User', () => {
  const { users, verified, clone } = require('../tests/helpers/inMemoryStore');

  const selectFields = (source, select) => {
    if (!select) return clone(source);
    const fields = String(select)
      .split(/\s+/)
      .map((field) => field.trim())
      .filter(Boolean);
    if (!fields.length) return clone(source);
    const shaped = {};
    for (const field of fields) {
      shaped[field] = clone(source[field]);
    }
    return shaped;
  };

  const findById = jest.fn(async (id) => {
    const doc = users.get(String(id));
    return doc ? clone(doc) : null;
  });

  const findByIdAndUpdate = jest.fn(async (id, update = {}, options = {}) => {
    const key = String(id);
    const current = users.get(key);
    if (!current) return null;
    const next = clone(current);
    for (const [field, value] of Object.entries(update)) {
      next[field] = value;
    }
    next.updatedAt = new Date();
    users.set(key, next);
    if (!options.new) return null;
    const shaped = selectFields(next, options.select);
    return shaped;
  });

  const aggregate = jest.fn(async (pipeline = []) => {
    const wantsCount = pipeline.some((stage) => stage.$count);
    let docs = [];

    for (const user of users.values()) {
      const verifiedDoc = Array.from(verified.values()).find(
        (entry) => String(entry.user) === String(user._id) && entry.status === 'approved',
      );
      if (!verifiedDoc) continue;

      docs.push({
        _id: verifiedDoc._id,
        userId: user._id,
        name: user.name,
        phone: user.phone,
        location: user.location || '',
        address: user.address || '',
        profession: verifiedDoc.profession,
        bio: verifiedDoc.bio || '',
        portfolio: Array.isArray(verifiedDoc.portfolio)
          ? verifiedDoc.portfolio.map((item) => clone(item))
          : [],
        status: 'approved',
        ratingAvg:
          typeof verifiedDoc.ratingAvg === 'number' ? verifiedDoc.ratingAvg : 0,
        ratingCount:
          typeof verifiedDoc.ratingCount === 'number' ? verifiedDoc.ratingCount : 0,
        createdAt: verifiedDoc.createdAt,
        updatedAt: verifiedDoc.updatedAt,
      });
    }

    docs.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    const skipStage = pipeline.find((stage) => stage.$skip);
    if (skipStage && typeof skipStage.$skip === 'number' && skipStage.$skip > 0) {
      docs = docs.slice(skipStage.$skip);
    }

    const limitStage = pipeline.find((stage) => stage.$limit);
    if (limitStage && typeof limitStage.$limit === 'number') {
      docs = docs.slice(0, limitStage.$limit);
    }

    if (wantsCount) {
      return docs.length ? [{ count: docs.length }] : [];
    }

    return docs.map((doc) => clone(doc));
  });

  return {
    findById,
    findByIdAndUpdate,
    aggregate,
  };
});

jest.mock('../models/Verified', () => {
  const { verified, users, clone } = require('../tests/helpers/inMemoryStore');

  class VerifiedDoc {
    constructor(data) {
      Object.assign(this, clone(data));
    }

    toCardJSON(userDoc) {
      const baseUser =
        userDoc && typeof userDoc === 'object'
          ? {
              _id: String(userDoc._id),
              name: userDoc.name,
              phone: userDoc.phone,
              location: userDoc.location || '',
              address: userDoc.address || '',
            }
          : this.user;
      return {
        id: String(this._id),
        _id: String(this._id),
        user: baseUser,
        profession: this.profession,
        bio: this.bio || '',
        portfolio: Array.isArray(this.portfolio)
          ? this.portfolio.map((item) => clone(item))
          : [],
        status: this.status,
        ratingAvg: typeof this.ratingAvg === 'number' ? this.ratingAvg : 0,
        ratingCount: typeof this.ratingCount === 'number' ? this.ratingCount : 0,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    }

    async save() {
      const key = String(this._id);
      const current = verified.get(key);
      if (!current) throw new Error('Document not found');
      const next = clone(current);
      next.profession = this.profession;
      next.bio = this.bio;
      next.portfolio = Array.isArray(this.portfolio)
        ? this.portfolio.map((item) => clone(item))
        : [];
      next.status = this.status;
      next.ratingAvg = this.ratingAvg;
      next.ratingCount = this.ratingCount;
      next.updatedAt = new Date();
      verified.set(key, next);
      this.updatedAt = next.updatedAt;
      return this;
    }

    populate() {
      const userDoc = users.get(String(this.user));
      if (userDoc) {
        this.user = clone(userDoc);
      }
      return Promise.resolve(this);
    }
  }

  const matches = (doc, match = {}) => {
    for (const [field, condition] of Object.entries(match)) {
      if (condition && typeof condition === 'object' && condition.$regex) {
        const regex = new RegExp(condition.$regex, condition.$options);
        if (!regex.test(doc[field] || '')) return false;
        continue;
      }
      if (doc[field] !== condition) return false;
    }
    return true;
  };

  const aggregate = jest.fn(async (pipeline = []) => {
    const wantsCount = pipeline.some((stage) => stage.$count);
    const matchStage = pipeline.find((stage) => stage.$match)?.$match;

    let docs = Array.from(verified.values()).map((doc) => clone(doc));

    if (matchStage) {
      docs = docs.filter((doc) => matches(doc, matchStage));
    }

    docs = docs
      .map((doc) => {
        const userDoc = users.get(String(doc.user));
        if (!userDoc) return null;
        return { ...doc, user: clone(userDoc) };
      })
      .filter(Boolean);

    const sortStage = pipeline.find((stage) => stage.$sort)?.$sort;
    if (sortStage) {
      docs.sort((a, b) => {
        for (const [field, direction] of Object.entries(sortStage)) {
          const multiplier = direction >= 0 ? 1 : -1;
          const aValue = a[field];
          const bValue = b[field];
          if (aValue === bValue) continue;
          if (aValue === undefined || aValue === null) return -multiplier;
          if (bValue === undefined || bValue === null) return multiplier;
          if (aValue > bValue) return multiplier;
          if (aValue < bValue) return -multiplier;
        }
        return 0;
      });
    }

    const skipStage = pipeline.find((stage) => stage.$skip);
    if (skipStage && typeof skipStage.$skip === 'number' && skipStage.$skip > 0) {
      docs = docs.slice(skipStage.$skip);
    }

    const limitStage = pipeline.find((stage) => stage.$limit);
    if (limitStage && typeof limitStage.$limit === 'number') {
      docs = docs.slice(0, limitStage.$limit);
    }

    if (wantsCount) {
      return docs.length ? [{ count: docs.length }] : [];
    }

    return docs.map((doc) => clone(doc));
  });

  const findById = jest.fn(async (id) => {
    const doc = verified.get(String(id));
    if (!doc) return null;
    return new VerifiedDoc({ ...clone(doc) });
  });

  const hydrate = (doc) => new VerifiedDoc(doc);

  return {
    aggregate,
    findById,
    hydrate,
  };
});

const adminVerifiedRoutes = require('../routes/adminVerifiedRoutes');
const adminRoutes = require('../routes/adminRoutes');
const verifiedRoutes = require('../routes/verifiedRoutes');
const errorHandler = require('../middleware/error');
const { users, verified, resetStores } = require('../tests/helpers/inMemoryStore');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/verified', adminVerifiedRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/verified', verifiedRoutes);
  app.use(errorHandler);
  return app;
};

describe('admin verification approvals', () => {
  const app = buildApp();

  beforeEach(() => {
    resetStores();
  });

  it('persists approval and exposes the verified profile', async () => {
    const now = new Date('2024-01-01T00:00:00Z');
    const userId = new Types.ObjectId().toString();
    const verificationId = new Types.ObjectId().toString();

    users.set(userId, {
      _id: userId,
      name: 'Pending Pro',
      phone: '5550000',
      location: 'Metro City',
      address: '1 Admin Way',
      isVerified: false,
      verificationStatus: 'pending',
      roles: ['customer'],
      isActive: true,
      profession: '',
      bio: '',
      createdAt: now,
      updatedAt: now,
    });

    verified.set(verificationId, {
      _id: verificationId,
      user: userId,
      profession: 'Photographer',
      bio: 'Shoots weddings',
      portfolio: [],
      status: 'pending',
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const agent = request(app);

    const pendingBefore = await agent
      .get('/api/admin/verified/requests?status=pending&page=1&pageSize=10')
      .expect(200);

    expect(pendingBefore.body.data.requests).toHaveLength(1);
    expect(pendingBefore.body.data.requests[0].status).toBe('pending');

    await agent
      .patch(`/api/admin/verified/${verificationId}/status`)
      .send({ status: 'approved' })
      .expect(200);

    const pendingAfter = await agent
      .get('/api/admin/verified/requests?status=pending&page=1&pageSize=10')
      .expect(200);
    expect(pendingAfter.body.data.requests).toHaveLength(0);

    const approvedList = await agent
      .get('/api/admin/verified/requests?status=approved&page=1&pageSize=10')
      .expect(200);
    expect(approvedList.body.data.requests).toHaveLength(1);
    expect(approvedList.body.data.requests[0].status).toBe('approved');

    const publicList = await agent.get('/api/verified').expect(200);
    expect(publicList.body.data.items).toHaveLength(1);
    expect(publicList.body.data.items[0].status).toBe('approved');
    expect(publicList.body.data.items[0].user._id).toBe(userId);
  });
});
