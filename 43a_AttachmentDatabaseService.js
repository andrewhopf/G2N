/**
 * @fileoverview Attachment database service
 * @description Manages attachment database selection and schema operations
 */

/**
 * Attachment Database Service
 * @class AttachmentDatabaseService
 */
class AttachmentDatabaseService {
  /**
   * @param {NotionAdapter} notionAdapter - Notion adapter
   * @param {ConfigRepository} configRepo - Config repository
   * @param {MappingRepository} mappingRepo - Attachment mapping repository
   * @param {Logger} logger - Logger instance
   */
  constructor(notionAdapter, configRepo, mappingRepo, logger) {
    this._notion = notionAdapter;
    this._config = configRepo;
    this._mappings = mappingRepo;
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
   * Select attachment database
   * @param {string} databaseId - Database ID
   * @returns {Object} Selected database info
   */
  selectDatabase(databaseId) {
    const apiKey = this._config.get('apiKey');
    const database = this._notion.getDatabase(databaseId, apiKey);

    this._config.set({
      attachmentDatabaseId: databaseId,
      attachmentDatabaseName: database.title
    });

    this._initializeMappings(database);

    this._logger.info('Attachment database selected', {
      id: databaseId,
      name: database.title
    });

    return database;
  }

  /**
   * Get current attachment database schema
   * @returns {Object|null} Database schema
   */
  getCurrentSchema() {
    const apiKey = this._config.get('apiKey');
    const databaseId = this._config.get('attachmentDatabaseId');

    if (!apiKey || !databaseId) {
      return null;
    }

    try {
      return this._notion.getDatabase(databaseId, apiKey);
    } catch (error) {
      this._logger.error('Failed to fetch attachment schema', error);
      return null;
    }
  }

  /**
   * Get mappable properties from attachment database
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
   * Get attachment configuration status
   * @returns {Object}
   */
  getStatus() {
    const config = this._config.getAll();
    const mappings = this._mappings.getAll();
    const enabledCount = this._mappings.getEnabledCount();

    return {
      hasApiKey: !!config.apiKey,
      hasDatabaseId: !!config.attachmentDatabaseId,
      databaseName: config.attachmentDatabaseName || '',
      hasMappings: Object.keys(mappings).length > 0,
      enabledMappings: enabledCount,
      isReady: !!(config.apiKey && config.attachmentDatabaseId && enabledCount > 0)
    };
  }

  /**
   * Initialize mappings from attachment schema
   * @private
   * @param {Object} database - Database schema
   */
  _initializeMappings(database) {
    const existingMappings = this._mappings.getAll();
    const newMappings = {};

    database.properties.forEach(prop => {
      if (existingMappings[prop.id]) {
        const existing = existingMappings[prop.id] || {};
        newMappings[prop.id] = {
          ...existing,
          notionPropertyName: prop.name,
          type: prop.type,
          isTitle: prop.type === 'title',
          isRequired: prop.isRequired || prop.type === 'title',
          enabled: existing.enabled !== undefined ? existing.enabled : (prop.type === 'title'),
          emailField: existing.emailField || this._getDefaultAttachmentField(prop.type),
          transformation: existing.transformation || 'none',
          isStaticOption: existing.isStaticOption !== undefined ?
            existing.isStaticOption :
            ['select', 'status', 'checkbox', 'multi_select'].includes(prop.type)
        };
        return;
      }

      newMappings[prop.id] = this._createDefaultMapping(prop);
    });

    this._mappings.saveAll(newMappings);
    this._logger.debug('Attachment mappings initialized/refreshed', {
      count: Object.keys(newMappings).length,
      refreshed: Object.keys(existingMappings).filter(id => newMappings[id]).length
    });
  }

  /**
   * Default field recommendations for attachments
   * @private
   */
  _getDefaultAttachmentField(propertyType) {
    const recommendations = {
      title: 'attachmentName',
      rich_text: 'attachmentName',
      email: 'fromEmail',
      url: 'gmailLinkUrl',
      date: 'date',
      number: 'attachmentSize',
      checkbox: 'hasAttachments',
      files: 'attachments'
    };
    return recommendations[propertyType] || 'attachmentName';
  }

  /**
   * Create default mapping for attachment property
   * @private
   */
  _createDefaultMapping(property) {
    const recommendations = {
      title: 'attachmentName',
      rich_text: 'attachmentName',
      email: 'fromEmail',
      url: 'gmailLinkUrl',
      date: 'date',
      number: 'attachmentSize',
      checkbox: 'hasAttachments'
    };

    return {
      type: property.type,
      notionPropertyName: property.name,
      enabled: property.type === 'title',
      emailField: recommendations[property.type] || 'attachmentName',
      transformation: 'none',
      isStaticOption: ['select', 'status', 'checkbox', 'multi_select'].includes(property.type),
      isRequired: property.isRequired || false
    };
  }
}
