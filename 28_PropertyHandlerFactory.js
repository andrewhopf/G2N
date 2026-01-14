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
    
    // ✅ People handler - needs both notionAdapter and configRepo
    try {
      const notionAdapter = container.resolve('notionAdapter');
      const configRepo = container.resolve('configRepo');
      this._handlers.set('people', new PeoplePropertyHandler(notionAdapter, configRepo));
    } catch (e) {
      console.warn('PeoplePropertyHandler not registered:', e.message);
    }
    
    // ✅ Relation handler
    try {
    const notionAdapter = container.resolve('notionAdapter');
    this._handlers.set('relation', new RelationPropertyHandler(notionAdapter));
    } catch (e) {
    console.warn('RelationPropertyHandler not registered:', e.message);
    }

    // ✅ Files handler
    try {
    const attachmentService = container.resolve('attachmentService');
    this._handlers.set('files', new FilesPropertyHandler(attachmentService));
    } catch (e) {
    console.warn('FilesPropertyHandler not registered:', e.message);
    }
  }

  /**
   * Get handler for property type
   * @param {string} type - Property type
   * @returns {BasePropertyHandler|null}
   */
  getHandler(type) {
    // Check for auto-managed types (return null)
    const autoManaged = ['formula', 'rollup', 'created_time', 'created_by', 
                         'last_edited_time', 'last_edited_by'];
    if (autoManaged.includes(type)) {
      return null;
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
