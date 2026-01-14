/**
 * @fileoverview Logging service with levels and formatting
 * @description Centralized logging for debugging and monitoring
 */

/**
 * Log levels enum
 * @enum {number}
 */
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

/**
 * Logger service
 * @class Logger
 */
class Logger {
  /**
   * @param {Object} options - Logger options
   * @param {string} [options.level='info'] - Minimum log level
   * @param {string} [options.prefix='G2N'] - Log prefix
   * @param {boolean} [options.includeTimestamp=true] - Include timestamps
   */
  constructor(options = {}) {
    /** @private */
    this._level = this._parseLevel(options.level || 'info');
    /** @private */
    this._prefix = options.prefix || 'G2N';
    /** @private */
    this._includeTimestamp = options.includeTimestamp !== false;
    /** @private */
    this._timers = new Map();
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {*} [data] - Additional data
   */
  debug(message, data = null) {
    this._log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {*} [data] - Additional data
   */
  info(message, data = null) {
    this._log(LogLevel.INFO, 'INFO', message, data);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {*} [data] - Additional data
   */
  warn(message, data = null) {
    this._log(LogLevel.WARN, 'WARN', message, data);
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Error|*} [error] - Error object or additional data
   */
  error(message, error = null) {
    this._log(LogLevel.ERROR, 'ERROR', message, error);
    
    if (error instanceof Error && this._level <= LogLevel.DEBUG) {
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * Start a timer
   * @param {string} label - Timer label
   * @returns {Function} End function that returns duration
   */
  startTimer(label) {
    const startTime = Date.now();
    this._timers.set(label, startTime);
    
    this.debug(`⏱️ Timer started: ${label}`);

    return (data = null) => {
      const duration = Date.now() - startTime;
      this._timers.delete(label);
      this.debug(`⏱️ Timer ${label}: ${duration}ms`, data);
      return duration;
    };
  }

  /**
   * Log a section header
   * @param {string} title - Section title
   */
  section(title) {
    const separator = '='.repeat(50);
    console.log(`\n[${this._prefix}] ${separator}`);
    console.log(`[${this._prefix}] ${title.toUpperCase()}`);
    console.log(`[${this._prefix}] ${separator}`);
  }

  /**
   * Set log level
   * @param {string} level - Log level name
   */
  setLevel(level) {
    this._level = this._parseLevel(level);
  }

  /**
   * Get current log level
   * @returns {string}
   */
  getLevel() {
    const levels = ['debug', 'info', 'warn', 'error', 'none'];
    return levels[this._level];
  }

  /**
   * Internal log method
   * @private
   */
  _log(level, levelName, message, data) {
    if (level < this._level) return;

    const timestamp = this._includeTimestamp 
      ? new Date().toISOString() + ' ' 
      : '';
    
    const prefix = `[${this._prefix} ${levelName}]`;
    const fullMessage = `${prefix} ${timestamp}${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(fullMessage);
        if (data) console.error(data);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage);
        if (data) console.warn(data);
        break;
      default:
        console.log(fullMessage);
        if (data !== null && data !== undefined) {
          console.log(data);
        }
    }
  }

  /**
   * Parse level string to enum value
   * @private
   */
  _parseLevel(level) {
    const levels = {
      'debug': LogLevel.DEBUG,
      'info': LogLevel.INFO,
      'warn': LogLevel.WARN,
      'error': LogLevel.ERROR,
      'none': LogLevel.NONE
    };
    return levels[level.toLowerCase()] ?? LogLevel.INFO;
  }
}