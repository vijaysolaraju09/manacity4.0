const { Types } = require('mongoose');

function toStringId(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (typeof value === 'object' && value._id) return toStringId(value._id);
  return String(value);
}

function deepClone(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item));
  }
  if (value && typeof value === 'object') {
    const clone = {};
    for (const key of Object.keys(value)) {
      clone[key] = deepClone(value[key]);
    }
    return clone;
  }
  return value;
}

function parseFields(fields) {
  if (!fields) return null;
  if (Array.isArray(fields)) return fields;
  if (typeof fields === 'string') {
    return fields
      .split(/\s+/)
      .map((f) => f.trim())
      .filter(Boolean);
  }
  return Object.keys(fields).filter((key) => fields[key]);
}

function pickFields(doc, fields) {
  if (!fields || !fields.length) return deepClone(doc);
  const picked = {};
  for (const field of fields) {
    picked[field] = deepClone(doc[field]);
  }
  return picked;
}

function compareValues(a, b, direction) {
  const dir = direction >= 0 ? 1 : -1;
  if (a === b) return 0;
  if (a === undefined || a === null) return -dir;
  if (b === undefined || b === null) return dir;
  if (a > b) return dir;
  if (a < b) return -dir;
  return 0;
}

function sortItems(items, sort) {
  const entries = Object.entries(sort);
  if (!entries.length) return items.slice();
  return items.slice().sort((a, b) => {
    for (const [field, direction] of entries) {
      const result = compareValues(a[field], b[field], direction);
      if (result !== 0) return result;
    }
    return 0;
  });
}

function matchesFilter(doc, filter = {}) {
  if (!filter || !Object.keys(filter).length) return true;
  for (const [key, condition] of Object.entries(filter)) {
    if (key === '$and') {
      if (!Array.isArray(condition) || !condition.every((c) => matchesFilter(doc, c))) return false;
      continue;
    }
    if (key === '$or') {
      if (!Array.isArray(condition) || !condition.some((c) => matchesFilter(doc, c))) return false;
      continue;
    }
    const value = doc[key];
    if (condition && typeof condition === 'object' && !Array.isArray(condition) && !(condition instanceof Date)) {
      if ('$in' in condition) {
        const list = condition.$in.map((item) => toStringId(item));
        if (!list.includes(toStringId(value))) return false;
        continue;
      }
      if ('$nin' in condition) {
        const list = condition.$nin.map((item) => toStringId(item));
        if (list.includes(toStringId(value))) return false;
        continue;
      }
      if ('$lt' in condition && !(value < condition.$lt)) return false;
      if ('$lte' in condition && !(value <= condition.$lte)) return false;
      if ('$gt' in condition && !(value > condition.$gt)) return false;
      if ('$gte' in condition && !(value >= condition.$gte)) return false;
      if ('$ne' in condition && toStringId(value) === toStringId(condition.$ne)) return false;
      continue;
    }
    if (toStringId(value) !== toStringId(condition)) return false;
  }
  return true;
}

function createQuery(source, filter = {}, { single = false } = {}) {
  const dataRef = source;
  const queryState = {
    _fields: null,
    _sort: null,
    _limit: null,
    _skip: null,
    _lean: false,
  };

  const execute = () => {
    let items = dataRef.filter((doc) => matchesFilter(doc, filter));
    if (queryState._sort) {
      items = sortItems(items, queryState._sort);
    }
    if (typeof queryState._skip === 'number') {
      items = items.slice(queryState._skip);
    }
    if (typeof queryState._limit === 'number') {
      items = items.slice(0, queryState._limit);
    }

    if (single) {
      const item = items[0];
      if (!item) return null;
      const shaped = queryState._fields ? pickFields(item, queryState._fields) : deepClone(item);
      return queryState._lean ? deepClone(shaped) : shaped;
    }

    return items.map((item) => {
      const shaped = queryState._fields ? pickFields(item, queryState._fields) : deepClone(item);
      return queryState._lean ? deepClone(shaped) : shaped;
    });
  };

  const query = {
    select(fields) {
      queryState._fields = parseFields(fields);
      return this;
    },
    sort(sort) {
      queryState._sort = sort;
      return this;
    },
    limit(limit) {
      queryState._limit = limit;
      return this;
    },
    skip(skip) {
      queryState._skip = skip;
      return this;
    },
    populate() {
      return this;
    },
    lean() {
      queryState._lean = true;
      return this;
    },
    exec() {
      return Promise.resolve(execute());
    },
    then(resolve, reject) {
      return this.exec().then(resolve, reject);
    },
    catch(reject) {
      return this.exec().catch(reject);
    },
  };

  return query;
}

function generateId() {
  return new Types.ObjectId().toString();
}

module.exports = {
  deepClone,
  matchesFilter,
  createQuery,
  generateId,
  toStringId,
};
