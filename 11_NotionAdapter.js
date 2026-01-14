/**
 * @fileoverview Notion API adapter
 * @description Wraps Notion API for database and page operations
 * 
 * @class NotionAdapter
 */
class NotionAdapter {
    /**
     * @constructor
     * @param {Logger} logger - Logger instance
     * @param {MemoryCache} cache - Cache instance
     */
    constructor(logger, cache) {
        /** @private */
        this._logger = logger;
        /** @private */
        this._cache = cache;
        /** @private */
        this._baseUrl = 'https://api.notion.com/v1';
        /** @private */
        this._version = '2022-06-28';
    }

    /**
     * Make authenticated API request
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {Object} data - Request body
     * @param {string} apiKey - Notion API key
     * @returns {Object} Response data
     * @throws {NotionError} If API request fails
     */
    request(endpoint, method, data, apiKey) {
        if (!apiKey) {
            throw new NotionError('API key is required', null, 'missing_api_key');
        }
        
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': this._version,
                'Content-Type': 'application/json'
            },
            muteHttpExceptions: true
        };
        
        if (data && (method === 'POST' || method === 'PATCH')) {
            options.payload = JSON.stringify(data);
        }
        
        try {
            const response = UrlFetchApp.fetch(`${this._baseUrl}${endpoint}`, options);
            const code = response.getResponseCode();
            const content = response.getContentText();
            
            if (code >= 200 && code < 300) {
                return JSON.parse(content);
            }
            
            // Handle error response
            const errorData = JSON.parse(content);
            throw new NotionError(
                errorData.message || 'Unknown Notion API error',
                code,
                errorData.code
            );
        } catch (error) {
            if (error instanceof NotionError) throw error;
            throw new NotionError(`API request failed: ${error.message}`, null);
        }
    }

    /**
     * Search for databases
     * @param {string} apiKey - API key
     * @returns {Array} List of databases
     */
    searchDatabases(apiKey) {
        const cacheKey = `databases_${apiKey.substring(0, 10)}`;
        const cached = this._cache.get(cacheKey);
        if (cached) return cached;
        
        const response = this.request('/search', 'POST', {
            filter: { property: 'object', value: 'database' },
            page_size: 100
        }, apiKey);
        
        const databases = (response.results || []).map(db => ({
            id: db.id,
            name: this._extractTitle(db),
            url: db.url,
            icon: db.icon,
            properties: db.properties || {}
        }));
        
        this._cache.set(cacheKey, databases, 60); // Cache for 1 minute
        return databases;
    }

    /**
     * Get database schema
     * @param {string} databaseId - Database ID
     * @param {string} apiKey - API key
     * @returns {Object} Database schema
     */
    getDatabase(databaseId, apiKey) {
        const cacheKey = `schema_${databaseId}`;
        const cached = this._cache.get(cacheKey);
        if (cached) return cached;
        
        const cleanId = this._normalizeId(databaseId);
        const response = this.request(`/databases/${cleanId}`, 'GET', null, apiKey);
        
        const schema = {
            id: response.id,
            title: this._extractTitle(response),
            url: response.url,
            properties: this._parseProperties(response.properties || {})
        };
        
        this._cache.set(cacheKey, schema, 120); // Cache for 2 minutes
        return schema;
    }

    /**
     * Create a page in database
     * @param {string} databaseId - Database ID
     * @param {Object} properties - Page properties
     * @param {Array} children - Page content blocks
     * @param {string} apiKey - API key
     * @returns {Object} Created page
     */
    createPage(databaseId, properties, children, apiKey) {
        const cleanId = this._normalizeId(databaseId);
        const payload = {
            parent: { database_id: cleanId },
            properties: properties
        };
        
        if (children && children.length > 0) {
            payload.children = children;
        }
        
        this._logger.debug('Creating page with properties', Object.keys(properties));
        const response = this.request('/pages', 'POST', payload, apiKey);
        
        return {
            id: response.id,
            url: response.url,
            createdTime: response.created_time
        };
    }

 /**
 * Query a Notion database with filters
 * @param {string} databaseId - Notion database ID (can contain hyphens)
 * @param {Object} [queryPayload={}] - Query parameters including filters, sorts, etc.
 * @param {number} [queryPayload.page_size] - Maximum number of results
 * @param {Object} [queryPayload.filter] - Notion filter object
 * @param {Array} [queryPayload.sorts] - Sort definitions
 * @param {string} [queryPayload.start_cursor] - Pagination cursor
 * @param {string} apiKey - Notion API key
 * @returns {Array<Object>} Query results (page objects)
 * @throws {NotionError|Error} If the request fails
 */
