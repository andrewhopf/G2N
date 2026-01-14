/**
 * @fileoverview Utility service with common functions
 * @description Reusable utility methods
 */

/**
 * Utility Service
 * @class Utils
 */
class Utils {
  /**
   * Escape HTML entities
   * @param {string} text - Text to escape
   * @returns {string}
   */
  static escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Truncate text with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} [maxLength=100] - Maximum length
   * @param {string} [ellipsis='...'] - Ellipsis string
   * @returns {string}
   */
  static truncate(text, maxLength = 100, ellipsis = '...') {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength - ellipsis.length) + ellipsis;
  }

  /**
   * Extract email address from string
   * @param {string} text - Text containing email
   * @returns {string|null}
   */
  static extractEmail(text) {
    if (!text || typeof text !== 'string') return null;
    
    const match = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
    return match ? match[0] : null;
  }

  /**
   * Parse date from various formats
   * @param {*} input - Date input
   * @returns {Date|null}
   */
  static parseDate(input) {
    if (!input) return null;
    
    if (input instanceof Date) {
      return isNaN(input.getTime()) ? null : input;
    }
    
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Format date to ISO string
   * @param {Date|*} date - Date to format
   * @returns {string}
   */
  static formatDateISO(date) {
    const parsed = this.parseDate(date);
    return parsed ? parsed.toISOString() : '';
  }

  /**
   * Deep clone an object
   * @param {Object} obj - Object to clone
   * @returns {Object}
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Merge objects deeply
   * @param {Object} target - Target object
   * @param {...Object} sources - Source objects
   * @returns {Object}
   */
  static deepMerge(target, ...sources) {
    if (!sources.length) return target;
    
    const source = sources.shift();
    
    if (this._isObject(target) && this._isObject(source)) {
      for (const key in source) {
        if (this._isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    
    return this.deepMerge(target, ...sources);
  }

  /**
   * Check if value is empty
   * @param {*} value - Value to check
   * @returns {boolean}
   */
  static isEmpty(value) {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Generate unique ID
   * @returns {string}
   */
  static generateId() {
    return Utilities.getUuid();
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   */
  static sleep(ms) {
    Utilities.sleep(ms);
  }

  /**
   * Retry function with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {number} [maxAttempts=3] - Maximum attempts
   * @param {number} [baseDelay=1000] - Base delay in ms
   * @returns {*} Function result
   */
  static retry(fn, maxAttempts = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Get nested property safely
   * @param {Object} obj - Object to get from
   * @param {string} path - Dot-notation path
   * @param {*} [defaultValue=null] - Default value
   * @returns {*}
   */
  static get(obj, path, defaultValue = null) {
    if (!obj || typeof obj !== 'object') return defaultValue;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current == null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current === undefined ? defaultValue : current;
  }

  /**
   * Convert HTML to plain text
   * @param {string} html - HTML string
   * @returns {string}
   */
  static htmlToText(html) {
    if (!html || typeof html !== 'string') return '';
    
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if value is a plain object
   * @private
   */
  static _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}