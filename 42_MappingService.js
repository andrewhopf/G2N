/**
 * @fileoverview Mapping service
 * @description Applies mappings to transform email data to Notion properties
 */
class MappingService {
  /**
   * @param {MappingRepository} mappingRepo - Mapping repository
   * @param {PropertyHandlerFactory} handlerFactory - Handler factory
   * @param {Logger} logger - Logger instance
   */
  constructor(mappingRepo, handlerFactory, logger) {
    /** @private */
    this._mappingRepo = mappingRepo;
    /** @private */
    this._handlerFactory = handlerFactory;
    /** @private */
    this._logger = logger;
  }

  /**
 * Apply all mappings to email data
 * @param {EmailData} emailData - Email data
 * @param {string} apiKey - API key for lookups
 * @returns {Object} Result with properties, errors, and count
 */
applyMappings(emailData, apiKey) {
  const mappings = this._mappingRepo.getEnabled();
  const properties = {};
  const errors = [];

  this._logger.debug('Applying mappings', { 
    count: Object.keys(mappings).length,
    emailSubject: emailData.subject
  });

  Object.entries(mappings).forEach(([propId, mapping]) => {
    try {
      // ✅ SPECIAL CASE: Handle Gmail link directly
      if (mapping.emailField === 'gmailLinkUrl') {
        this._logger.debug('Processing Gmail link URL', {
          propId,
          propertyName: mapping.notionPropertyName,
          url: emailData.gmailLinkUrl
        });
        
        if (emailData.gmailLinkUrl) {
          // URL fields in Notion just take the string directly
          properties[mapping.notionPropertyName] = {
            url: emailData.gmailLinkUrl
          };
          
          this._logger.info('✅ Mapped Gmail link', {
            propertyName: mapping.notionPropertyName,
            url: emailData.gmailLinkUrl
          });
          return; // Continue to next mapping
        } else {
          this._logger.warn('Gmail link URL is empty', { propId });
          return;
        }
      }

      // Get handler for this property type
      const handler = this._handlerFactory.getHandler(mapping.type);
      if (!handler) {
        this._logger.debug('No handler for type', { type: mapping.type });
        return;
      }

      // Process the mapping through handler
      const result = handler.processForNotion(mapping, emailData, apiKey);
      
      if (result !== null && result !== undefined) {
        const propertyName = mapping.notionPropertyName;
        
        if (!propertyName) {
          throw new Error(`Mapping ${propId} has no notionPropertyName`);
        }
        
        properties[propertyName] = result;

        this._logger.debug('Mapped property', {
          id: propId,
          name: propertyName,
          type: mapping.type
        });
      }
    } catch (error) {
      errors.push({
        property: mapping.notionPropertyName || propId,
        error: error.message
      });
      this._logger.warn('Mapping error', {
        property: mapping.notionPropertyName || propId,
        error: error.message
      });
    }
  });

  if (errors.length > 0) {
    this._logger.warn('Some mappings failed', { count: errors.length });
  }

  this._logger.debug('Mappings applied', {
    success: Object.keys(properties).length,
    failed: errors.length
  });

  return {
    properties,
    errors,
    mappedCount: Object.keys(properties).length
  };
}

  /**
   * Get default title property
   * @param {EmailData} emailData - Email data
   * @returns {Object} Title property formatted for Notion
   */
  getDefaultTitle(emailData) {
    const subject = emailData.subject || `Email from ${emailData.from}`;
    
    return {
      title: [
        {
          type: 'text',
          text: {
            content: subject.substring(0, 2000) // Notion limit
          }
        }
      ]
    };
  }

  /**
   * Validate mappings before use
   * @returns {Object} Validation result
   */
  validate() {
    const mappings = this._mappingRepo.getAll();
    const errors = [];

    Object.entries(mappings).forEach(([propId, mapping]) => {
      if (!mapping.notionPropertyName) {
        errors.push(`Mapping ${propId} has no notionPropertyName`);
      }
      
      if (!mapping.type) {
        errors.push(`Mapping ${propId} has no type`);
      }
      
      const handler = this._handlerFactory.getHandler(mapping.type);
      if (!handler) {
        errors.push(`No handler for type ${mapping.type} in mapping ${propId}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      totalMappings: Object.keys(mappings).length,
      enabledMappings: Object.values(mappings).filter(m => m.enabled).length
    };
  }
}
