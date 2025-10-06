const users = new Map();
const verified = new Map();

const clone = (value) => {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (Array.isArray(value)) {
    return value.map((item) => clone(item));
  }
  if (value && typeof value === 'object') {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = clone(entry);
    }
    return output;
  }
  return value;
};

const resetStores = () => {
  users.clear();
  verified.clear();
};

module.exports = {
  users,
  verified,
  clone,
  resetStores,
};
