const express = require('express');
const request = require('supertest');

let currentUser = null;

const createId = (value) => ({
  value: String(value),
  toString() {
    return this.value;
  },
  equals(other) {
    if (!other) return false;
    if (typeof other.equals === 'function') {
      return other.equals(this.value);
    }
    return String(other) === this.value;
  },
});

const clone = (value) => JSON.parse(JSON.stringify(value));

const carts = new Map();
const products = new Map();
const shops = new Map();
const orders = new Map();
const services = new Map();
const serviceRequests = new Map();
const users = new Map();

const recomputeCartTotals = (cart) => {
  let subtotal = 0;
  for (const item of cart.items) {
    subtotal += item.unitPrice * item.qty;
  }
  cart.subtotal = subtotal;
  cart.discountTotal = 0;
  cart.grandTotal = subtotal;
  cart.updatedAt = new Date().toISOString();
  return cart;
};

class CartDocument {
  constructor(userId) {
    this._id = `cart-${userId}`;
    this.userId = userId;
    this.items = [];
    this.currency = 'INR';
    this.subtotal = 0;
    this.discountTotal = 0;
    this.grandTotal = 0;
    this.updatedAt = new Date().toISOString();
  }

  toObject() {
    return {
      _id: this._id,
      userId: this.userId,
      items: this.items.map((item) => ({
        productId:
          typeof item.productId?.toString === 'function'
            ? item.productId.toString()
            : String(item.productId?.value ?? item.productId ?? ''),
        product:
          typeof item.product?.toString === 'function'
            ? item.product.toString()
            : String(item.product?.value ?? item.product ?? ''),
        variantId:
          item.variantId && typeof item.variantId.toString === 'function'
            ? item.variantId.toString()
            : item.variantId
            ? String(item.variantId.value ?? item.variantId)
            : undefined,
        qty: item.qty,
        unitPrice: item.unitPrice,
        appliedDiscount: item.appliedDiscount || 0,
      })),
      currency: this.currency,
      subtotal: this.subtotal,
      discountTotal: this.discountTotal,
      grandTotal: this.grandTotal,
      updatedAt: this.updatedAt,
    };
  }

  async save() {
    recomputeCartTotals(this);
    carts.set(this.userId, this);
    return this;
  }
}

jest.mock('../src/middleware/authMiddleware', () => (req, _res, next) => {
  req.user = currentUser;
  next();
});

jest.mock('../../middleware/authMiddleware', () => (req, _res, next) => {
  req.user = currentUser;
  next();
});

jest.mock('../../middleware/ensureAdmin', () => (req, _res, next) => next());

const notifyUser = jest.fn().mockResolvedValue(undefined);

jest.mock('../services/notificationService', () => ({
  notifyUser,
}));

const findAddressesForUser = jest.fn(async () => []);
const upsertAddressFromShipping = jest.fn(async () => undefined);

jest.mock('../services/addressBookService', () => ({
  findAddressesForUser,
  upsertAddressFromShipping,
}));

jest.mock('../models/Cart', () => {
  const CartModel = function CartModel(payload) {
    const userId = String(payload.userId);
    const existing = carts.get(userId);
    if (existing) return existing;
    const doc = new CartDocument(userId);
    carts.set(userId, doc);
    return doc;
  };

  CartModel.findOne = async ({ userId }) => carts.get(String(userId)) || null;
  CartModel.removeItem = async (userId, productId, variantId) => {
    const doc = carts.get(String(userId));
    if (!doc) return null;
    const before = doc.items.length;
    doc.items = doc.items.filter(
      (item) =>
        !(
          item.productId.equals(productId) &&
          (!variantId ? !item.variantId : item.variantId?.equals(variantId))
        ),
    );
    const removed = before !== doc.items.length;
    await doc.save();
    return { cart: doc, removed };
  };

  return { CartModel };
});

const populateShop = (product) => {
  const shopId = product.shop && typeof product.shop === 'object' && product.shop._id
    ? product.shop._id
    : product.shop;
  const shop = shops.get(String(shopId));
  if (!shop) return { ...product };
  return {
    ...product,
    shop: {
      _id: createId(shop._id),
      name: shop.name,
      image: shop.image || null,
      owner: shop.owner,
    },
  };
};

const makeProductQuery = (items) => {
  const populatedItems = items.map(populateShop);
  const query = {
    select: () => query,
    populate: () => query,
    lean: async () => populatedItems.map(clone),
  };
  return query;
};

