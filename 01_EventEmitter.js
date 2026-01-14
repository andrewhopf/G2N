/**
 * @fileoverview Event-driven communication system
 * @description Pub/sub pattern for loose coupling between services
 */

/**
 * Event Emitter for application-wide events
 * @class EventEmitter
 */
class EventEmitter {
  constructor() {
    /** @private */
    this._events = new Map();
    /** @private */
    this._onceEvents = new Map();
  }

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    
    this._events.get(event).push(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Register a one-time event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    
    return this.on(event, wrapper);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    if (!this._events.has(event)) return;

    const callbacks = this._events.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index > -1) {
      callbacks.splice(index, 1);
    }

    if (callbacks.length === 0) {
      this._events.delete(event);
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data = null) {
    if (!this._events.has(event)) return;

    const callbacks = this._events.get(event).slice(); // Copy to prevent mutation issues
    
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
      }
    });
  }

  /**
   * Remove all listeners for an event
   * @param {string} [event] - Event name (optional, clears all if not provided)
   */
  removeAllListeners(event) {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
  }

  /**
   * Get count of listeners for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    return this._events.has(event) ? this._events.get(event).length : 0;
  }
}

/**
 * Application Events - Predefined event names
 * @class AppEvents
 */
class AppEvents {}

// System events
AppEvents.APP_INITIALIZED = 'app:initialized';
AppEvents.APP_ERROR = 'app:error';

// Configuration events
AppEvents.CONFIG_CHANGED = 'config:changed';
AppEvents.CONFIG_RESET = 'config:reset';

// Email events
AppEvents.EMAIL_EXTRACTING = 'email:extracting';
AppEvents.EMAIL_EXTRACTED = 'email:extracted';
AppEvents.EMAIL_EXTRACTION_FAILED = 'email:extraction_failed';

// Notion events
AppEvents.PAGE_CREATING = 'notion:page:creating';
AppEvents.PAGE_CREATED = 'notion:page:created';
AppEvents.PAGE_CREATION_FAILED = 'notion:page:creation_failed';
AppEvents.DATABASE_SELECTED = 'notion:database:selected';

// Workflow events
AppEvents.WORKFLOW_STARTED = 'workflow:started';
AppEvents.WORKFLOW_STEP_COMPLETED = 'workflow:step:completed';
AppEvents.WORKFLOW_COMPLETED = 'workflow:completed';
AppEvents.WORKFLOW_FAILED = 'workflow:failed';

// UI events
AppEvents.CARD_RENDERED = 'ui:card:rendered';
AppEvents.ACTION_CLICKED = 'ui:action:clicked';