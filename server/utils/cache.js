class MemoryCache {
  constructor(defaultTtl = 60_000) {
    this.defaultTtl = defaultTtl;
    this.store = new Map();
  }

  clone(value) {
    if (value === null || typeof value !== 'object') {
      return value;
    }
    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(value);
      }
    } catch (err) {
      // Ignore structuredClone errors and fallback to JSON cloning.
    }
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      return value;
    }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return this.clone(entry.value);
  }

  set(key, value, ttl) {
    const ttlValue = typeof ttl === 'number' && ttl > 0 ? ttl : this.defaultTtl;
    const expiresAt = ttlValue ? Date.now() + ttlValue : null;
    this.store.set(key, { value: this.clone(value), expiresAt });
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  invalidatePrefix(prefix) {
    if (!prefix) return;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

module.exports = new MemoryCache();
module.exports.MemoryCache = MemoryCache;