jest.mock('../models/Product', () => ({
  findById: (id) => {
    const product = products.get(String(id));
    if (!product) {
      return {
        populate: async () => null,
      };
    }
    return {
      async populate() {
        return {
          ...populateShop(product),
          toObject() {
            return clone(populateShop(product));
          },
        };
      },
    };
  },
  find: (filter = {}) => {
    const list = Array.from(products.values()).filter((product) => {
      if (filter._id?.$in) {
        const values = filter._id.$in.map(String);
        if (!values.includes(String(product._id))) {
          return false;
        }
      }
      if (filter.shop) {
        if (filter.shop.$in) {
          if (!filter.shop.$in.map(String).includes(String(product.shop))) return false;
        } else if (String(product.shop) !== String(filter.shop)) {
          return false;
        }
      }
      return true;
    });
    return makeProductQuery(list.map((product) => ({
      ...product,
      _id: createId(product._id),
    })));
  },
}));

const makeShopQuery = (items) => ({
  select: () => makeShopQuery(items),
  lean: async () => items.map(clone),
});

jest.mock('../models/Shop', () => ({
  findById: (id) => {
    const shop = shops.get(String(id));
    if (!shop) {
      return {
        select: () => makeShopQuery([]),
        lean: async () => null,
      };
    }
    return {
      select: () => ({
        lean: async () => ({
          _id: createId(shop._id),
          name: shop.name,
          location: shop.location || null,
          address: shop.address || null,
          owner: createId(shop.owner),
        }),
      }),
    };
  },
  find: (filter = {}) => {
    const list = Array.from(shops.values()).filter((shop) => {
      if (filter.owner) {
        return String(shop.owner) === String(filter.owner);
      }
      return true;
    });
    return makeShopQuery(
      list.map((shop) => ({
        _id: createId(shop._id),
        owner: createId(shop.owner),
      })),
    );
  },
}));

const toPlainOrder = (doc) => ({
  _id: doc._id,
  shop: doc.shop,
  user: doc.user,
  status: doc.status,
  items: doc.items.map((item) => ({ ...item })),
  timeline: doc.timeline.map((entry) => ({ ...entry })),
  notes: doc.notes,
  fulfillment: { ...doc.fulfillment },
  shippingAddress: doc.shippingAddress ? { ...doc.shippingAddress } : null,
  currency: doc.currency,
  itemsTotal: doc.itemsTotal,
  discountTotal: doc.discountTotal,
  taxTotal: doc.taxTotal,
  shippingFee: doc.shippingFee,
  grandTotal: doc.grandTotal,
  payment: { ...doc.payment },
  userSnapshot: doc.userSnapshot ? { ...doc.userSnapshot } : null,
  shopSnapshot: doc.shopSnapshot ? { ...doc.shopSnapshot } : null,
});

const createOrderInstance = (plain) => {
  const instance = {
    ...clone(plain),
    _id: plain._id,
    toObject() {
      return clone(toPlainOrder(instance));
    },
    toJSON() {
      return this.toObject();
    },
    async save() {
      orders.set(String(this._id), toPlainOrder(this));
      return this;
    },
    async lean() {
      return clone(toPlainOrder(instance));
    },
  };
  return instance;
};

const orderSort = (list, sortArg) => {
  if (sortArg?.createdAt) {
    const direction = sortArg.createdAt;
    list.sort((a, b) => {
      const left = new Date(a.createdAt || 0).getTime();
      const right = new Date(b.createdAt || 0).getTime();
      return direction < 0 ? right - left : left - right;
    });
  }
  return list;
};

const createOrderQuery = (initialFilter = {}) => {
  const filter = { ...initialFilter };
  let sortArg = null;
  let skipCount = 0;
  let limitCount = null;
  const applyFilter = () => {
    let list = Array.from(orders.values()).map((doc) => ({ ...doc }));
    if (filter.user) {
      list = list.filter((doc) => String(doc.user) === String(filter.user));
    }
    if (filter.shop) {
      if (filter.shop.$in) {
        list = list.filter((doc) => filter.shop.$in.map(String).includes(String(doc.shop)));
      } else {
        list = list.filter((doc) => String(doc.shop) === String(filter.shop));
      }
    }
    if (filter.status) {
      list = list.filter((doc) => doc.status === filter.status);
    }
    list = orderSort(list, sortArg);
    if (skipCount) {
      list = list.slice(skipCount);
    }
    if (limitCount !== null) {
      list = list.slice(0, limitCount);
    }
    return list;
  };

  const query = {
    sort(arg) {
      sortArg = arg;
      return query;
    },
    skip(value) {
      skipCount = Number(value) || 0;
      return query;
    },
    limit(value) {
      limitCount = Number(value) || null;
      return query;
    },
    where(field) {
      return {
        equals(value) {
          filter[field] = value;
          return query;
        },
      };
    },
    lean: async () => applyFilter().map((doc) => clone(doc)),
  };

  return query;
};

