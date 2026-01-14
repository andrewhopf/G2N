/**
 * @fileoverview Mapping storage repository
 * @description Manages field mapping persistence
 */

/**
 * Mapping Repository
 * @class MappingRepository
 */
class MappingRepository {
  /**
   * @param {ConfigRepository} configRepo - Configuration repository
   * @param {Logger} logger - Logger instance
   */
  constructor(configRepo, logger) {
    /** @private */
    this._configRepo = configRepo;
    /** @private */
    this._logger = logger;
  }

  /**
   * Get all mappings
   * @returns {Object}
   */
  getAll() {
    try {
      const config = this._configRepo.getAll();
      const mappingsStr = config.mappings || '{}';
      
      return JSON.parse(mappingsStr);
    } catch (error) {
      this._logger.error('Failed to parse mappings', error);
      return {};
    }
  }

  /**
   * Get mapping for a specific property
   * @param {string} propertyId - Property ID
   * @returns {Object|null}
   */
  get(propertyId) {
    const mappings = this.getAll();
    return mappings[propertyId] || null;
  }

  /**
   * Save all mappings
   * @param {Object} mappings - Mappings to save
   * @returns {boolean}
   */
  saveAll(mappings) {
    try {
      this._configRepo.set({
        mappings: JSON.stringify(mappings)
      });
      
      this._logger.info('Mappings saved', { count: Object.keys(mappings).length });
      return true;
    } catch (error) {
      this._logger.error('Failed to save mappings', error);
      return false;
    }
  }

  /**
   * Update a single mapping
   * @param {string} propertyId - Property ID
   * @param {Object} mapping - Mapping configuration
   * @returns {boolean}
   */
  update(propertyId, mapping) {
    const mappings = this.getAll();
    mappings[propertyId] = mapping;
    return this.saveAll(mappings);
  }

  /**
   * Delete a mapping
   * @param {string} propertyId - Property ID
   * @returns {boolean}
   */
  delete(propertyId) {
    const mappings = this.getAll();
    delete mappings[propertyId];
    return this.saveAll(mappings);
  }

  /**
   * Clear all mappings
   * @returns {boolean}
   */
  clear() {
    return this.saveAll({});
  }

  /**
   * Get enabled mappings
   * @returns {Object}
   */
  getEnabled() {
    const mappings = this.getAll();
    const enabled = {};

    Object.entries(mappings).forEach(([key, mapping]) => {
      if (mapping.enabled || mapping.isRequired) {
        enabled[key] = mapping;
      }
    });

    return enabled;
  }

  /**
   * Get count of enabled mappings
   * @returns {number}
   */
  getEnabledCount() {
    return Object.keys(this.getEnabled()).length;
  }
}