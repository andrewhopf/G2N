/**
 * @fileoverview Notion service facade
 * @description High-level Notion operations
 */

/**
 * Notion Service
 * @class NotionService
 */
class NotionService {
  /**
   * @param {NotionAdapter} notionAdapter - Notion adapter
   * @param {ConfigRepository} configRepo - Config repository
   * @param {Logger} logger - Logger instance
   */
  constructor(notionAdapter, configRepo, logger) {
    /** @private */
    this._notion = notionAdapter;
    /** @private */
    this._config = configRepo;
    /** @private */
    this._logger = logger;
  }

  /**
   * Expose the adapter for direct access (Required for Self-Repair/Validation)
   * @returns {NotionAdapter}
   */
  get adapter() {
    return this._notion;
  }

  /**
   * Get API key from config
   * @private
   */
  _getApiKey() {
    const config = this._config.getAll();
    // Support both 'apiKey' and 'notionApiKey' naming
    const key = config.notionApiKey || config.apiKey;
    if (!key) {
      throw new Error('Notion API key not configured. Please check settings.');
    }
    return key;
  }

  /**
   * Get database ID from config
   * @private
   */
  _getDatabaseId() {
    const config = this._config.getAll();
    if (!config.databaseId) {
      throw new Error('Database not selected. Please check settings.');
    }
    return config.databaseId;
  }

  /**
   * List available databases
   * @returns {Array} Databases
   */
  listDatabases() {
    return this._notion.searchDatabases(this._getApiKey());
  }


  /**
   * Create page in current database
   * @param {Object} properties - Page properties
   * @param {Array} children - Page content
   * @returns {Object} Created page
   */
  createPage(properties, children = []) {
    const apiKey = this._getApiKey();
    const databaseId = this._getDatabaseId();

    this._logger.info('Creating Notion page', { 
      database: databaseId.substring(0, 8),
      propertiesCount: Object.keys(properties).length 
    });

    return this._notion.createPage(databaseId, properties, children, apiKey);
  }

  /**
   * Test connection
   * @returns {Object} Test result
   */
  testConnection() {
    try {
      return this._notion.testConnection(this._getApiKey());
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

/**
 * Query pages in database
 * @param {Object} filter - Optional filter {property: string, url: {equals: string}}
 * @returns {Array} Pages with id and url
 */
queryPages(filter = null) {
  try {
    const apiKey = this._getApiKey();
    const databaseId = this._getDatabaseId();
    
    this._logger.debug('queryPages called', {
      databaseId: databaseId.substring(0, 8),
      hasFilter: !!filter
    });

    // Start with minimal payload
    const queryPayload = { page_size: 100 };

    // Only add filter if it has the required structure
    if (filter && 
        filter.property && 
        filter.url && 
        filter.url.equals) {
      
      queryPayload.filter = {
        property: filter.property,
        url: { equals: filter.url.equals }
      };
      
      this._logger.info('Filter added to query', {
        property: filter.property,
        urlEquals: filter.url.equals
      });
    }

    // Execute query
    const response = this._notion.queryDatabase(
      databaseId, 
      queryPayload, 
      apiKey
    );
    
    if (!response || !Array.isArray(response)) {
      this._logger.warn('Invalid query response');
      return [];
    }

    // Map results
    const pages = response.map(page => ({
      id: page.id,
      url: page.url,
      title: this._extractPageTitle(page),
      properties: page.properties
    }));

    this._logger.info('Query results', {
      count: pages.length,
      hasFilter: !!queryPayload.filter
    });

    return pages;

  } catch (error) {
    this._logger.error('queryPages failed', error.message);
    return [];
  }
}

/**
 * Extract title from page properties
 * @private
 */
_extractPageTitle(page) {
  try {
    if (!page.properties) return 'Untitled';
    
    // Find title property
    const titleProp = Object.values(page.properties).find(p => p.type === 'title');
    
    if (titleProp && titleProp.title && Array.isArray(titleProp.title) && titleProp.title.length > 0) {
      const text = titleProp.title.map(t => t.plain_text || '').join('');
      return text || 'Untitled';
    }
    
    return 'Untitled';
  } catch (e) {
    this._logger.debug('Error extracting title', e.message);
    return 'Untitled';
  }
}

/**
 * Get a simplified database schema (name + type) for the current database.
 *
 * @returns {{properties: Array<{name: string, type: string}>}} Schema summary
 */
getDatabaseSchema() {
  try {
    const apiKey = this._getApiKey();
    const databaseId = this._getDatabaseId();
    const db = this._notion.getDatabase(databaseId, apiKey);

    const propsArray = Array.isArray(db.properties) ? db.properties : [];

    const properties = propsArray.map(prop => ({
      name: prop.name,
      type: prop.type
    }));

    return { properties };
  } catch (error) {
    this._logger.error('Failed to get schema', error.message || error);
    return { properties: [] };
  }
}


  /**
   * Get workspace users
   * @returns {Array} Users
   */
  getUsers() {
    return this._notion.getUsers(this._getApiKey());
  }
}