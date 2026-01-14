/**
 * @fileoverview Dependency Injection Container
 * @description Manages service registration and resolution with lazy loading
 */

/**
 * Dependency Injection Container
 * @class ServiceContainer
 */
class ServiceContainer {
  constructor() {
    /** @private */
    this._registry = new Map();
    /** @private */
    this._singletons = new Map();
    /** @private */
    this._factories = new Map();
  }

  /**
   * Register a class with the container
   * @param {string} name - Service identifier
   * @param {Function} ClassDef - Class constructor
   * @param {Object} options - Registration options
   * @param {Array<string>} [options.dependencies=[]] - Dependency names
   * @param {boolean} [options.singleton=true] - Cache instance
   * @returns {ServiceContainer} For chaining
   */
  register(name, ClassDef, options = {}) {
    if (typeof ClassDef !== 'function') {
      throw new Error(`Service "${name}" must be a constructor function`);
    }
    
    this._registry.set(name, {
      ClassDef,
      dependencies: options.dependencies || [],
      singleton: options.singleton !== false
    });
    
    return this;
  }

  /**
   * Register a factory function
   * @param {string} name - Service identifier
   * @param {Function} factory - Factory function receiving container
   * @returns {ServiceContainer} For chaining
   */
  registerFactory(name, factory) {
    if (typeof factory !== 'function') {
      throw new Error(`Factory for "${name}" must be a function`);
    }
    
    this._factories.set(name, factory);
    return this;
  }

  /**
   * Register an existing instance
   * @param {string} name - Service identifier
   * @param {Object} instance - Pre-created instance
   * @returns {ServiceContainer} For chaining
   */
  registerInstance(name, instance) {
    this._singletons.set(name, instance);
    return this;
  }

  /**
   * Resolve a service by name
   * @param {string} name - Service identifier
   * @returns {Object} Service instance
   * @throws {Error} If service not found
   */
  resolve(name) {
    // Check for factory first
    if (this._factories.has(name)) {
      return this._factories.get(name)(this);
    }

    // Check for cached singleton
    if (this._singletons.has(name)) {
      return this._singletons.get(name);
    }

    // Get registration
    const registration = this._registry.get(name);
    if (!registration) {
      throw new Error(`Service "${name}" is not registered`);
    }

    // Resolve dependencies recursively
    const dependencies = registration.dependencies.map(dep => {
      try {
        return this.resolve(dep);
      } catch (error) {
        throw new Error(`Failed to resolve dependency "${dep}" for "${name}": ${error.message}`);
      }
    });

    // Create instance
    const instance = new registration.ClassDef(...dependencies);

    // Cache if singleton
    if (registration.singleton) {
      this._singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Check if service is registered
   * @param {string} name - Service identifier
   * @returns {boolean}
   */
  has(name) {
    return this._registry.has(name) || 
           this._factories.has(name) || 
           this._singletons.has(name);
  }

  /**
   * Get all registered service names
   * @returns {Array<string>}
   */
  getRegisteredServices() {
    const names = new Set([
      ...this._registry.keys(),
      ...this._factories.keys(),
      ...this._singletons.keys()
    ]);
    return Array.from(names);
  }

  /**
   * Clear all singleton instances (for testing)
   */
  reset() {
    this._singletons.clear();
  }

  /**
   * Clear all registrations
   */
  clear() {
    this._registry.clear();
    this._factories.clear();
    this._singletons.clear();
  }
}

// Global container instance
var container = new ServiceContainer();