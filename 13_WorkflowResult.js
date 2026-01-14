/**
 * @fileoverview Workflow result value object
 * @description Represents the outcome of workflow execution
 */

/**
 * Workflow Result Value Object
 * @class WorkflowResult
 */
class WorkflowResult {
  /**
   * @param {Object} options - Result options
   */
  constructor(options = {}) {
    /** @readonly */
    this.success = Boolean(options.success);
    /** @readonly */
    this.message = options.message || '';
    /** @readonly */
    this.data = options.data || null;
    /** @readonly */
    this.errors = Array.isArray(options.errors) ? options.errors : [];
    /** @readonly */
    this.warnings = Array.isArray(options.warnings) ? options.warnings : [];
    /** @readonly */
    this.duration = options.duration || 0;
    /** @readonly */
    this.timestamp = new Date().toISOString();
    /** @readonly */
    this.steps = Array.isArray(options.steps) ? options.steps : [];

    Object.freeze(this);
  }

  /**
   * Check if result has errors
   * @returns {boolean}
   */
  hasErrors() {
    return this.errors.length > 0;
  }

  /**
   * Check if result has warnings
   * @returns {boolean}
   */
  hasWarnings() {
    return this.warnings.length > 0;
  }

  /**
   * Get page URL from data
   * @returns {string|null}
   */
  getPageUrl() {
    return this.data?.pageUrl || this.data?.url || null;
  }

  /**
   * Get page ID from data
   * @returns {string|null}
   */
  getPageId() {
    return this.data?.pageId || this.data?.id || null;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      success: this.success,
      message: this.message,
      data: this.data,
      errors: this.errors,
      warnings: this.warnings,
      duration: this.duration,
      timestamp: this.timestamp,
      steps: this.steps
    };
  }

  /**
   * Create success result
   * @static
   * @param {string} message - Success message
   * @param {Object} data - Result data
   * @returns {WorkflowResult}
   */
  static success(message, data = null) {
    return new WorkflowResult({
      success: true,
      message,
      data
    });
  }

  /**
   * Create failure result
   * @static
   * @param {string} message - Error message
   * @param {Array} errors - Error list
   * @returns {WorkflowResult}
   */
  static failure(message, errors = []) {
    return new WorkflowResult({
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors]
    });
  }

  /**
   * Create from Error object
   * @static
   * @param {Error} error - Error object
   * @returns {WorkflowResult}
   */
  static fromError(error) {
    return new WorkflowResult({
      success: false,
      message: error.message,
      errors: [{
        name: error.name,
        message: error.message,
        code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR'
      }]
    });
  }
}

/**
 * Step Result for tracking workflow steps
 * @class StepResult
 */
class StepResult {
  constructor(name, success, duration = 0, data = null) {
    this.name = name;
    this.success = success;
    this.duration = duration;
    this.data = data;
    this.timestamp = new Date().toISOString();
    Object.freeze(this);
  }
}