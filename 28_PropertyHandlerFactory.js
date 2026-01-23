/**
 * @fileoverview Property handler factory
 * @description Creates appropriate handler for each property type
 */

/**
 * Property Handler Factory
 * @class PropertyHandlerFactory
 */
class PropertyHandlerFactory {
  /**
   * @param {GmailFieldRegistry} fieldRegistry
   * @param {TransformerRegistry} transformerRegistry
   */
  constructor(fieldRegistry, transformerRegistry) {
    /** @private */
    this._fieldRegistry = fieldRegistry;
    /** @private */
    this._transformerRegistry = transformerRegistry;
    /** @private */
    this._handlers = new Map();

    this._registerHandlers();
  }

/**
 * Register all handlers
 * @private
 */
_registerHandlers() {
  // Text-based types
  ['title', 'rich_text', 'email', 'url', 'number', 'phone_number'].forEach(type => {
    this._handlers.set(type, new TextPropertyHandler(
      type,
      this._fieldRegistry,
      this._transformerRegistry
    ));
  });

  // Select types
  this._handlers.set('select', new SelectPropertyHandler('select'));
  this._handlers.set('status', new SelectPropertyHandler('status'));

  // Other types
  this._handlers.set('checkbox', new CheckboxPropertyHandler());
  this._handlers.set('date', new DatePropertyHandler());
  this._handlers.set('multi_select', new MultiSelectPropertyHandler());

  // 🔧 FIX: Lazy registration for handlers that need container
  // Don't register them here - register in getHandler() on-demand
}

/**
 * Get container instance safely without assuming a "global" object
 * @private
 */
_getContainer() {
  if (typeof container !== 'undefined') return container;
  if (typeof getApp === 'function') {
    try {
      const app = getApp();
      if (app && typeof app.getContainer === 'function') return app.getContainer();
    } catch (e) {
      // fall through
    }
  }
  return null;
}

/**
 * Get handler for property type
 * @param {string} type - Property type
 * @returns {BasePropertyHandler|null}
 */
getHandler(type) {
  // Check for auto-managed types
  const autoManaged = [
    'formula', 'rollup', 'created_time', 'created_by',
    'last_edited_time', 'last_edited_by'
  ];
  if (autoManaged.includes(type)) {
    return null;
  }

  // 🔧 FIX: Lazy registration for files handler
  if (type === 'files' && !this._handlers.has('files')) {
    try {
      const container = this._getContainer();
      if (container && container.has('attachmentService')) {
        const attachmentService = container.resolve('attachmentService');
        this._handlers.set('files', new FilesPropertyHandler(attachmentService));
        console.log('✅ FilesPropertyHandler lazily registered');
      }
    } catch (e) {
      console.warn('Failed to lazily register FilesPropertyHandler:', e.message);
      return null;
    }
  }

// 🔧 FIX: Lazy registration for people handler
if (type === 'people' && !this._handlers.has('people')) {
  try {
    const container = this._getContainer();
    if (container) {
      const notionAdapter = container.resolve('notionAdapter');
      const configRepo = container.resolve('configRepo');
      const logger = container.resolve('logger');
      this._handlers.set('people', new PeoplePropertyHandler(notionAdapter, configRepo, logger));
      console.log('✅ PeoplePropertyHandler lazily registered');
    }
  } catch (e) {
    console.warn('Failed to lazily register PeoplePropertyHandler:', e.message);
    return null;
  }
}

  // 🔧 FIX: Lazy registration for relation handler
  if (type === 'relation' && !this._handlers.has('relation')) {
    try {
      const container = this._getContainer();
      if (container) {
        const notionAdapter = container.resolve('notionAdapter');
        const configRepo = container.resolve('configRepo');
        const logger = container.resolve('logger');
        this._handlers.set('relation', new RelationPropertyHandler(notionAdapter, configRepo, logger));
        console.log('✅ RelationPropertyHandler lazily registered');
      }
    } catch (e) {
      console.warn('Failed to lazily register RelationPropertyHandler:', e.message);
      return null;
    }
  }

  return this._handlers.get(type) || null;
}

  /**
   * Check if type has a handler
   * @param {string} type - Property type
   * @returns {boolean}
   */
  hasHandler(type) {
    return this._handlers.has(type);
  }

  /**
   * Get all supported types
   * @returns {Array<string>}
   */
  getSupportedTypes() {
    return Array.from(this._handlers.keys());
  }
}