queryDatabase(databaseId, queryPayload = {}, apiKey) {
  try {
    this._logger.info('queryDatabase received', {
      hasFilter: !!queryPayload.filter,
      filterKeys: queryPayload.filter ? Object.keys(queryPayload.filter) : [],
      filterJson: queryPayload.filter ? JSON.stringify(queryPayload.filter) : '{}'
    });

    const cleanId = this._normalizeId(databaseId);

    // Build request body safely (copy from queryPayload)
    const requestBody = {
      page_size: queryPayload.page_size || 10
    };

    if (queryPayload.filter) {
      // Deep copy filter to avoid mutating the caller's object
      requestBody.filter = JSON.parse(JSON.stringify(queryPayload.filter));
      this._logger.info('Filter added to request', {
        filterJson: JSON.stringify(requestBody.filter)
      });
    }

    if (queryPayload.sorts) {
      requestBody.sorts = JSON.parse(JSON.stringify(queryPayload.sorts));
    }

    if (queryPayload.start_cursor) {
      requestBody.start_cursor = queryPayload.start_cursor;
    }

    this._logger.info('Sending to Notion API', {
      endpoint: `/databases/${cleanId}/query`,
      payload: JSON.stringify(requestBody)
    });

    // Correct call signature: request(endpoint, method, data, apiKey)
    const response = this.request(`/databases/${cleanId}/query`, 'POST', requestBody, apiKey);
    const results = response.results || [];

    this._logger.info('Query results received', {
      count: results.length,
      hasFilter: !!requestBody.filter
    });

    return results;
  } catch (error) {
    const errorMessage = error ? (error.message || JSON.stringify(error)) : 'Unknown error';
    this._logger.error('Database query failed', {
      error: errorMessage,
      databaseId
    });
    throw error;
  }
}

    /**
     * Validates or creates the URL property for duplicate checking
     * @param {string} databaseId - Database ID
     * @param {string} propertyName - Property name (e.g., "Gmail link")
     * @param {string} apiKey - Notion API key
     * @returns {boolean} true if property is ready
     * @throws {Error} if property exists but is wrong type
     */
    validateUrlProperty(databaseId, propertyName, apiKey) {
        const cleanId = this._normalizeId(databaseId);
        
        try {
            this._logger.info(`Validating URL property: "${propertyName}"`);
            
            // 1. Fetch current database schema
            const db = this.request(`/databases/${cleanId}`, 'GET', null, apiKey);
            const prop = db.properties[propertyName];

            // 2. Property exists and is correct type - all good!
            if (prop && prop.type === 'url') {
                this._logger.info(`✅ Property "${propertyName}" exists and is URL type`);
                return true;
            }

            // 3. Property exists but is WRONG type - error
            if (prop && prop.type !== 'url') {
                const msg = `Property "${propertyName}" exists but is type "${prop.type}". Expected "url".`;
                this._logger.error('Wrong property type', { propertyName, actualType: prop.type });
                throw new Error(msg);
            }

            // 4. Property doesn't exist - CREATE IT
            this._logger.info(`Creating URL property: "${propertyName}"`);
            this.ensureUrlProperty(databaseId, propertyName, apiKey);
            this._logger.info(`✅ Created URL property: "${propertyName}"`);
            
            return true;

        } catch (error) {
            this._logger.error('Property validation/creation failed', error.message);
            throw error;
        }
    }

    /**
     * Create or update URL property in database schema
     * @param {string} databaseId - Database ID
     * @param {string} propertyName - Property name
     * @param {string} apiKey - Notion API key
     * @returns {Object} Updated database
     */
    ensureUrlProperty(databaseId, propertyName, apiKey) {
        const cleanId = this._normalizeId(databaseId);
        
        const payload = {
            properties: {
                [propertyName]: { url: {} }
            }
        };

        try {
            this._logger.debug('Adding URL property via PATCH', { propertyName });
            const result = this.request(`/databases/${cleanId}`, 'PATCH', payload, apiKey);
            this._logger.info('URL property created', { propertyName });
            return result;
        } catch (error) {
            this._logger.error('Failed to create URL property', error.message);
            // Don't throw - allow workflow to continue
            return null;
        }
    }

 /**
 * Get workspace users from Notion (people with email addresses)
 * @param {string} apiKey - Notion API key
 * @returns {Array<Object>} Simplified user list [{ id, name, email, avatar }]
 * @throws {Error} If the Notion API call fails
 */