jest.mock('../models/Order', () => ({
  create: async (payload) => {
    const id = `order-${orders.size + 1}`;
    const doc = {
      _id: id,
      ...payload,
      timeline: Array.isArray(payload.timeline) ? payload.timeline : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    orders.set(id, toPlainOrder(doc));
    return createOrderInstance(doc);
  },
  find: (filter = {}) => createOrderQuery(filter),
  findOne: async (filter = {}) => {
    for (const value of orders.values()) {
      if (filter['payment.idempotencyKey']) {
        if (value.payment?.idempotencyKey === filter['payment.idempotencyKey']) {
          return createOrderInstance(value);
        }
      }
    }
    return null;
  },
  findById: (id) => {
    const doc = orders.get(String(id));
    if (!doc) return null;
    return createOrderInstance(doc);
  },
}));

jest.mock('../models/Service', () => ({
  findOne: async (filter = {}) => {
    for (const service of services.values()) {
      if (String(service._id) === String(filter._id)) {
        if (filter.isActive !== undefined && service.isActive === false) {
          return null;
        }
        return clone(service);
      }
    }
    return null;
  },
}));

const buildServiceRequestPlain = (doc) => ({
  ...doc,
  history: Array.isArray(doc.history) ? doc.history : [],
});

const createServiceRequestInstance = (plain) => {
  const instance = {
    ...clone(plain),
    _id: plain._id,
    toObject() {
      return buildServiceRequestPlain(instance);
    },
    async save() {
      serviceRequests.set(String(this._id), buildServiceRequestPlain(this));
      return this;
    },
    populate(path) {
      if (path === 'user' || path === 'userId') {
        const user = users.get(String(instance.user)) || users.get(String(instance.userId));
        if (user) {
          instance.user = { ...user, _id: createId(user._id) };
        }
      }
      if (path === 'service' || path === 'serviceId') {
        const service = services.get(String(instance.service)) || services.get(String(instance.serviceId));
        if (service) {
          instance.service = { ...service };
        }
      }
      if (path === 'provider') {
        const provider = users.get(String(instance.provider)) || users.get(String(instance.assignedProviderId));
        if (provider) {
          instance.provider = { ...provider, _id: createId(provider._id) };
        }
      }
      return instance;
    },
  };
  return instance;
};

const applyServiceRequestFilter = (filter = {}) => {
  let list = Array.from(serviceRequests.values()).map((doc) => ({ ...doc }));
  if (filter.$or) {
    list = list.filter((doc) =>
      filter.$or.some((clause) =>
        Object.entries(clause).every(([key, value]) => {
          if (value instanceof Object && value.$in) {
            return value.$in.map(String).includes(String(doc[key]));
          }
          return String(doc[key]) === String(value);
        }),
      ),
    );
  }
  if (filter.user) {
    list = list.filter((doc) => String(doc.user) === String(filter.user));
  }
  if (filter.userId) {
    list = list.filter((doc) => String(doc.userId) === String(filter.userId));
  }
  if (filter.service) {
    list = list.filter((doc) => String(doc.service) === String(filter.service));
  }
  if (filter.provider) {
    list = list.filter((doc) => String(doc.provider) === String(filter.provider));
  }
  return list;
};

const makeServiceRequestQuery = (items) => {
  const query = {
    sort: () => query,
    populate: () => query,
    lean: async () => items.map(clone),
    exec: async () => items.map((doc) => createServiceRequestInstance(doc)),
  };
  return query;
};

jest.mock('../models/ServiceRequest', () => ({
  create: async (payload) => {
    const id = `req-${serviceRequests.size + 1}`;
    const record = {
      _id: id,
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [],
    };
    serviceRequests.set(id, buildServiceRequestPlain(record));
    return record;
  },
  findById: (id) => {
    const record = serviceRequests.get(String(id));
    if (!record) return null;
    return createServiceRequestInstance(record);
  },
  findByIdAndUpdate: async (id, update) => {
    const current = serviceRequests.get(String(id));
    if (!current) return null;
    const next = { ...current, ...update, updatedAt: new Date().toISOString() };
    serviceRequests.set(String(id), buildServiceRequestPlain(next));
    return createServiceRequestInstance(next);
  },
  find: (filter = {}) => {
    const list = applyServiceRequestFilter(filter);
    return makeServiceRequestQuery(list);
  },
}));

jest.mock('../models/User', () => ({
  findOne: async (filter = {}) => {
    for (const user of users.values()) {
      if (filter._id && String(user._id) !== String(filter._id)) continue;
      if (filter.role && user.role !== filter.role) continue;
      return clone(user);
    }
    return null;
  },
}));

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.traceId = 'test-trace';
    next();
  });
  app.use('/api/cart', require('../src/routes/cart'));
  app.use('/api/orders', require('../src/routes/orders'));
  app.use('/api/services', require('../src/routes/services'));
  app.use(require('../middleware/error'));
  return app;
};

