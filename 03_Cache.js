/**
 * @fileoverview In-memory caching with TTL support
 * @description Caches API responses and computed values
 */

/**
 * Memory Cache with TTL
 * @class MemoryCache
 */
class MemoryCache {
  /**
   * @param {Object} options - Cache options
   * @param {number} [options.defaultTTL=300] - Default TTL in seconds
   * @param {number} [options.maxSize=500] - Maximum cache entries
   */
  constructor(options = {}) {
    /** @private */
    this._cache = new Map();
    /** @private */
    this._defaultTTL = (options.defaultTTL || 300) * 1000; // Convert to ms
    /** @private */
    this._maxSize = options.maxSize || 500;
    /** @private */
    this._stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl] - TTL in seconds (optional)
   * @returns {boolean} Success
   */
  set(key, value, ttl = null) {
    // Evict if at capacity
    if (this._cache.size >= this._maxSize && !this._cache.has(key)) {
      this._evictOldest();
    }

    const expiresAt = Date.now() + (ttl ? ttl * 1000 : this._defaultTTL);
    
    this._cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
    
    this._stats.sets++;
    return true;
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*|null} Cached value or null
   */
  get(key) {
    const entry = this._cache.get(key);

    if (!entry) {
      this._stats.misses++;
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this._cache.delete(key);
      this._stats.misses++;
      return null;
    }

    this._stats.hits++;
    return entry.value;
  }

  /**
   * Check if key exists and is valid
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this._cache.get(key);
    
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this._cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a cache entry
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    return this._cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this._cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object}
   */
  getStats() {
    const hitRate = this._stats.hits + this._stats.misses > 0
      ? (this._stats.hits / (this._stats.hits + this._stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this._stats,
      size: this._cache.size,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Get or set with factory function
   * @param {string} key - Cache key
   * @param {Function} factory - Function to create value if not cached
   * @param {number} [ttl] - TTL in seconds
   * @returns {*} Cached or newly created value
   */
  getOrSet(key, factory, ttl = null) {
    const cached = this.get(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Evict oldest entry
   * @private
   */
  _evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this._cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this._cache.delete(oldestKey);
      this._stats.evictions++;
    }
  }
}

/**
 * Google Apps Script Cache Wrapper
 * Uses CacheService for persistence across executions
 * @class ScriptCache
 */
class ScriptCache {
  /**
   * @param {Object} options - Cache options
   * @param {string} [options.prefix='g2n_'] - Key prefix
   * @param {number} [options.defaultTTL=300] - Default TTL in seconds
   */
  constructor(options = {}) {
    /** @private */
    this._prefix = options.prefix || 'g2n_';
    /** @private */
    this._defaultTTL = options.defaultTTL || 300;
    /** @private */
    this._cache = null;
  }

  /**
   * Get cache service lazily
   * @private
   */
  _getCache() {
    if (!this._cache) {
      this._cache = CacheService.getScriptCache();
    }
    return this._cache;
  }

  /**
   * Set a value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl] - TTL in seconds
   */
  set(key, value, ttl = null) {
    const prefixedKey = this._prefix + key;
    const serialized = JSON.stringify({
      value,
      timestamp: Date.now()
    });
    
    this._getCache().put(prefixedKey, serialized, ttl || this._defaultTTL);
  }

  /**
   * Get a value
   * @param {string} key - Cache key
   * @returns {*|null}
   */
  get(key) {
    const prefixedKey = this._prefix + key;
    const cached = this._getCache().get(prefixedKey);
    
    if (!cached) return null;
    
    try {
      const parsed = JSON.parse(cached);
      return parsed.value;
    } catch {
      return null;
    }
  }

  /**
   * Delete a value
   * @param {string} key - Cache key
   */
  delete(key) {
    const prefixedKey = this._prefix + key;
    this._getCache().remove(prefixedKey);
  }
}