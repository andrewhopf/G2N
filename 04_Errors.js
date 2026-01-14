/**
 * @fileoverview Error class hierarchy
 * @description Structured errors for better error handling
 */

/**
 * Base application error
 * @class AppError
 * @extends Error
 */
class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} [code='APP_ERROR'] - Error code
   * @param {Object} [details={}] - Additional details
   */
  constructor(message, code = 'APP_ERROR', details = {}) {
    super(message);
    
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Configuration error
 * @class ConfigError
 * @extends AppError
 */
class ConfigError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {string} [field] - Missing/invalid field
   */
  constructor(message, field = null) {
    super(message, 'CONFIG_ERROR', { field });
    this.name = 'ConfigError';
  }
}

/**
 * Validation error
 * @class ValidationError
 * @extends AppError
 */
class ValidationError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {string} [field] - Invalid field
   * @param {*} [value] - Invalid value
   */
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', { field, value });
    this.name = 'ValidationError';
  }
}

/**
 * API error
 * @class APIError
 * @extends AppError
 */
class APIError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {number} [statusCode] - HTTP status code
   * @param {string} [endpoint] - API endpoint
   */
  constructor(message, statusCode = null, endpoint = null) {
    super(message, 'API_ERROR', { statusCode, endpoint });
    this.name = 'APIError';
    this.statusCode = statusCode;
  }

  /**
   * Check if error is retryable
   * @returns {boolean}
   */
  isRetryable() {
    return this.statusCode === 429 || 
           this.statusCode >= 500 || 
           this.statusCode === 408;
  }
}

/**
 * Notion API error
 * @class NotionError
 * @extends APIError
 */
class NotionError extends APIError {
  /**
   * @param {string} message - Error message
   * @param {number} [statusCode] - HTTP status code
   * @param {string} [notionCode] - Notion error code
   */
  constructor(message, statusCode = null, notionCode = null) {
    super(message, statusCode, 'notion');
    this.name = 'NotionError';
    this.notionCode = notionCode;
  }
}

/**
 * Gmail API error
 * @class GmailError
 * @extends APIError
 */
class GmailError extends APIError {
  /**
   * @param {string} message - Error message
   * @param {string} [operation] - Gmail operation
   */
  constructor(message, operation = null) {
    super(message, null, 'gmail');
    this.name = 'GmailError';
    this.details.operation = operation;
  }
}

/**
 * Email processing error
 * @class EmailError
 * @extends AppError
 */
class EmailError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {string} [emailId] - Email ID
   * @param {string} [step] - Processing step
   */
  constructor(message, emailId = null, step = null) {
    super(message, 'EMAIL_ERROR', { emailId, step });
    this.name = 'EmailError';
  }
}

/**
 * Mapping error
 * @class MappingError
 * @extends AppError
 */
class MappingError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {string} [propertyName] - Property name
   * @param {string} [propertyType] - Property type
   */
  constructor(message, propertyName = null, propertyType = null) {
    super(message, 'MAPPING_ERROR', { propertyName, propertyType });
    this.name = 'MappingError';
  }
}

/**
 * Error handler service
 * @class ErrorHandler
 */
class ErrorHandler {
  /**
   * @param {Logger} logger - Logger instance
   */
  constructor(logger) {
    /** @private */
    this._logger = logger;
  }

  /**
   * Handle an error
   * @param {Error} error - Error to handle
   * @param {Object} [context={}] - Additional context
   * @returns {Object} Formatted error response
   */
  handle(error, context = {}) {
    const errorInfo = this._extractErrorInfo(error);
    
    // Log based on severity
    if (error instanceof ValidationError) {
      this._logger.warn(errorInfo.message, { ...errorInfo, ...context });
    } else {
      this._logger.error(errorInfo.message, { ...errorInfo, ...context });
    }

    return this._formatResponse(error, context);
  }

  /**
   * Get user-friendly message
   * @param {Error} error - Error object
   * @returns {string}
   */
  getUserMessage(error) {
    const messages = {
      CONFIG_ERROR: 'Configuration issue. Please check your settings.',
      VALIDATION_ERROR: 'Invalid input. Please check and try again.',
      API_ERROR: 'Service unavailable. Please try again later.',
      NOTION_ERROR: 'Could not connect to Notion. Check your API key.',
      GMAIL_ERROR: 'Could not access Gmail. Check permissions.',
      EMAIL_ERROR: 'Could not process email.',
      MAPPING_ERROR: 'Field mapping issue. Review your configuration.'
    };

    if (error instanceof AppError) {
      return messages[error.code] || error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean}
   */
  isRetryable(error) {
    if (error instanceof APIError) {
      return error.isRetryable();
    }
    return false;
  }

  /**
   * Extract error information
   * @private
   */
  _extractErrorInfo(error) {
    if (error instanceof AppError) {
      return error.toJSON();
    }
    
    return {
      name: error.name || 'Error',
      message: error.message,
      code: 'UNKNOWN_ERROR',
      stack: error.stack
    };
  }

  /**
   * Format error response
   * @private
   */
  _formatResponse(error, context) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
        userMessage: this.getUserMessage(error)
      },
      context,
      timestamp: new Date().toISOString()
    };
  }
}