const resetState = () => {
  carts.clear();
  products.clear();
  shops.clear();
  orders.clear();
  services.clear();
  serviceRequests.clear();
  users.clear();
  notifyUser.mockClear();
  findAddressesForUser.mockClear();
  upsertAddressFromShipping.mockClear();
};

beforeEach(() => {
  resetState();
  const businessId = 'biz-1';
  const customerId = 'cust-1';
  const providerId = 'prov-1';
  users.set(customerId, { _id: customerId, role: 'customer', name: 'Customer', phone: '9000000000' });
  users.set(businessId, { _id: businessId, role: 'business', name: 'Owner', phone: '9111111111' });
  users.set(providerId, { _id: providerId, role: 'business', name: 'Provider', phone: '9222222222' });

  const shopId = 'shop-1';
  shops.set(shopId, { _id: shopId, name: 'Corner Store', owner: businessId });

  const productId = 'prod-1';
  products.set(productId, {
    _id: productId,
    name: 'Green Tea',
    price: 120,
    shop: shopId,
    status: 'active',
  });

  services.set('service-1', {
    _id: 'service-1',
    name: 'Delivery Assistance',
    isActive: true,
  });
});

describe('Cart checkout and service flows', () => {
  it('adds items to the cart, checks out, and clears the cart', async () => {
    currentUser = users.get('cust-1');
    const app = buildApp();

    const addResponse = await request(app)
      .post('/api/cart')
      .send({ productId: 'prod-1', quantity: 2 });
    expect(addResponse.status).toBe(201);
    expect(addResponse.body.data.cart.items[0].qty).toBe(2);

    const checkoutResponse = await request(app)
      .post('/api/orders/checkout')
      .send({
        shippingAddress: {
          address1: '42 Galaxy Road',
          city: 'Mumbai',
          pincode: '400001',
        },
      });

    expect(checkoutResponse.status).toBe(201);
    expect(checkoutResponse.body.data.orders).toHaveLength(1);
    expect(checkoutResponse.body.data.orders[0].status).toBe('pending');

    const cartResponse = await request(app).get('/api/cart');
    expect(cartResponse.body.data.cart.items).toHaveLength(0);
  });

  it('allows the business owner to accept an order and persist the status', async () => {
    currentUser = users.get('cust-1');
    const app = buildApp();

    await request(app)
      .post('/api/cart')
      .send({ productId: 'prod-1', quantity: 1 });

    await request(app)
      .post('/api/orders/checkout')
      .send({
        shippingAddress: {
          address1: '42 Galaxy Road',
          city: 'Mumbai',
          pincode: '400001',
        },
      });

    const createdOrderId = Array.from(orders.keys())[0];
    currentUser = users.get('biz-1');
    currentUser.role = 'business';

    const response = await request(app)
      .patch(`/api/orders/${createdOrderId}/status`)
      .send({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(response.body.data.order.status).toBe('accepted');
    expect(orders.get(createdOrderId).status).toBe('accepted');
  });

  it('completes the service request lifecycle for admin and provider', async () => {
    const app = buildApp();
    currentUser = { ...users.get('cust-1'), role: 'customer' };

    const createRes = await request(app)
      .post('/api/services/requests')
      .send({
        serviceId: 'service-1',
        desc: 'Need delivery help',
        location: 'MG Road',
        phone: '9333333333',
      });

    expect(createRes.status).toBe(201);
    const requestId = createRes.body.data.request.id;

    currentUser = { ...users.get('biz-1'), role: 'admin' };
    const assignRes = await request(app)
      .patch(`/api/services/requests/${requestId}`)
      .send({ providerId: 'prov-1', status: 'ASSIGNED' });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.request.status).toBe('ASSIGNED');

    currentUser = { ...users.get('prov-1'), role: 'business' };
    const assignedList = await request(app).get('/api/services/requests/assigned');
    expect(assignedList.status).toBe(200);
    expect(assignedList.body.data.requests[0].status).toBe('ASSIGNED');

    currentUser = { ...users.get('biz-1'), role: 'admin' };
    await request(app)
      .patch(`/api/services/requests/${requestId}`)
      .send({ status: 'IN_PROGRESS' });

    await request(app)
      .patch(`/api/services/requests/${requestId}`)
      .send({ status: 'COMPLETED' });

    const finalState = serviceRequests.get(requestId);
    expect(finalState.status).toBe('completed');
  });
});
