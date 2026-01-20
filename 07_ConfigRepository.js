/**
 * @fileoverview Configuration storage repository
 * @description Manages configuration persistence
 */

/**
 * Configuration Repository
 * @class ConfigRepository
 */
class ConfigRepository {
  /**
   * @param {Logger} logger - Logger instance
   */
  constructor(logger) {
    /** @private */
    this._logger = logger;
    /** @private */
    this._properties = null;
    /** @private */
    this._defaults = {
      apiKey: '',
      databaseId: '',
      databaseName: '',
      mappings: '{}',
      attachmentDatabaseId: '',
      attachmentDatabaseName: '',
      attachmentMappings: '{}',
      filesPropertyName: 'Attachments',
      fileHandling: 'upload_to_drive',
      attachmentEmbedEmailPage: 'false',
      attachmentEmbedAttachmentPage: 'false',
      autoSave: 'false',
      notifications: 'true'
    };
    /** @private */
    this._keys = {
      apiKey: 'G2N_API_KEY',
      databaseId: 'G2N_DATABASE_ID',
      databaseName: 'G2N_DATABASE_NAME',
      mappings: 'G2N_MAPPINGS',
      attachmentDatabaseId: 'G2N_ATTACHMENT_DATABASE_ID',
      attachmentDatabaseName: 'G2N_ATTACHMENT_DATABASE_NAME',
      attachmentMappings: 'G2N_ATTACHMENT_MAPPINGS',
      filesPropertyName: 'G2N_FILES_PROPERTY_NAME',
      fileHandling: 'G2N_FILE_HANDLING',
      attachmentEmbedEmailPage: 'G2N_ATTACHMENT_EMBED_EMAIL_PAGE',
      attachmentEmbedAttachmentPage: 'G2N_ATTACHMENT_EMBED_ATTACHMENT_PAGE',
      autoSave: 'G2N_AUTO_SAVE',
      notifications: 'G2N_NOTIFICATIONS'
    };
  }

  /**
   * Get properties service lazily
   * @private
   */
  _getProperties() {
    if (!this._properties) {
      this._properties = PropertiesService.getUserProperties();
    }
    return this._properties;
  }

  /**
   * Get all configuration
   * @returns {Object}
   */
  getAll() {
    try {
      const props = this._getProperties().getProperties();
      
      return {
        apiKey: props[this._keys.apiKey] || this._defaults.apiKey,
        databaseId: props[this._keys.databaseId] || this._defaults.databaseId,
        databaseName: props[this._keys.databaseName] || this._defaults.databaseName,
        mappings: props[this._keys.mappings] || this._defaults.mappings,
        attachmentDatabaseId: props[this._keys.attachmentDatabaseId] || this._defaults.attachmentDatabaseId,
        attachmentDatabaseName: props[this._keys.attachmentDatabaseName] || this._defaults.attachmentDatabaseName,
        attachmentMappings: props[this._keys.attachmentMappings] || this._defaults.attachmentMappings,
        filesPropertyName: props[this._keys.filesPropertyName] || this._defaults.filesPropertyName,
        fileHandling: props[this._keys.fileHandling] || this._defaults.fileHandling,
        attachmentEmbedEmailPage: props[this._keys.attachmentEmbedEmailPage] === 'true',
        attachmentEmbedAttachmentPage: props[this._keys.attachmentEmbedAttachmentPage] === 'true',
        autoSave: props[this._keys.autoSave] === 'true',
        notifications: props[this._keys.notifications] !== 'false'
      };
    } catch (error) {
      this._logger.error('Failed to get configuration', error);
      return { ...this._defaults };
    }
  }

  /**
   * Get a single configuration value
   * @param {string} key - Config key
   * @returns {*}
   */
  get(key) {
    return this.getAll()[key];
  }

  /**
   * Set configuration values
   * @param {Object} config - Configuration to set
   * @returns {boolean}
   */
  set(config) {
    try {
      const props = this._getProperties();
      const toSet = {};

      Object.entries(config).forEach(([key, value]) => {
        if (this._keys[key]) {
          const storageKey = this._keys[key];
          
          if (typeof value === 'boolean') {
            toSet[storageKey] = value.toString();
          } else if (typeof value === 'object') {
            toSet[storageKey] = JSON.stringify(value);
          } else {
            toSet[storageKey] = String(value || '');
          }
        }
      });

      props.setProperties(toSet);
      this._logger.info('Configuration saved', Object.keys(config));
      
      return true;
    } catch (error) {
      this._logger.error('Failed to save configuration', error);
      return false;
    }
  }

  /**
   * Reset configuration to defaults
   * @returns {boolean}
   */
  reset() {
    try {
      const props = this._getProperties();
      
      Object.values(this._keys).forEach(key => {
        props.deleteProperty(key);
      });
      
      this._logger.info('Configuration reset to defaults');
      return true;
    } catch (error) {
      this._logger.error('Failed to reset configuration', error);
      return false;
    }
  }

  /**
   * Validate current configuration
   * @returns {Object}
   */
  validate() {
    const config = this.getAll();
    const errors = [];
    
    const result = {
      isValid: true,
      hasApiKey: !!config.apiKey,
      hasDatabaseId: !!config.databaseId,
      hasMappings: config.mappings !== '{}' && config.mappings !== '',
      errors: []
    };

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    if (!config.databaseId) {
      errors.push('Database ID is required');
    }

    result.errors = errors;
    result.isValid = errors.length === 0;
    
    return result;
  }
}