getUsers(apiKey) {
  const cacheKey = 'notionUsers';

  // Try to get from in-memory cache
  try {
    const cached = this._cache.get(cacheKey);
    if (cached) {
      const users = Array.isArray(cached) ? cached : JSON.parse(cached);
      this._logger.debug('Returning cached users', { count: users.length });
      return users;
    }
  } catch (e) {
    this._logger.warn('Cache read failed', { error: e.message });
  }

  // Fetch from Notion API
  const url = 'https://api.notion.com/v1/users';
  const options = {
    method: 'get',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': this._version,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode !== 200) {
    this._logger.error('Failed to fetch users', {
      code: responseCode,
      response: responseText
    });
    throw new Error(`Notion API error: ${responseCode}`);
  }

  const data = JSON.parse(responseText);

  // Filter: only real people with email
  const users = (data.results || []).filter(user =>
    user.type === 'person' &&
    user.person &&
    user.person.email
  );

  const simplifiedUsers = users.map(user => ({
    id: user.id,
    name: user.name,
    email: user.person.email,
    avatar: user.avatar_url
  }));

  this._logger.info('Fetched workspace users', { count: simplifiedUsers.length });

  // Cache result using MemoryCache API: set(key, value, ttlSeconds)
  try {
    this._cache.set(cacheKey, simplifiedUsers, 3600);
    this._logger.debug('Cached users successfully');
  } catch (e) {
    this._logger.warn('Cache write failed (non-fatal)', { error: e.message });
  }

  return simplifiedUsers;
}

    /**
     * Test API connection
     * @param {string} apiKey - API key
     * @returns {Object} Test result
     */
    testConnection(apiKey) {
        try {
            const users = this.getUsers(apiKey);
            return {
                success: true,
                message: `Connected! Found ${users.length} workspace users.`,
                usersCount: users.length
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
                error: error
            };
        }
    }

    /**
     * Normalize Notion ID (remove hyphens)
     * @private
     * @param {string} id - Notion ID
     * @returns {string} Normalized ID
     */
    _normalizeId(id) {
        return id.replace(/-/g, '');
    }

    /**
     * Extract title from database object
     * @private
     * @param {Object} db - Database object
     * @returns {string} Database title
     */
    _extractTitle(db) {
        if (db.title && db.title.length > 0) {
            return db.title.map(t => t.plain_text).join('');
        }
        return 'Untitled';
    }

    /**
     * Extract title from page
     * @private
     * @param {Object} page - Page object
     * @returns {string} Page title
     */
    _extractPageTitle(page) {
        if (!page.properties) return 'Untitled';

        const titleProp = Object.values(page.properties).find(p => p.type === 'title');
        if (titleProp && titleProp.title && titleProp.title.length > 0) {
            return titleProp.title.map(t => t.plain_text).join('');
        }
        return 'Untitled';
    }

    /**
     * Parse database properties into standardized format
     * @private
     * @param {Object} properties - Notion properties object
     * @returns {Array} Parsed properties array
     */
    _parseProperties(properties) {
        return Object.entries(properties).map(([name, prop]) => ({
            id: prop.id,
            name: name,
            type: prop.type,
            isTitle: prop.type === 'title',
            isRequired: prop.type === 'title',
            config: this._getPropertyConfig(prop)
        }));
    }

    /**
     * Get property-specific configuration
     * @private
     * @param {Object} prop - Property object
     * @returns {Object} Property configuration
     */
    _getPropertyConfig(prop) {
        switch (prop.type) {
            case 'select':
            case 'status':
                return { options: prop[prop.type]?.options || [] };
            case 'multi_select':
                return { options: prop.multi_select?.options || [] };
            case 'relation':
                return {
                    database_id: prop.relation?.database_id,
                    type: prop.relation?.type,
                    dual_property: prop.relation?.dual_property
                };
            default:
                return {};
        }
    }
}