/**
 * PageService
 * Responsible for orchestrating Notion page creation: mapping -> content -> create page
 */
class PageService {
  /**
   * @param {NotionService} notionService
   * @param {MappingService} mappingService
   * @param {PageContentBuilder} contentBuilder
   * @param {ConfigRepository} configRepo
   * @param {Logger} logger
   */
  constructor(notionService, mappingService, contentBuilder, configRepo, logger) {
    this.notionService = notionService;
    this.mappingService = mappingService;
    this.contentBuilder = contentBuilder;
    this.configRepo = configRepo;
    this.logger = logger;
  }

  /**
   * Create a Notion page from an EmailData object (SYNC - no async/await)
   * @param {EmailData} emailData
   * @returns {Object} created page info (id, url, createdTime)
   */
  createPageFromEmail(emailData) {
    const config = this.configRepo.getAll();
    if (!config.apiKey) throw new ConfigError('API key not configured', 'apiKey');
    if (!config.databaseId) throw new ConfigError('Database not selected', 'databaseId');
    
    const apiKey = config.apiKey;
    const databaseId = config.databaseId;
    
    this.logger.info('PageService: building properties and content from email', {
      messageId: emailData.messageId
    });

    const mappingResult = this.mappingService.applyMappings(emailData, apiKey);
    let properties = mappingResult.properties || {};

    // ✅ FIX A: Filter out stale properties that don't exist in current schema
    try {
      const dbSchema = this.notionService.adapter.getDatabase(databaseId, apiKey);
      const propNames = (dbSchema.properties || []).map(p => p.name);
      const allowedNames = new Set(propNames);
      
      this.logger.debug('Database property names', { 
        names: propNames,
        allowedCount: allowedNames.size 
      });
      
      // Filter properties to only include those that exist in current schema
      const filteredProperties = {};
      const removedProperties = [];
      
      Object.entries(properties).forEach(([propName, propValue]) => {
        if (allowedNames.has(propName)) {
          filteredProperties[propName] = propValue;
        } else {
          removedProperties.push(propName);
          this.logger.warn('Removing stale property from payload', {
            propertyName: propName,
            reason: 'Property does not exist in current database schema',
            availableProperties: propNames
          });
        }
      });
      
      if (removedProperties.length > 0) {
        this.logger.warn('Stale properties removed', {
          count: removedProperties.length,
          properties: removedProperties
        });
      }
      
      properties = filteredProperties;
      this.logger.debug('Properties after filtering stale ones', {
        originalCount: Object.keys(mappingResult.properties || {}).length,
        filteredCount: Object.keys(properties).length,
        removedCount: removedProperties.length
      });
    } catch (error) {
      this.logger.warn('Failed to filter stale properties (non-fatal)', error.message);
      // Continue with unfiltered properties - Notion will error if there are issues
    }

    // AUTO-ADD GMAIL LINK PROPERTY (SYNC)
    if (emailData.gmailLinkUrl) {
      const gmailLinkPropertyName = this._ensureGmailLinkProperty(databaseId, apiKey);
      if (gmailLinkPropertyName && typeof gmailLinkPropertyName === 'string') {
        // ✅ ENHANCED FIX A: Check if property name exists in current schema
        try {
          const dbSchema = this.notionService.adapter.getDatabase(databaseId, apiKey);
          const propNames = (dbSchema.properties || []).map(p => p.name);
          const allowedNames = new Set(propNames);
          
          if (allowedNames.has(gmailLinkPropertyName)) {
            properties[gmailLinkPropertyName] = { url: emailData.gmailLinkUrl };
            this.logger.info('Auto-added Gmail Link property', {
              propertyName: gmailLinkPropertyName,
              url: String(emailData.gmailLinkUrl).substring(0, 50) + '...'
            });
          } else {
            this.logger.warn('Gmail Link property not present in schema yet; skipping add', { 
              gmailLinkPropertyName,
              availableProperties: propNames
            });
          }
        } catch (error) {
          this.logger.warn('Failed to verify Gmail Link property existence', error.message);
          // Add anyway - safer to try and let Notion error if it doesn't exist
          properties[gmailLinkPropertyName] = { url: emailData.gmailLinkUrl };
        }
      } else {
        this.logger.warn('Gmail Link property name invalid', { gmailLinkPropertyName });
      }
    }

    // Ensure a title exists
    if (!Object.values(properties).some(p => p && p.title)) {
      const schema = this.notionService.adapter.getDatabase(databaseId, apiKey);
      const titleProp = (schema.properties || []).find(p => p.type === 'title');
      if (titleProp && titleProp.name) {
        properties[titleProp.name] = this.mappingService.getDefaultTitle(emailData);
        this.logger.debug('Added default title property', { propertyName: titleProp.name });
      }
    }

    const children = (this.contentBuilder && typeof this.contentBuilder.buildEmailContent === 'function')
      ? this.contentBuilder.buildEmailContent(emailData)
      : [];

    // Log final properties being sent
    this.logger.debug('Final properties to send to Notion', {
      propertyNames: Object.keys(properties),
      hasTitle: Object.values(properties).some(p => p && p.title)
    });

    const page = this.notionService.createPage(properties, children);
    return page;
  }

  /**
   * Ensure the Notion database has a Gmail Link URL property (SYNC)
   * @private
   * @param {string} databaseId - Notion database ID
   * @param {string} apiKey - Notion API key
   * @returns {string|null} property name to use
   */
  _ensureGmailLinkProperty(databaseId, apiKey) {
    try {
      const dbSchema = this.notionService.adapter.getDatabase(databaseId, apiKey);
      const propsArray = Array.isArray(dbSchema && dbSchema.properties) ? dbSchema.properties : [];

      // 1) Exact match
      const exact = propsArray.find(p => p.name === 'Gmail Link' && p.type === 'url');
      if (exact) {
        this.logger.info('Gmail Link URL property found', { propertyName: 'Gmail Link' });
        return 'Gmail Link';
      }

      // 2) Reuse an existing URL property if present
      const urlProps = propsArray.filter(p => p.type === 'url');
      if (urlProps.length > 0) {
        const firstUrlProp = urlProps[0];
        this.logger.info('Using existing URL property for Gmail links', { propertyName: firstUrlProp.name });
        return firstUrlProp.name;
      }

      // 3) Create "Gmail Link"
      this.logger.info('No URL properties found; creating "Gmail Link"');
      const updatedDb = this.notionService.adapter.ensureUrlProperty(databaseId, 'Gmail Link', apiKey);

      if (updatedDb && updatedDb.properties && updatedDb.properties['Gmail Link']) {
        this.logger.info('Created "Gmail Link" property successfully');
        return 'Gmail Link';
      }

      this.logger.warn('Failed to create "Gmail Link" property');
      return null;
    } catch (error) {
      this.logger.warn('Failed to ensure Gmail Link property', error && error.message ? error.message : error);
      return null;
    }
  }
}