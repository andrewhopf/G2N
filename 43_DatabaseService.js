/**
 * @fileoverview Database service
 * @description Manages database selection and schema operations
 */

/**
 * Database Service
 * @class DatabaseService
 */
class DatabaseService {
  /**
   * @param {NotionAdapter} notionAdapter - Notion adapter
   * @param {ConfigRepository} configRepo - Config repository
   * @param {MappingRepository} mappingRepo - Mapping repository
   * @param {Logger} logger - Logger instance
   */
  constructor(notionAdapter, configRepo, mappingRepo, logger) {
    /** @private */
    this._notion = notionAdapter;
    /** @private */
    this._config = configRepo;
    /** @private */
    this._mappings = mappingRepo;
    /** @private */
    this._logger = logger;
  }

  /**
   * List available databases
   * @returns {Array<{id: string, name: string, url: string}>}
   */
  listDatabases() {
    const apiKey = this._config.get('apiKey');
    if (!apiKey) {
      throw new ConfigError('API key not configured', 'apiKey');
    }

    return this._notion.searchDatabases(apiKey);
  }

  /**
   * Select a database
   * @param {string} databaseId - Database ID
   * @returns {Object} Selected database info
   */
  selectDatabase(databaseId) {
    const apiKey = this._config.get('apiKey');
    
    // Fetch database to verify and get name
    const database = this._notion.getDatabase(databaseId, apiKey);
    
    // Save selection
    this._config.set({
      databaseId: databaseId,
      databaseName: database.title
    });

    // Initialize mappings from schema
    this._initializeMappings(database);

    this._logger.info('Database selected', { 
      id: databaseId, 
      name: database.title 
    });

    return database;
  }

  /**
   * Get current database schema
   * @returns {Object|null} Database schema
   */
  getCurrentSchema() {
    const apiKey = this._config.get('apiKey');
    const databaseId = this._config.get('databaseId');
    
    if (!apiKey || !databaseId) {
      return null;
    }

    try {
      return this._notion.getDatabase(databaseId, apiKey);
    } catch (error) {
      this._logger.error('Failed to fetch schema', error);
      return null;
    }
  }

  /**
   * Get mappable properties from current database
   * @returns {Array} Mappable properties
   */
  getMappableProperties() {
    const schema = this.getCurrentSchema();
    if (!schema) return [];

    const autoManaged = [
      'formula', 'rollup', 'created_time', 'created_by',
      'last_edited_time', 'last_edited_by'
    ];

    return schema.properties.filter(prop => !autoManaged.includes(prop.type));
  }

  /**
   * Check if database is configured
   * @returns {boolean}
   */
  isConfigured() {
    const config = this._config.getAll();
    return !!(config.apiKey && config.databaseId);
  }

  /**
   * Get configuration status
   * @returns {Object}
   */
  getStatus() {
    const config = this._config.getAll();
    const mappings = this._mappings.getAll();
    const enabledCount = this._mappings.getEnabledCount();

    return {
      hasApiKey: !!config.apiKey,
      hasDatabaseId: !!config.databaseId,
      databaseName: config.databaseName || '',
      hasMappings: Object.keys(mappings).length > 0,
      enabledMappings: enabledCount,
      isReady: !!(config.apiKey && config.databaseId && enabledCount > 0)
    };
  }

  // In File 43_DatabaseService.js - DatabaseService class
_initializeMappings(database) {
  const existingMappings = this._mappings.getAll();
  const newMappings = {};
  
  database.properties.forEach(prop => {
    // Keep existing mapping if present, but force refresh property name and type
    if (existingMappings[prop.id]) {
      const existing = existingMappings[prop.id] || {};
      newMappings[prop.id] = {
        ...existing,
        // FORCE refresh these from current schema
        notionPropertyName: prop.name,
        type: prop.type,
        isTitle: prop.type === 'title',
        isRequired: prop.isRequired || prop.type === 'title',
        // Preserve other settings
        enabled: existing.enabled !== undefined ? existing.enabled : (prop.type === 'title'),
        emailField: existing.emailField || this._getDefaultEmailField(prop.type),
        transformation: existing.transformation || 'none',
        isStaticOption: existing.isStaticOption !== undefined ? 
          existing.isStaticOption : 
          ['select', 'status', 'checkbox', 'multi_select'].includes(prop.type)
      };
      return;
    }

    // Create default mapping for new property
    newMappings[prop.id] = this._createDefaultMapping(prop);
  });

  this._mappings.saveAll(newMappings);
  this._logger.debug('Mappings initialized/refreshed', { 
    count: Object.keys(newMappings).length,
    refreshed: Object.keys(existingMappings).filter(id => newMappings[id]).length
  });
}

// Add helper method for default email field
_getDefaultEmailField(propertyType) {
  const recommendations = {
    title: 'subject',
    rich_text: 'plainBody',
    email: 'fromEmail',
    url: 'gmailLinkUrl',
    date: 'date',
    number: 'attachmentCount',
    checkbox: 'hasAttachments',
    files: 'attachments'
  };
  return recommendations[propertyType] || 'subject';
}

  /**
   * Create default mapping for property
   * @private
   */
  _createDefaultMapping(property) {
    const recommendations = {
      title: 'subject',
      rich_text: 'plainBody',
      email: 'fromEmail',
      url: 'gmailLinkUrl',
      date: 'date',
      number: 'attachmentCount',
      checkbox: 'hasAttachments'
    };

    return {
      type: property.type,
      notionPropertyName: property.name,
      enabled: property.type === 'title', // Only enable title by default
      emailField: recommendations[property.type] || 'subject',
      transformation: 'none',
      isStaticOption: ['select', 'status', 'checkbox', 'multi_select'].includes(property.type),
      isRequired: property.isRequired || false
    };
  }
}