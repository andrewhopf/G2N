/**
 * @fileoverview Validation service
 * @description Centralized input validation
 */

/**
 * Validation Service
 * @class ValidationService
 */
class ValidationService {
  constructor() {
    /** @private */
    this._patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      notionApiKey: /^secret_[a-zA-Z0-9_]{43}$/,
      notionId: /^[a-f0-9]{32}$/,
      url: /^https?:\/\/[^\s]+$/,
      gmailMessageId: /^[a-zA-Z0-9_-]+$/
    };
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  isEmail(email) {
    return typeof email === 'string' && this._patterns.email.test(email.trim());
  }

  /**
   * Validate Notion API key
   * @param {string} apiKey - API key to validate
   * @returns {boolean}
   */
  isNotionApiKey(apiKey) {
    return typeof apiKey === 'string' && this._patterns.notionApiKey.test(apiKey.trim());
  }

  /**
   * Validate Notion ID (database or page)
   * @param {string} id - ID to validate
   * @returns {boolean}
   */
  isNotionId(id) {
    if (!id || typeof id !== 'string') return false;
    const cleaned = id.replace(/-/g, '');
    return this._patterns.notionId.test(cleaned);
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean}
   */
  isUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validate Gmail message ID
   * @param {string} messageId - Message ID to validate
   * @returns {boolean}
   */
  isGmailMessageId(messageId) {
    return typeof messageId === 'string' && 
           messageId.length >= 5 && 
           this._patterns.gmailMessageId.test(messageId);
  }

  /**
   * Validate configuration object
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig(config) {
    const errors = [];
    const result = {
      isValid: true,
      errors: [],
      hasApiKey: false,
      hasDatabaseId: false,
      apiKeyValid: false,
      databaseIdValid: false
    };

    if (!config || typeof config !== 'object') {
      result.isValid = false;
      result.errors.push('Configuration must be an object');
      return result;
    }

    // API Key
    if (config.apiKey) {
      result.hasApiKey = true;
      result.apiKeyValid = this.isNotionApiKey(config.apiKey);
      
      if (!result.apiKeyValid) {
        errors.push('API key format is invalid');
      }
    } else {
      errors.push('API key is required');
    }

    // Database ID
    if (config.databaseId) {
      result.hasDatabaseId = true;
      result.databaseIdValid = this.isNotionId(config.databaseId);
      
      if (!result.databaseIdValid) {
        errors.push('Database ID format is invalid');
      }
    } else {
      errors.push('Database ID is required');
    }

    result.errors = errors;
    result.isValid = errors.length === 0;
    
    return result;
  }

  /**
   * Validate mappings object
   * @param {Object} mappings - Mappings to validate
   * @returns {Object} Validation result
   */
  validateMappings(mappings) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
      totalMappings: 0,
      enabledMappings: 0
    };

    if (!mappings || typeof mappings !== 'object') {
      result.isValid = false;
      result.errors.push('Mappings must be an object');
      return result;
    }

    result.totalMappings = Object.keys(mappings).length;

    Object.entries(mappings).forEach(([key, mapping]) => {
      if (!mapping || typeof mapping !== 'object') {
        result.errors.push(`Invalid mapping for ${key}`);
        return;
      }

      if (!mapping.type) {
        result.warnings.push(`Mapping ${key} missing type`);
      }

      if (mapping.enabled || mapping.isRequired) {
        result.enabledMappings++;
      }
    });

    result.isValid = result.errors.length === 0;
    result.hasMappings = result.totalMappings > 0;
    
    return result;
  }

  /**
   * Validate email data object
   * @param {Object} emailData - Email data to validate
   * @returns {Object} Validation result
   */
  validateEmailData(emailData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (!emailData || typeof emailData !== 'object') {
      result.isValid = false;
      result.errors.push('Email data must be an object');
      return result;
    }

    if (!emailData.messageId) {
      result.errors.push('Missing messageId');
    }

    if (!emailData.subject && emailData.subject !== '') {
      result.warnings.push('Missing subject');
    }

    if (!emailData.from) {
      result.warnings.push('Missing sender (from)');
    }

    if (!emailData.body && !emailData.plainBody) {
      result.warnings.push('Missing body content');
    }

    result.isValid = result.errors.length === 0;
    
    return result;
  }

  /**
   * Check if property type is mappable
   * @param {string} type - Property type
   * @returns {boolean}
   */
  isPropertyMappable(type) {
    const autoManaged = [
      'formula', 'rollup', 'created_time', 'created_by',
      'last_edited_time', 'last_edited_by'
    ];
    return !autoManaged.includes(type);
  }

  /**
   * Get display name for property type
   * @param {string} type - Property type
   * @returns {string}
   */
  getPropertyTypeDisplayName(type) {
    const names = {
      title: 'Title',
      rich_text: 'Text',
      select: 'Select',
      status: 'Status',
      multi_select: 'Multi-select',
      checkbox: 'Checkbox',
      people: 'People',
      date: 'Date',
      files: 'Files',
      relation: 'Relation',
      url: 'URL',
      number: 'Number',
      phone_number: 'Phone',
      email: 'Email'
    };
    return names[type] || type;
  }
}