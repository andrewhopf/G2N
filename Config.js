// Config.gs
// =============================================================================
// GMAIL TO NOTION INTEGRATION - CONFIGURATION
//  
// =============================================================================

// These constants are already defined in Constants.gs, so we don't redefine them
// We'll use them directly

// =============================================================================
// CONFIGURATION VALIDATION AND MANAGEMENT
// =============================================================================

/**
 * Get default configuration - using existing function from Constants.gs
 */
function getDefaultG2NConfig() {
  if (typeof getDefaultG2NConfig === 'function') {
    return getDefaultG2NConfig();
  }
  
  // Fallback if not defined elsewhere
  return JSON.parse(JSON.stringify(G2N_APP_CONFIG));
}

/**
 * Enhanced API key validation that accepts 49-character keys
 */
function validateNotionApiKey(key) {
  if (!key || typeof key !== 'string') {
    return { isValid: false, error: 'API key must be a non-empty string' };
  }
  
  const trimmedKey = key.trim();
  const isNtnFormat = trimmedKey.startsWith('ntn_');
  const isSecretFormat = trimmedKey.startsWith('secret_');
  
  if (!isNtnFormat && !isSecretFormat) {
    return { 
      isValid: false, 
      error: 'Invalid Notion API key format. Must start with "ntn_" or "secret_"' 
    };
  }
  
  // Accept 44, 49, and 50 character ntn_ keys, and 43 character secret_ keys
  if (isNtnFormat) {
    const isValidLength = [44, 49, 50].includes(trimmedKey.length);
    if (!isValidLength) {
      return { 
        isValid: false, 
        error: `ntn_ key should be 44, 49, or 50 characters, got ${trimmedKey.length}` 
      };
    }
  } else if (isSecretFormat && trimmedKey.length !== 43) {
    return { 
      isValid: false, 
      error: `secret_ key should be 43 characters, got ${trimmedKey.length}` 
    };
  }
  
  return { 
    isValid: true, 
    format: isNtnFormat ? 'ntn_' : 'secret_',
    length: trimmedKey.length,
    version: isNtnFormat ? 
      (trimmedKey.length === 50 ? 'new' : 
       trimmedKey.length === 49 ? 'intermediate' : 'legacy') : 'legacy'
  };
}

/**
 * Unified Validation System - UPDATED to not require database IDs
 */
function validateG2NConfiguration(config) {
  try {
    const issues = [];
    const { NOTION_API_KEY, DATABASES, SETTINGS } = config;

    // Core validation - only require API key, not databases
    const requiredFields = ['NOTION_API_KEY']; // Removed database requirements
    
    requiredFields.forEach(field => {
      if (!config[field]) {
        issues.push(`Missing required field: ${field}`);
      }
    });

    // Basic API key validation - UPDATED FOR 50-CHAR KEYS
    if (NOTION_API_KEY) {
      const trimmedKey = NOTION_API_KEY.trim();
      const isNtnFormat = trimmedKey.startsWith('ntn_');
      const isSecretFormat = trimmedKey.startsWith('secret_');
      
      if (!isNtnFormat && !isSecretFormat) {
        issues.push('Invalid Notion API key format. Must start with "ntn_" or "secret_"');
      } else if (isNtnFormat && trimmedKey.length !== 44 && trimmedKey.length !== 50) {
        issues.push(`Invalid ntn_ key length: expected 44 or 50 characters, got ${trimmedKey.length}`);
      } else if (isSecretFormat && trimmedKey.length !== 43) {
        issues.push(`Invalid secret_ key length: expected 43 characters, got ${trimmedKey.length}`);
      }
    }

    // Database ID validation (only if present)
    if (DATABASES && DATABASES.gmail && DATABASES.gmail.id) {
      const constants = getAppConstants();
      if (!constants.PATTERNS.DATABASE_ID.test(DATABASES.gmail.id)) {
        issues.push('Invalid Gmail database ID format');
      }
    }

    // Value ranges with safety checks
    if (SETTINGS && SETTINGS.maxBodyLength) {
      const { min, max } = constants.VALIDATION_LIMITS.MAX_BODY_LENGTH;
      if (SETTINGS.maxBodyLength < min || SETTINGS.maxBodyLength > max) {
        issues.push(`Body length must be between ${min}-${max}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    g2nError('Config', 'Configuration validation failed', { error: error.message });
    return {
      isValid: false,
      issues: [`Configuration validation error: ${error.message}`],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Enhanced configuration loader with Script Properties fallback
 */
function getEnhancedG2NConfig() {
  const startTime = g2nStartTimer();
  let hadError = false;
  
  g2nFunctionEntry('getEnhancedG2NConfig', {});
  
  try {
    // 1. Try to get from memory cache first
    const cache = CacheService.getScriptCache();
    const cachedConfig = cache.get(G2N_CONFIG_CACHE_KEY);
    
    if (cachedConfig) {
      try {
        const config = JSON.parse(cachedConfig);
        console.log('✅ Configuration loaded from cache');
        g2nFunctionExit('getEnhancedG2NConfig', { success: true, source: 'cache' }, startTime);
        return config;
      } catch (parseError) {
        console.warn('⚠️ Failed to parse cached config, trying Script Properties...');
      }
    }
    
    // 2. NEW: Try to load from Script Properties
    const scriptPropertiesConfig = loadG2NConfigFromScriptProperties();
    if (scriptPropertiesConfig) {
      // Cache the loaded configuration
      cache.put(G2N_CONFIG_CACHE_KEY, JSON.stringify(scriptPropertiesConfig), G2N_CONFIG_CACHE_EXPIRATION);
      console.log('✅ Configuration loaded from Script Properties and cached');
      g2nFunctionExit('getEnhancedG2NConfig', { success: true, source: 'script_properties' }, startTime);
      return scriptPropertiesConfig;
    }
    
    // 3. Fallback to default configuration
    console.log('🔄 Using default configuration');
    const defaultConfig = getDefaultG2NConfig();
    
    g2nFunctionExit('getEnhancedG2NConfig', { success: true, source: 'default' }, startTime);
    return defaultConfig;
    
  } catch (error) {
    hadError = true;
    g2nError('Config', 'Failed to load configuration', {
      error: error.message,
      duration: new Date().getTime() - startTime
    });
    
    // Emergency fallback
    const defaultConfig = getDefaultG2NConfig();
    g2nFunctionExit('getEnhancedG2NConfig', { success: false, source: 'fallback' }, startTime);
    return defaultConfig;
  }
}

/**
 * Enhanced save to BOTH memory cache AND Script Properties
 */
function saveG2NConfigToStorage(config) {
  const startTime = g2nStartTimer();
  let hadError = false;
  
  g2nFunctionEntry('saveG2NConfigToStorage', {
    hasConfig: !!config,
    hasApiKey: !!(config && config.NOTION_API_KEY),
    hasGmailDb: !!(config && config.DATABASES && config.DATABASES.gmail && config.DATABASES.gmail.id)
  });
  
  try {
    if (!config) {
      throw new Error('No configuration provided to save');
    }
    
    console.log('💾 Saving configuration to storage...');
    
    // 1. Save to memory cache (existing functionality)
    const cache = CacheService.getScriptCache();
    cache.put(G2N_CONFIG_CACHE_KEY, JSON.stringify(config), G2N_CONFIG_CACHE_EXPIRATION);
    
    // 2. NEW: Save critical settings to Script Properties for persistence
    const scriptProperties = PropertiesService.getScriptProperties();
    const propertiesToSave = {};
    
    // Save API Key
    if (config.NOTION_API_KEY) {
      propertiesToSave.NOTION_API_KEY = config.NOTION_API_KEY;
    }
    
    // Save Database IDs and Names
    if (config.DATABASES) {
      if (config.DATABASES.gmail && config.DATABASES.gmail.id) {
        propertiesToSave.GMAIL_DATABASE_ID = config.DATABASES.gmail.id;
        propertiesToSave.GMAIL_DATABASE_NAME = config.DATABASES.gmail.name || 'Gmail Database';
      }
      
      if (config.DATABASES.resources && config.DATABASES.resources.id) {
        propertiesToSave.RESOURCES_DATABASE_ID = config.DATABASES.resources.id;
        propertiesToSave.RESOURCES_DATABASE_NAME = config.DATABASES.resources.name || 'Resources Database';
      }
    }
    
    // Save Property Mappings
    if (config.PROPERTY_MAPPINGS && config.PROPERTY_MAPPINGS.mappings) {
      Object.keys(config.PROPERTY_MAPPINGS.mappings).forEach(databaseId => {
        const mappings = config.PROPERTY_MAPPINGS.mappings[databaseId];
        if (mappings && Object.keys(mappings).length > 0) {
          propertiesToSave[`PROPERTY_MAPPINGS_${databaseId}`] = JSON.stringify(mappings);
          console.log(`💾 Saved mappings for database: ${databaseId}`, Object.keys(mappings));
        }
      });
    }
    
    // Save to Script Properties
    if (Object.keys(propertiesToSave).length > 0) {
      scriptProperties.setProperties(propertiesToSave);
      console.log(`✅ Saved ${Object.keys(propertiesToSave).length} properties to Script Properties`);
    }
    
    g2nInfo('Config', 'Configuration saved successfully', {
      savedToCache: true,
      savedToScriptProperties: true,
      propertyCount: Object.keys(propertiesToSave).length
    });
    
    return {
      success: true,
      message: 'Configuration saved to storage',
      cacheSaved: true,
      scriptPropertiesSaved: true
    };
    
  } catch (error) {
    hadError = true;
    g2nError('Config', 'Failed to save configuration', {
      error: error.message,
      duration: new Date().getTime() - startTime
    });
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    g2nFunctionExit('saveG2NConfigToStorage', { success: !hadError }, startTime);
  }
}

/**
 * Load configuration from Script Properties as fallback
 */
function loadG2NConfigFromScriptProperties() {
  try {
    console.log('📖 Loading configuration from Script Properties...');
    
    const scriptProperties = PropertiesService.getScriptProperties();
    const properties = scriptProperties.getProperties();
    
    if (Object.keys(properties).length === 0) {
      console.log('ℹ️ No configuration found in Script Properties');
      return null;
    }
    
    const config = {
      NOTION_API_KEY: properties.NOTION_API_KEY || '',
      DATABASES: {
        gmail: {
          id: properties.GMAIL_DATABASE_ID || '',
          name: properties.GMAIL_DATABASE_NAME || ''
        },
        resources: {
          id: properties.RESOURCES_DATABASE_ID || '',
          name: properties.RESOURCES_DATABASE_NAME || ''
        }
      },
      PROPERTY_MAPPINGS: {
        mappings: {},
        metadata: {
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          source: 'script_properties'
        }
      }
    };
    
    // Load property mappings
    Object.keys(properties).forEach(key => {
      if (key.startsWith('PROPERTY_MAPPINGS_')) {
        const databaseId = key.replace('PROPERTY_MAPPINGS_', '');
        try {
          const mappings = JSON.parse(properties[key]);
          config.PROPERTY_MAPPINGS.mappings[databaseId] = mappings;
          console.log(`📖 Loaded mappings for database: ${databaseId}`, Object.keys(mappings));
        } catch (parseError) {
          console.error(`❌ Failed to parse mappings for ${databaseId}:`, parseError);
        }
      }
    });
    
    console.log('✅ Configuration loaded from Script Properties');
    return config;
    
  } catch (error) {
    console.error('❌ Failed to load configuration from Script Properties:', error);
    return null;
  }
}

/**
 * Validate mapping data structure
 */
function validateG2NMappingsData(mappingsData) {
  if (!mappingsData || typeof mappingsData !== 'object') {
    return { mappings: {}, metadata: { version: '1.0', lastUpdated: null } };
  }
  
  const validated = {
    mappings: mappingsData.mappings || {},
    metadata: {
      version: mappingsData.metadata?.version || '1.0',
      lastUpdated: mappingsData.metadata?.lastUpdated || null,
      databaseCount: mappingsData.metadata?.databaseCount || 0,
      mappingCount: mappingsData.metadata?.mappingCount || 0
    }
  };
  
  return validated;
}

/**
 * Comprehensive configuration initialization
 */
function initializeG2NConfig() {
  const cache = CacheService.getUserCache();
  const cachedConfig = cache.get(G2N_CONFIG_CACHE_KEY);
  
  if (cachedConfig) {
    try {
      const parsedConfig = JSON.parse(cachedConfig);
      const validation = validateG2NConfiguration(parsedConfig);
      if (validation.isValid) {
        G2N_APP_CONFIG = parsedConfig;
        g2nInfo('Config', 'Configuration loaded from cache', {
          version: G2N_APP_CONFIG.SYSTEM.configVersion,
          mappings: G2N_APP_CONFIG.PROPERTY_MAPPINGS.metadata.mappingCount
        });
        return true;
      } else {
        g2nWarn('Config', 'Cached config validation failed, reloading from storage...', {
          issues: validation.issues
        });
      }
    } catch (e) {
      g2nWarn('Config', 'Cached config corrupted, reloading...', { error: e.message });
    }
  }
  
  return loadG2NConfigFromStorage();
}

/**
 * Load configuration from script properties with validation - FIXED for dynamic databases
 */
function loadG2NConfigFromStorage() {
  const startTime = g2nStartTimer();
  let hadError = false;
  let errorObj = null;
  
  g2nFunctionEntry('loadG2NConfigFromStorage');
  
  const props = PropertiesService.getUserProperties();
  
  g2nInfo('Config', 'Loading configuration from script properties');
  
  try {
    const constants = getAppConstants();
    
    G2N_APP_CONFIG.NOTION_API_KEY = props.getProperty(constants.STORAGE_KEYS.NOTION_API_KEY) || '';
    
    // Load database IDs but don't require them
    const gmailDbId = props.getProperty(constants.STORAGE_KEYS.GMAIL_DB_ID) || '';
    const resourcesDbId = props.getProperty(constants.STORAGE_KEYS.RESOURCES_DB_ID) || '';
    
    G2N_APP_CONFIG.DATABASES.gmail.id = gmailDbId;
    G2N_APP_CONFIG.DATABASES.resources.id = resourcesDbId;
    
    // Try to get database names if we have IDs but no names
    if (gmailDbId && (!G2N_APP_CONFIG.DATABASES.gmail.name || G2N_APP_CONFIG.DATABASES.gmail.name === 'Selected Database')) {
      try {
        // Check if NotionService is available
        if (typeof NotionService !== 'undefined') {
          const notionService = new NotionService();
          const database = notionService.verifyG2NDatabaseAccess(gmailDbId);
          G2N_APP_CONFIG.DATABASES.gmail.name = database.title?.[0]?.plain_text || 'Gmail Database';
        } else {
          G2N_APP_CONFIG.DATABASES.gmail.name = 'Gmail Database';
        }
      } catch (error) {
        console.warn('Could not fetch Gmail database name:', error);
        G2N_APP_CONFIG.DATABASES.gmail.name = 'Gmail Database';
      }
    }
    
    if (resourcesDbId && (!G2N_APP_CONFIG.DATABASES.resources.name || G2N_APP_CONFIG.DATABASES.resources.name === 'Selected Database')) {
      try {
        // Check if NotionService is available
        if (typeof NotionService !== 'undefined') {
          const notionService = new NotionService();
          const database = notionService.verifyG2NDatabaseAccess(resourcesDbId);
          G2N_APP_CONFIG.DATABASES.resources.name = database.title?.[0]?.plain_text || 'Resources Database';
        } else {
          G2N_APP_CONFIG.DATABASES.resources.name = 'Resources Database';
        }
      } catch (error) {
        console.warn('Could not fetch Resources database name:', error);
        G2N_APP_CONFIG.DATABASES.resources.name = 'Resources Database';
      }
    }
    
    // ENHANCE PROPERTY MAPPINGS LOADING
    const mappingsJson = props.getProperty(constants.STORAGE_KEYS.PROPERTY_MAPPINGS);
    if (mappingsJson) {
      try {
        const mappingsData = JSON.parse(mappingsJson);
        G2N_APP_CONFIG.PROPERTY_MAPPINGS = validateG2NMappingsData(mappingsData);
        g2nInfo('Config', 'Property mappings loaded', { 
          count: G2N_APP_CONFIG.PROPERTY_MAPPINGS.metadata?.mappingCount || 0 
        });
      } catch (e) {
        g2nError('Config', 'Failed to parse property mappings, using defaults', { error: e.message });
        G2N_APP_CONFIG.PROPERTY_MAPPINGS = { 
          mappings: {}, 
          metadata: { version: '1.0', lastUpdated: null, mappingCount: 0 } 
        };
      }
    } else {
      g2nWarn('Config', 'No property mappings found in storage, initializing empty');
      G2N_APP_CONFIG.PROPERTY_MAPPINGS = { 
        mappings: {}, 
        metadata: { version: '1.0', lastUpdated: new Date().toISOString(), mappingCount: 0 } 
      };
    }
    
    // === KEY VALIDATION - UPDATED FOR 50-CHARACTER KEYS ===
    if (G2N_APP_CONFIG.NOTION_API_KEY) {
      const trimmedKey = G2N_APP_CONFIG.NOTION_API_KEY.trim();
      
      // Check key format - accept both old and new formats
      const isNtnFormat = trimmedKey.startsWith('ntn_');
      const isSecretFormat = trimmedKey.startsWith('secret_');
      
      // Updated validation: ntn_ keys can be 44 (old) or 50 (new) characters
      // secret_ keys should be 43 characters (legacy)
      const isValidNtnKey = isNtnFormat && (trimmedKey.length === 44 || trimmedKey.length === 50);
      const isValidSecretKey = isSecretFormat && trimmedKey.length === 43;
      const isValid = isValidNtnKey || isValidSecretKey;
      
      G2N_APP_CONFIG.SYSTEM.keyValidation = {
        isValid: isValid,
        format: isNtnFormat ? 'ntn_' : (isSecretFormat ? 'secret_' : 'unknown'),
        lastValidated: new Date().toISOString(),
        keyLength: trimmedKey.length,
        expectedLength: isNtnFormat ? '44 or 50' : (isSecretFormat ? '43' : 'unknown'),
        version: isNtnFormat ? (trimmedKey.length === 50 ? 'new' : 'legacy') : 'legacy',
        details: isValid ? 
          `Valid ${isNtnFormat ? 'ntn_' : 'secret_'} key (${trimmedKey.length} chars)` 
          : 'Invalid key format or length'
      };
      
      if (!isValid) {
        g2nWarn('Config', 'API key validation failed', {
          keyPrefix: trimmedKey.substring(0, Math.min(8, trimmedKey.length)) + '...',
          length: trimmedKey.length,
          format: isNtnFormat ? 'ntn_' : (isSecretFormat ? 'secret_' : 'unknown'),
          expected: isNtnFormat ? '44 or 50 characters' : (isSecretFormat ? '43 characters' : 'unknown format')
        });
      } else {
        g2nInfo('Config', 'API key validation passed', {
          format: isNtnFormat ? 'ntn_' : 'secret_',
          length: trimmedKey.length,
          version: isNtnFormat ? (trimmedKey.length === 50 ? 'new' : 'legacy') : 'legacy'
        });
      }
    } else {
      G2N_APP_CONFIG.SYSTEM.keyValidation = {
        isValid: false,
        error: 'No API key configured',
        lastValidated: new Date().toISOString()
      };
    }
    // === END KEY VALIDATION ===
    
    G2N_APP_CONFIG.SYSTEM.initialized = true;
    G2N_APP_CONFIG.SYSTEM.lastConfigUpdate = new Date().toISOString();
    
    // Only require API key, not databases
    if (!G2N_APP_CONFIG.NOTION_API_KEY) {
      g2nError('Config', 'No Notion API key configured');
      return false;
    }
    
    cacheG2NConfig();
    
    g2nInfo('Config', 'Configuration loaded successfully from storage', {
      hasApiKey: !!G2N_APP_CONFIG.NOTION_API_KEY,
      gmailDb: !!G2N_APP_CONFIG.DATABASES.gmail.id,
      resourcesDb: !!G2N_APP_CONFIG.DATABASES.resources.id,
      mappingCount: G2N_APP_CONFIG.PROPERTY_MAPPINGS.metadata.mappingCount || 0,
      keyValid: G2N_APP_CONFIG.SYSTEM.keyValidation?.isValid || false
    });
    
    return true;
    
  } catch (error) {
    hadError = true;
    errorObj = error;
    g2nError('Config', 'Critical error loading configuration', { error: error.message });
    return false;
  } finally {
    g2nFunctionExit('loadG2NConfigFromStorage', { success: !hadError }, startTime);
  }
}

/**
 * Cache configuration for performance
 */
function cacheG2NConfig() {
  try {
    const cache = CacheService.getUserCache();
    cache.put(
      G2N_CONFIG_CACHE_KEY, 
      JSON.stringify(G2N_APP_CONFIG), 
      G2N_CONFIG_CACHE_EXPIRATION
    );
    g2nDebug('Config', 'Configuration cached successfully');
  } catch (error) {
    g2nError('Config', 'Failed to cache configuration', { error: error.message });
  }
}

/**
 * Clear cached configuration to force fresh load
 */
function clearG2NCache() {
  try {
    const cache = CacheService.getUserCache();
    cache.remove(G2N_CONFIG_CACHE_KEY);
    g2nInfo('Config', 'Configuration cache cleared');
    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    g2nError('Config', 'Failed to clear cache', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Get the current application configuration
 */
function getG2NConfig() {
  if (!G2N_APP_CONFIG.SYSTEM.initialized) {
    const success = initializeG2NConfig();
    if (!success) {
      g2nError('Config', 'Failed to initialize configuration');
      throw new Error('Configuration initialization failed');
    }
  }
  return G2N_APP_CONFIG;
}

/**
 * Get Notion API headers
 */
function getNotionAPIHeaders() {
  const config = getEnhancedG2NConfig();
  const constants = getAppConstants();
  
  if (!config.NOTION_API_KEY) {
    throw new Error(constants.ERRORS.API_KEY_INVALID);
  }
  
  return {
    'Authorization': `Bearer ${config.NOTION_API_KEY}`,
    'Notion-Version': constants.API.NOTION.VERSION,
    'Content-Type': 'application/json'
  };
}

/**
 * Initialize the Gmail to Notion integration
 */
function initializeG2NIntegration() {
  g2nInfo('Config', 'Initializing Gmail to Notion integration');
  
  try {
    // Clear any old cache first
    clearG2NCache();
    
    const success = initializeG2NConfig();
    
    if (success) {
      g2nInfo('Config', 'Gmail to Notion integration initialized successfully', {
        configVersion: G2N_APP_CONFIG.SYSTEM.configVersion,
        hasApiKey: !!G2N_APP_CONFIG.NOTION_API_KEY,
        hasGmailDb: !!G2N_APP_CONFIG.DATABASES.gmail.id,
        keyValid: G2N_APP_CONFIG.SYSTEM.keyValidation?.isValid || false
      });
    } else {
      g2nError('Config', 'Gmail to Notion integration initialization failed');
    }
    
    return success;
    
  } catch (error) {
    g2nError('Config', 'Critical error during integration initialization', { error: error.message });
    return false;
  }
}

/**
 * Get property mappings for a specific database
 */
function getG2NPropertyMappings(databaseId) {
  try {
    const config = getEnhancedG2NConfig();
    return config.PROPERTY_MAPPINGS.mappings[databaseId] || {};
  } catch (error) {
    g2nError('Config', 'Failed to get property mappings', { error: error.message });
    return {};
  }
}

/**
 * Auto-detect and setup property mappings
 */
function autoDetectG2NMappings() {
  try {
    const config = getEnhancedG2NConfig();
    const notionService = new NotionService();
    
    if (!config.DATABASES.gmail.id) {
      throw new Error('No Gmail database configured');
    }
    
    // Get database properties
    const database = notionService.verifyG2NDatabaseAccess(config.DATABASES.gmail.id);
    const properties = database.properties || {};
    
    // Create basic mappings
    const mappings = {};
    const constants = getAppConstants();
    const emailFields = constants.PROPERTY_MAPPINGS.EMAIL_FIELDS;
    
    // Try to auto-detect based on property names
    Object.keys(properties).forEach(propName => {
      const prop = properties[propName];
      const lowerName = propName.toLowerCase();
      
      // Auto-map based on common property names
      if (lowerName.includes('subject') || lowerName.includes('title') || lowerName.includes('name')) {
        mappings[propName] = {
          notionProperty: propName,
          notionType: prop.type,
          emailField: 'subject'
        };
      } else if (lowerName.includes('from') || lowerName.includes('sender')) {
        mappings[propName] = {
          notionProperty: propName,
          notionType: prop.type,
          emailField: 'sender'
        };
      } else if (lowerName.includes('date') || lowerName.includes('sent')) {
        mappings[propName] = {
          notionProperty: propName,
          notionType: prop.type,
          emailField: 'dateSent'
        };
      } else if (lowerName.includes('body') || lowerName.includes('content')) {
        mappings[propName] = {
          notionProperty: propName,
          notionType: prop.type,
          emailField: 'body'
        };
      } else if (lowerName.includes('link') || lowerName.includes('url')) {
        mappings[propName] = {
          notionProperty: propName,
          notionType: prop.type,
          emailField: 'gmailLink'
        };
      }
    });
    
    // Update config
    if (!config.PROPERTY_MAPPINGS.mappings) {
      config.PROPERTY_MAPPINGS.mappings = {};
    }
    config.PROPERTY_MAPPINGS.mappings[config.DATABASES.gmail.id] = mappings;
    config.PROPERTY_MAPPINGS.metadata = {
      lastUpdated: new Date().toISOString(),
      version: '1.0',
      databaseCount: 1,
      mappingCount: Object.keys(mappings).length
    };
    
    // Save to storage
    saveG2NConfigToStorage(config);
    
    g2nInfo('Config', 'Auto-detected property mappings', {
      databaseId: config.DATABASES.gmail.id,
      mappingCount: Object.keys(mappings).length
    });
    
    return {
      success: true,
      mappings: mappings,
      message: `Auto-detected ${Object.keys(mappings).length} property mappings`
    };
    
  } catch (error) {
    g2nError('Config', 'Failed to auto-detect mappings', { error: error.message });
    return {
      success: false,
      error: error.message
    };
  }
}

//=============================================================================
// DATABASE PERSISTENCE FUNCTIONS
// =============================================================================

/**
 * Enhanced database selection handler with persistence
 */
function handleG2NDatabaseSelection(databaseId, databaseName, databaseType = 'gmail') {
  const startTime = g2nStartTimer();
    let hadError = false;
    let errorObj = null;
  
  g2nFunctionEntry('handleG2NDatabaseSelection', {
    databaseId: databaseId,
    databaseName: databaseName,
    databaseType: databaseType
  });
  
  try {
    const constants = getAppConstants();
    
    // Validate database ID format
    if (!constants.PATTERNS.DATABASE_ID.test(databaseId)) {
      throw new Error('Invalid database ID format');
    }
    
    // Update configuration
    if (databaseType === 'gmail') {
      G2N_APP_CONFIG.DATABASES.gmail.id = databaseId;
      G2N_APP_CONFIG.DATABASES.gmail.name = databaseName;
      G2N_APP_CONFIG.DATABASES.gmail.lastVerified = new Date().toISOString();
    } else if (databaseType === 'resources') {
      G2N_APP_CONFIG.DATABASES.resources.id = databaseId;
      G2N_APP_CONFIG.DATABASES.resources.name = databaseName;
      G2N_APP_CONFIG.DATABASES.resources.lastVerified = new Date().toISOString();
    }
    
    // Save to persistent storage
    const saveResult = saveG2NConfigToStorage(G2N_APP_CONFIG);
    
    if (!saveResult.success) {
      throw new Error(`Failed to save database selection: ${saveResult.error}`);
    }
    
    g2nInfo('DatabaseSelection', `Database ${databaseType} set successfully`, {
      databaseId: databaseId,
      databaseName: databaseName,
      databaseType: databaseType
    });
    
    return {
      success: true,
      message: `✅ ${databaseType === 'gmail' ? 'Gmail' : 'Resources'} database set to: ${databaseName}`,
      database: {
        id: databaseId,
        name: databaseName,
        type: databaseType
      }
    };
    
  } catch (error) {
    g2nError('DatabaseSelection', 'Failed to handle database selection', {
      error: error.message,
      databaseId: databaseId,
      databaseType: databaseType,
      duration: new Date().getTime() - startTime
    });
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    g2nFunctionExit('handleG2NDatabaseSelection', { success: !hadError }, startTime);
  }
}

function saveG2NConfigSettings(settings) {
  const startTime = g2nStartTimer();
  let hadError = false;
  
  g2nFunctionEntry('saveG2NConfigSettings', {
    settingsKeys: Object.keys(settings || {}),
    hasApiKey: !!(settings && settings.apiKey),
    hasGmailDb: !!(settings && settings.gmailDb),
    hasResourcesDb: !!(settings && settings.resourcesDb)
  });
  
  try {
    const constants = getAppConstants();
    const config = getEnhancedG2NConfig();
    
    g2nInfo('Config', 'Saving configuration settings', {
      settingsProvided: Object.keys(settings || {}).length
    });
    
    // Validate input
    if (!settings || typeof settings !== 'object') {
      throw new Error('No settings provided for saving');
    }
    
    // Update API Key if provided
    if (settings.apiKey !== undefined) {
      const trimmedKey = settings.apiKey.trim();
      
      // Enhanced API key validation for 50-character keys
      const isNtnFormat = trimmedKey.startsWith('ntn_');
      const isSecretFormat = trimmedKey.startsWith('secret_');
      
      if (!isNtnFormat && !isSecretFormat) {
        throw new Error('Invalid Notion API key format. Must start with "ntn_" or "secret_"');
      }
      
      if (isNtnFormat && trimmedKey.length !== 44 && trimmedKey.length !== 50) {
        throw new Error(`Invalid ntn_ key length: expected 44 or 50 characters, got ${trimmedKey.length}`);
      }
      
      if (isSecretFormat && trimmedKey.length !== 43) {
        throw new Error(`Invalid secret_ key length: expected 43 characters, got ${trimmedKey.length}`);
      }
      
      config.NOTION_API_KEY = trimmedKey;
      g2nInfo('Config', 'API key updated', {
        keyType: isNtnFormat ? 'ntn_' : 'secret_',
        keyLength: trimmedKey.length
      });
    }
    
    // Update Gmail Database if provided
    if (settings.gmailDb !== undefined) {
      const trimmedDbId = settings.gmailDb.trim();
      
      if (trimmedDbId && !constants.PATTERNS.DATABASE_ID.test(trimmedDbId)) {
        throw new Error('Invalid Gmail database ID format');
      }
      
      config.DATABASES.gmail.id = trimmedDbId;
      
      // Try to get database name if we have API access
      if (trimmedDbId && config.NOTION_API_KEY) {
        try {
          const notionService = new NotionService();
          const dbInfo = notionService.verifyG2NDatabaseAccess(trimmedDbId);
          config.DATABASES.gmail.name = dbInfo.title[0]?.plain_text || 'Unknown Database';
          config.DATABASES.gmail.propertyCount = Object.keys(dbInfo.properties || {}).length;
          config.DATABASES.gmail.lastVerified = new Date().toISOString();
          
          g2nInfo('Config', 'Gmail database verified and updated', {
            databaseName: config.DATABASES.gmail.name,
            propertyCount: config.DATABASES.gmail.propertyCount
          });
        } catch (dbError) {
          g2nWarn('Config', 'Could not verify Gmail database, saving ID only', {
            databaseId: trimmedDbId,
            error: dbError.message
          });
          config.DATABASES.gmail.name = 'Unverified Database';
        }
      }
    }
    
    // Update Resources Database if provided
    if (settings.resourcesDb !== undefined) {
      const trimmedDbId = settings.resourcesDb.trim();
      
      if (trimmedDbId && !constants.PATTERNS.DATABASE_ID.test(trimmedDbId)) {
        throw new Error('Invalid Resources database ID format');
      }
      
      config.DATABASES.resources.id = trimmedDbId;
      
      // Try to get database name if we have API access
      if (trimmedDbId && config.NOTION_API_KEY) {
        try {
          const notionService = new NotionService();
          const dbInfo = notionService.verifyG2NDatabaseAccess(trimmedDbId);
          config.DATABASES.resources.name = dbInfo.title[0]?.plain_text || 'Unknown Database';
          config.DATABASES.resources.propertyCount = Object.keys(dbInfo.properties || {}).length;
          config.DATABASES.resources.lastVerified = new Date().toISOString();
          
          g2nInfo('Config', 'Resources database verified and updated', {
            databaseName: config.DATABASES.resources.name,
            propertyCount: config.DATABASES.resources.propertyCount
          });
        } catch (dbError) {
          g2nWarn('Config', 'Could not verify Resources database, saving ID only', {
            databaseId: trimmedDbId,
            error: dbError.message
          });
          config.DATABASES.resources.name = 'Unverified Database';
        }
      }
    }
    
    // Update settings if provided
    if (settings.settings && typeof settings.settings === 'object') {
      Object.keys(settings.settings).forEach(key => {
        if (settings.settings[key] !== undefined) {
          config.SETTINGS[key] = settings.settings[key];
        }
      });
      g2nInfo('Config', 'Application settings updated', {
        settingsUpdated: Object.keys(settings.settings).length
      });
    }
    
    // Save to persistent storage
    const saveResult = saveG2NConfigToStorage(config);
    
    if (!saveResult.success) {
      throw new Error(`Failed to save configuration to storage: ${saveResult.error}`);
    }
    
    g2nInfo('Config', 'Configuration settings saved successfully', {
      apiKeyUpdated: settings.apiKey !== undefined,
      gmailDbUpdated: settings.gmailDb !== undefined,
      resourcesDbUpdated: settings.resourcesDb !== undefined,
      settingsUpdated: !!(settings.settings)
    });
    
    g2nPerf('Config', 'Configuration settings save', startTime, {
      success: true
    });
    
    return {
      success: true,
      message: constants.UI.MESSAGES.SETTINGS_SAVED_SUCCESS,
      config: {
        hasApiKey: !!config.NOTION_API_KEY,
        hasGmailDb: !!config.DATABASES.gmail.id,
        hasResourcesDb: !!config.DATABASES.resources.id
      }
    };
    
  } catch (error) {
    hadError = true;
    g2nError('Config', 'Failed to save configuration settings', {
      error: error.message,
      duration: new Date().getTime() - startTime
    });
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    g2nFunctionExit('saveG2NConfigSettings', { success: !hadError }, startTime);
  }
}

/**
 * Emergency database fetch function - no dependencies
 */
function emergencyFetchDatabases() {
  console.log('🚨 Emergency database fetch...');
  
  try {
    const config = getEnhancedG2NConfig();
    const url = 'https://api.notion.com/v1/search';
    const constants = getAppConstants();
    
    const headers = {
      'Authorization': `Bearer ${config.NOTION_API_KEY}`,
      'Notion-Version': constants.API.NOTION.VERSION,
      'Content-Type': 'application/json'
    };
    
    const payload = {
      filter: { property: 'object', value: 'database' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' }
    };
    
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: headers,
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const databases = data.results.map(db => {
        let dbName = 'Untitled Database';
        if (db.title && db.title.length > 0 && db.title[0].plain_text) {
          dbName = db.title[0].plain_text;
        } else if (db.id) {
          dbName = `Database (${db.id.substring(0, 8)}...)`;
        }
        return { name: dbName, id: db.id };
      });
      
      console.log(`✅ Emergency fetch found ${databases.length} databases`);
      return databases;
    } else {
      throw new Error(`HTTP ${response.getResponseCode()}: ${response.getContentText()}`);
    }
    
  } catch (error) {
    console.error('❌ Emergency database fetch failed:', error);
    return [];
  }
}

/**
 * Enhanced database verification with persistence awareness
 */
function verifyAndPersistG2NDatabase(databaseId, databaseType = 'gmail') {
  const startTime = g2nStartTimer();
    let hadError = false;
    let errorObj = null;
  
  g2nFunctionEntry('verifyAndPersistG2NDatabase', {
    databaseId: databaseId,
    databaseType: databaseType
  });
  
  try {
    const notionService = new NotionService();
    
    // Verify database access
    const databaseInfo = notionService.verifyG2NDatabaseAccess(databaseId);
    const databaseName = databaseInfo.title[0]?.plain_text || 'Untitled Database';
    
    // Persist the verified database
    const persistResult = handleG2NDatabaseSelection(databaseId, databaseName, databaseType);
    
    if (!persistResult.success) {
      throw new Error(`Persistence failed: ${persistResult.error}`);
    }
    
    g2nInfo('DatabaseVerification', 'Database verified and persisted', {
      databaseId: databaseId,
      databaseName: databaseName,
      databaseType: databaseType,
      propertyCount: Object.keys(databaseInfo.properties || {}).length
    });
    
    return {
      success: true,
      database: databaseInfo,
      persistence: persistResult
    };
    
  } catch (error) {
    g2nError('DatabaseVerification', 'Database verification failed', {
      error: error.message,
      databaseId: databaseId,
      databaseType: databaseType,
      duration: new Date().getTime() - startTime
    });
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    g2nFunctionExit('verifyAndPersistG2NDatabase', { success: !hadError }, startTime);
  }
}

/**
 * Enhanced property mapping storage with persistence
 */
function saveG2NPropertyMappings(databaseId, mappings) {
  const startTime = g2nStartTimer();
    let hadError = false;
    let errorObj = null;
  
  g2nFunctionEntry('saveG2NPropertyMappings', {
    databaseId: databaseId,
    mappingCount: Object.keys(mappings || {}).length
  });
  
  try {
    const constants = getAppConstants();
    const config = getEnhancedG2NConfig();
    
    // Validate input
    if (!databaseId || !constants.PATTERNS.DATABASE_ID.test(databaseId)) {
      throw new Error('Invalid database ID');
    }
    
    if (!mappings || typeof mappings !== 'object') {
      throw new Error('Invalid mappings object');
    }
    
    // Initialize property mappings structure if needed
    if (!config.PROPERTY_MAPPINGS.mappings) {
      config.PROPERTY_MAPPINGS.mappings = {};
    }
    
    // Save mappings for this database
    config.PROPERTY_MAPPINGS.mappings[databaseId] = mappings;
    
    // Update metadata
    config.PROPERTY_MAPPINGS.metadata = {
      version: '2.0',
      lastUpdated: new Date().toISOString(),
      databaseCount: Object.keys(config.PROPERTY_MAPPINGS.mappings).length,
      mappingCount: Object.keys(mappings).length
    };
    
    // Save to persistent storage
    const saveResult = saveG2NConfigToStorage(config);
    
    if (!saveResult.success) {
      throw new Error(`Failed to save property mappings: ${saveResult.error}`);
    }
    
    g2nInfo('PropertyMappings', 'Property mappings saved successfully', {
      databaseId: databaseId,
      mappingCount: Object.keys(mappings).length,
      totalDatabases: config.PROPERTY_MAPPINGS.metadata.databaseCount
    });
    
    return {
      success: true,
      message: `✅ Property mappings saved for database`,
      metadata: config.PROPERTY_MAPPINGS.metadata
    };
    
  } catch (error) {
    g2nError('PropertyMappings', 'Failed to save property mappings', {
      error: error.message,
      databaseId: databaseId,
      duration: new Date().getTime() - startTime
    });
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    g2nFunctionExit('saveG2NPropertyMappings', { success: !hadError }, startTime);
  }
}

/**
 * Load property mappings for a specific database
 */
function loadG2NPropertyMappings(databaseId) {
  const startTime = g2nStartTimer();
    let hadError = false;
    let errorObj = null;
  
  g2nFunctionEntry('loadG2NPropertyMappings', {
    databaseId: databaseId
  });
  
  try {
    const config = getEnhancedG2NConfig();
    
    if (!config.PROPERTY_MAPPINGS.mappings || !config.PROPERTY_MAPPINGS.mappings[databaseId]) {
      g2nInfo('PropertyMappings', 'No saved mappings found for database', {
        databaseId: databaseId
      });
      return {};
    }
    
    const mappings = config.PROPERTY_MAPPINGS.mappings[databaseId];
    
    g2nInfo('PropertyMappings', 'Property mappings loaded', {
      databaseId: databaseId,
      mappingCount: Object.keys(mappings).length
    });
    
    return mappings;
    
  } catch (error) {
    g2nError('PropertyMappings', 'Failed to load property mappings', {
      error: error.message,
      databaseId: databaseId,
      duration: new Date().getTime() - startTime
    });
    
    return {};
  } finally {
    g2nFunctionExit('loadG2NPropertyMappings', { success: !hadError }, startTime);
  }
}
// Add this function to Config.js (after existing functions)
/**
 * Enhanced property mapping system with automatic persistence
 */
function getOrCreatePropertyMappings(databaseId, emailFields) {
  const startTime = g2nStartTimer();
  let hadError = false;
  
  g2nFunctionEntry('getOrCreatePropertyMappings', {
    databaseId: databaseId,
    emailFields: Object.keys(emailFields || {})
  });
  
  try {
    if (!databaseId) {
      throw new Error('Database ID is required');
    }
    
    // 1. Try to load existing mappings
    let mappings = loadG2NPropertyMappings(databaseId);
    
    // 2. If no mappings exist, auto-detect or create default mappings
    if (!mappings || Object.keys(mappings).length === 0) {
      console.log('🔄 No existing mappings found, auto-detecting...');
      
      const autoDetectResult = autoDetectG2NMappings();
      if (autoDetectResult.success) {
        mappings = autoDetectResult.mappings;
        console.log(`✅ Auto-detected ${Object.keys(mappings).length} mappings`);
      } else {
        // Create basic default mappings
        mappings = createDefaultMappings(databaseId, emailFields);
        console.log(`✅ Created ${Object.keys(mappings).length} default mappings`);
      }
      
      // Save the newly created mappings
      saveG2NPropertyMappings(databaseId, mappings);
    }
    
    // 3. Ensure required properties exist
    const constants = getAppConstants();
    const enhancedMappings = ensureRequiredMappings(mappings, databaseId, emailFields, constants);
    
    if (enhancedMappings !== mappings) {
      // Save enhanced mappings if they were modified
      saveG2NPropertyMappings(databaseId, enhancedMappings);
      mappings = enhancedMappings;
    }
    
    g2nInfo('PropertyMappings', 'Property mappings retrieved/created', {
      databaseId: databaseId,
      mappingCount: Object.keys(mappings).length,
      hasRequired: checkRequiredMappings(mappings)
    });
    
    return mappings;
    
  } catch (error) {
    hadError = true;
    g2nError('PropertyMappings', 'Failed to get or create property mappings', {
      error: error.message,
      databaseId: databaseId,
      duration: new Date().getTime() - startTime
    });
    
    // Return empty mappings as fallback
    return {};
  } finally {
    g2nFunctionExit('getOrCreatePropertyMappings', { success: !hadError }, startTime);
  }
}

/**
 * Create default property mappings based on email fields
 */
function createDefaultMappings(databaseId, emailFields) {
  const mappings = {};
  const constants = getAppConstants();
  
  // Basic default mappings
  if (emailFields.subject) {
    mappings.subject = {
      notionProperty: 'Name',
      notionType: 'title',
      emailField: 'subject',
      isDefault: true
    };
  }
  
  if (emailFields.sender) {
    mappings.sender = {
      notionProperty: 'From',
      notionType: 'rich_text',
      emailField: 'sender',
      isDefault: true
    };
  }
  
  if (emailFields.dateSent) {
    mappings.dateSent = {
      notionProperty: 'Date',
      notionType: 'date',
      emailField: 'dateSent',
      isDefault: true
    };
  }
  
  if (emailFields.gmailLink) {
    mappings.gmailLink = {
      notionProperty: 'Gmail Link',
      notionType: 'url',
      emailField: 'gmailLink',
      isRequired: true,
      isDefault: true
    };
  }
  
  if (emailFields.messageId) {
    mappings.uniqueMessageId = {
      notionProperty: 'Unique Message ID',
      notionType: 'rich_text',
      emailField: 'uniqueMessageId',
      isRequired: true,
      isDefault: true
    };
  }
  
  // Add metadata
  mappings._metadata = {
    databaseId: databaseId,
    createdAt: new Date().toISOString(),
    version: '1.0',
    isDefault: true,
    source: 'auto_created'
  };
  
  return mappings;
}

/**
 * Ensure required mappings exist
 */
function ensureRequiredMappings(mappings, databaseId, emailFields, constants) {
  const requiredMappings = constants.PROPERTIES.REQUIRED_PROPERTIES || [];
  let modified = false;
  const enhancedMappings = { ...mappings };
  
  // Remove metadata before checking
  const { _metadata, ...mappingProps } = enhancedMappings;
  
  for (const required of requiredMappings) {
    const mappingExists = Object.values(mappingProps).some(
      mapping => mapping.emailField === required.id || mapping.notionProperty === required.name
    );
    
    if (!mappingExists && emailFields[required.id]) {
      // Add missing required mapping
      enhancedMappings[required.id] = {
        notionProperty: required.name,
        notionType: required.notionType,
        emailField: required.id,
        isRequired: true,
        autoCreated: true
      };
      modified = true;
    }
  }
  
  if (modified) {
    enhancedMappings._metadata = {
      ...(enhancedMappings._metadata || {}),
      lastUpdated: new Date().toISOString(),
      enhanced: true
    };
  }
  
  return modified ? enhancedMappings : mappings;
}

/**
 * Check if required mappings exist
 */
function checkRequiredMappings(mappings) {
  const constants = getAppConstants();
  const requiredMappings = constants.PROPERTIES.REQUIRED_PROPERTIES || [];
  const { _metadata, ...mappingProps } = mappings;
  
  const results = {};
  for (const required of requiredMappings) {
    results[required.id] = Object.values(mappingProps).some(
      mapping => mapping.emailField === required.id || mapping.notionProperty === required.name
    );
  }
  
  return results;
}

// Update the saveG2NPropertyMappings function to include better persistence:
/**
 * Enhanced property mapping storage with better persistence
 */
function saveG2NPropertyMappings(databaseId, mappings) {
  const startTime = g2nStartTimer();
  let hadError = false;
  
  g2nFunctionEntry('saveG2NPropertyMappings', {
    databaseId: databaseId,
    mappingCount: Object.keys(mappings || {}).length
  });
  
  try {
    const config = getEnhancedG2NConfig();
    
    // Validate input
    if (!databaseId) {
      throw new Error('Database ID is required');
    }
    
    if (!mappings || typeof mappings !== 'object') {
      throw new Error('Invalid mappings object');
    }
    
    // Initialize structure if needed
    if (!config.PROPERTY_MAPPINGS) {
      config.PROPERTY_MAPPINGS = {
        mappings: {},
        metadata: {}
      };
    }
    
    if (!config.PROPERTY_MAPPINGS.mappings) {
      config.PROPERTY_MAPPINGS.mappings = {};
    }
    
    // Add metadata to mappings
    const enhancedMappings = {
      ...mappings,
      _metadata: {
        ...(mappings._metadata || {}),
        databaseId: databaseId,
        lastUpdated: new Date().toISOString(),
        mappingCount: Object.keys(mappings).filter(key => key !== '_metadata').length
      }
    };
    
    // Save to config
    config.PROPERTY_MAPPINGS.mappings[databaseId] = enhancedMappings;
    
    // Update global metadata
    config.PROPERTY_MAPPINGS.metadata = {
      version: '2.0',
      lastUpdated: new Date().toISOString(),
      databaseCount: Object.keys(config.PROPERTY_MAPPINGS.mappings).length,
      totalMappings: Object.values(config.PROPERTY_MAPPINGS.mappings).reduce(
        (total, dbMappings) => total + Object.keys(dbMappings).filter(key => key !== '_metadata').length, 0
      )
    };
    
    // Save to ALL storage locations for redundancy
    const saveResults = [];
    
    // 1. Save to Script Properties (primary)
    const scriptProperties = PropertiesService.getScriptProperties();
    scriptProperties.setProperty(`PROPERTY_MAPPINGS_${databaseId}`, JSON.stringify(enhancedMappings));
    saveResults.push({ type: 'script_properties', success: true });
    
    // 2. Save to User Properties (backup)
    const userProperties = PropertiesService.getUserProperties();
    userProperties.setProperty(`PROPERTY_MAPPINGS_${databaseId}`, JSON.stringify(enhancedMappings));
    saveResults.push({ type: 'user_properties', success: true });
    
    // 3. Save to memory cache (for performance)
    const cache = CacheService.getScriptCache();
    cache.put(`mappings_${databaseId}`, JSON.stringify(enhancedMappings), 3600);
    saveResults.push({ type: 'cache', success: true });
    
    // 4. Save to enhanced config storage
    const configSaveResult = saveG2NConfigToStorage(config);
    saveResults.push({ type: 'config_storage', success: configSaveResult.success });
    
    g2nInfo('PropertyMappings', 'Property mappings saved with redundancy', {
      databaseId: databaseId,
      mappingCount: Object.keys(enhancedMappings).filter(key => key !== '_metadata').length,
      storageTypes: saveResults.length,
      successfulSaves: saveResults.filter(r => r.success).length
    });
    
    return {
      success: true,
      message: `✅ Property mappings saved for database (${databaseId.substring(0, 8)}...)`,
      metadata: config.PROPERTY_MAPPINGS.metadata,
      storageResults: saveResults
    };
    
  } catch (error) {
    hadError = true;
    g2nError('PropertyMappings', 'Failed to save property mappings', {
      error: error.message,
      databaseId: databaseId,
      duration: new Date().getTime() - startTime
    });
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    g2nFunctionExit('saveG2NPropertyMappings', { success: !hadError }, startTime);
  }
}

// Update the loadG2NPropertyMappings function:
/**
 * Load property mappings with multiple fallback sources
 */
function loadG2NPropertyMappings(databaseId) {
  const startTime = g2nStartTimer();
  let hadError = false;
  
  g2nFunctionEntry('loadG2NPropertyMappings', {
    databaseId: databaseId
  });
  
  try {
    if (!databaseId) {
      return {};
    }
    
    // Try multiple sources in order of preference
    const sources = [
      { name: 'memory_cache', load: () => loadFromMemoryCache(databaseId) },
      { name: 'script_properties', load: () => loadFromScriptProperties(databaseId) },
      { name: 'user_properties', load: () => loadFromUserProperties(databaseId) },
      { name: 'config_object', load: () => loadFromConfigObject(databaseId) }
    ];
    
    for (const source of sources) {
      try {
        const mappings = source.load();
        if (mappings && Object.keys(mappings).length > 0) {
          g2nInfo('PropertyMappings', `Mappings loaded from ${source.name}`, {
            databaseId: databaseId,
            mappingCount: Object.keys(mappings).filter(key => key !== '_metadata').length,
            source: source.name
          });
          
          // Cache in memory for next time
          cacheMappingsInMemory(databaseId, mappings);
          
          return mappings;
        }
      } catch (error) {
        g2nDebug('PropertyMappings', `Failed to load from ${source.name}`, {
          error: error.message
        });
      }
    }
    
    g2nInfo('PropertyMappings', 'No saved mappings found for database', {
      databaseId: databaseId
    });
    
    return {};
    
  } catch (error) {
    g2nError('PropertyMappings', 'Failed to load property mappings', {
      error: error.message,
      databaseId: databaseId,
      duration: new Date().getTime() - startTime
    });
    
    return {};
  } finally {
    g2nFunctionExit('loadG2NPropertyMappings', { success: !hadError }, startTime);
  }
}

// Helper functions for loading from different sources
function loadFromMemoryCache(databaseId) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(`mappings_${databaseId}`);
  if (cached) {
    return JSON.parse(cached);
  }
  return null;
}

function loadFromScriptProperties(databaseId) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const mappingsJson = scriptProperties.getProperty(`PROPERTY_MAPPINGS_${databaseId}`);
  if (mappingsJson) {
    return JSON.parse(mappingsJson);
  }
  return null;
}

function loadFromUserProperties(databaseId) {
  const userProperties = PropertiesService.getUserProperties();
  const mappingsJson = userProperties.getProperty(`PROPERTY_MAPPINGS_${databaseId}`);
  if (mappingsJson) {
    return JSON.parse(mappingsJson);
  }
  return null;
}

function loadFromConfigObject(databaseId) {
  const config = getEnhancedG2NConfig();
  if (config.PROPERTY_MAPPINGS && config.PROPERTY_MAPPINGS.mappings && config.PROPERTY_MAPPINGS.mappings[databaseId]) {
    return config.PROPERTY_MAPPINGS.mappings[databaseId];
  }
  return null;
}

function cacheMappingsInMemory(databaseId, mappings) {
  try {
    const cache = CacheService.getScriptCache();
    cache.put(`mappings_${databaseId}`, JSON.stringify(mappings), 3600);
  } catch (error) {
    // Silent fail - caching is optional
  }
}
initializeG2NIntegration();

//=============================================================================
// TEST FUNCTIONS
// =============================================================================

/**
 * Test NotionService availability
 */
function testNotionService() {
  try {
    if (typeof NotionService === 'undefined') {
      console.error('❌ NotionService is NOT defined');
      return false;
    }
    
    const service = new NotionService();
    console.log('✅ NotionService is available and can be instantiated');
    return true;
    
  } catch (error) {
    console.error('❌ NotionService test failed:', error);
    return false;
  }
}

function debugDatabaseRevertion() {
  console.log('🔍 DEBUG: Database Reversion Tracking');
  
  try {
    // Track the database state through the entire flow
    console.log('1. INITIAL STATE:');
    const initialConfig = getEnhancedG2NConfig();
    console.log('   Database:', initialConfig.DATABASES.gmail);
    
    // Simulate what happens during a save
    console.log('2. SIMULATING SAVE OPERATION...');
    
    // This is what happens during unifiedSaveToNotion
    const emailService = getGmailService();
    const emailData = emailService.getSelectedEmailWithRecovery();
    console.log('   Email data retrieved:', !!emailData);
    
    // Check config after email operation
    const afterEmailConfig = getEnhancedG2NConfig();
    console.log('3. AFTER EMAIL OPERATION:');
    console.log('   Database:', afterEmailConfig.DATABASES.gmail);
    
    // Check if they're different
    const changed = initialConfig.DATABASES.gmail.id !== afterEmailConfig.DATABASES.gmail.id;
    console.log('4. DATABASE CHANGED:', changed);
    
    if (changed) {
      console.log('🚨 DATABASE REVERTED DURING OPERATION!');
      console.log('   Before:', initialConfig.DATABASES.gmail.id);
      console.log('   After:', afterEmailConfig.DATABASES.gmail.id);
    }
    
    return {
      reverted: changed,
      initial: initialConfig.DATABASES.gmail,
      final: afterEmailConfig.DATABASES.gmail
    };
    
  } catch (error) {
    console.error('Debug failed:', error);
    return { error: error.message };
  }
}
function trackWinterDatabase() {
  console.log('🔍 TRACKING: Where does "Winter" database go?');
  
  try {
    const props = PropertiesService.getUserProperties();
    
    // Check current state
    console.log('1. CURRENT STATE:');
    const currentConfig = getEnhancedG2NConfig();
    console.log('   Database:', currentConfig.DATABASES.gmail);
    
    // Check script properties directly
    console.log('2. SCRIPT PROPERTIES:');
    const gmailDbId = props.getProperty('GMAIL_DB_ID');
    console.log('   GMAIL_DB_ID:', gmailDbId);
    
    // Check ALL properties for "Winter" reference
    console.log('3. SEARCHING FOR "WINTER" DATABASE:');
    const allProps = props.getProperties();
    let foundWinter = false;
    
    Object.keys(allProps).forEach(key => {
      const value = allProps[key];
      if (value && value.includes('Winter')) {
        console.log('   🎯 FOUND WINTER:', key, '=', value);
        foundWinter = true;
      }
      if (value && (value.includes('28fcde21-8dc3-80c3-98b3-f8005efc6263') || value.includes('2a2cde21'))) {
        console.log('   📍 DATABASE ID:', key, '=', value);
      }
    });
    
    if (!foundWinter) {
      console.log('   ❌ NO "WINTER" DATABASE FOUND IN STORAGE');
    }
    
    // Check if there's a default database being loaded somewhere
    console.log('4. CHECKING FOR DEFAULT DATABASE OVERRIDE:');
    const defaultDbUsed = currentConfig.DATABASES.gmail.name === 'Gmail Database';
    console.log('   Using default name:', defaultDbUsed);
    
    return {
      currentDatabase: currentConfig.DATABASES.gmail,
      scriptGmailId: gmailDbId,
      foundWinter: foundWinter,
      usingDefaultName: defaultDbUsed
    };
    
  } catch (error) {
    console.error('Tracking failed:', error);
    return { error: error.message };
  }
}
function testDatabaseSelection() {
  console.log('🧪 TESTING DATABASE SELECTION...');
  
  try {
    // Simulate selecting "Winter" database
    const winterDbId = '2a2cde21-8dc3-8135-9d1b-f647fa558a29'; // This should be Winter's ID
    const winterDbName = 'Winter';
    
    console.log('🎯 SELECTING DATABASE:', { id: winterDbId, name: winterDbName });
    
    // Manually update the config as if selection happened
    const config = getEnhancedG2NConfig();
    config.DATABASES.gmail.id = winterDbId;
    config.DATABASES.gmail.name = winterDbName;
    config.DATABASES.gmail.lastVerified = new Date().toISOString();
    
    console.log('📝 UPDATED CONFIG:', config.DATABASES.gmail);
    
    // Save it
    const saveResult = saveG2NConfigToStorage(config);
    console.log('💾 SAVE RESULT:', saveResult);
    
    // Verify
    const verifyConfig = getEnhancedG2NConfig();
    console.log('🔍 VERIFICATION:', {
      expected: winterDbId,
      actual: verifyConfig.DATABASES.gmail.id,
      matches: verifyConfig.DATABASES.gmail.id === winterDbId
    });
    
    return {
      success: verifyConfig.DATABASES.gmail.id === winterDbId,
      before: { id: '28fcde21-8dc3-80c3-98b3-f8005efc6263', name: 'Gmail Database' },
      after: verifyConfig.DATABASES.gmail
    };
    
  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Quick test to set Winter as main database
 */
function setWinterAsMainDatabase() {
  console.log('🎯 SETTING WINTER AS MAIN DATABASE...');
  
  try {
    const winterDbId = '2a2cde21-8dc3-8135-9d1b-f647fa558a29';
    const winterDbName = 'Winter';
    
    const config = getEnhancedG2NConfig();
    config.DATABASES.gmail.id = winterDbId;
    config.DATABASES.gmail.name = winterDbName;
    
    saveG2NConfigToStorage(config);
    
    // Verify
    const verifyConfig = getEnhancedG2NConfig();
    console.log('✅ SET WINTER AS MAIN:', {
      success: verifyConfig.DATABASES.gmail.id === winterDbId,
      database: verifyConfig.DATABASES.gmail
    });
    
    return {
      success: verifyConfig.DATABASES.gmail.id === winterDbId,
      database: verifyConfig.DATABASES.gmail
    };
    
  } catch (error) {
    console.error('Failed to set Winter:', error);
    return { success: false, error: error.message };
  }
}

// In Config.js - Add test function
/**
 * Test property mapping persistence
 */
function testMappingPersistence() {
  console.log('🧪 Testing property mapping persistence...');
  
  try {
    const config = getEnhancedG2NConfig();
    
    if (!config.DATABASES.gmail.id) {
      console.error('❌ No database configured');
      return { success: false, error: 'No database configured' };
    }
    
    const databaseId = config.DATABASES.gmail.id;
    
    // Create test mappings
    const testMappings = {
      subject: {
        notionProperty: 'Name',
        notionType: 'title',
        emailField: 'subject',
        test: true
      },
      sender: {
        notionProperty: 'From', 
        notionType: 'rich_text',
        emailField: 'sender',
        test: true
      },
      _metadata: {
        testId: 'test_' + Date.now(),
        createdAt: new Date().toISOString()
      }
    };
    
    // Save test mappings
    console.log('💾 Saving test mappings...');
    const saveResult = saveG2NPropertyMappings(databaseId, testMappings);
    
    if (!saveResult.success) {
      throw new Error(`Save failed: ${saveResult.error}`);
    }
    
    // Wait a bit
    Utilities.sleep(1000);
    
    // Load test mappings
    console.log('📖 Loading test mappings...');
    const loadedMappings = loadG2NPropertyMappings(databaseId);
    
    // Verify
    const subjectMatch = loadedMappings.subject && loadedMappings.subject.notionProperty === 'Name';
    const senderMatch = loadedMappings.sender && loadedMappings.sender.notionProperty === 'From';
    
    console.log('🔍 Verification:', {
      savedSubject: testMappings.subject.notionProperty,
      loadedSubject: loadedMappings.subject ? loadedMappings.subject.notionProperty : 'none',
      savedSender: testMappings.sender.notionProperty,
      loadedSender: loadedMappings.sender ? loadedMappings.sender.notionProperty : 'none',
      subjectMatch: subjectMatch,
      senderMatch: senderMatch
    });
    
    const success = subjectMatch && senderMatch;
    
    return {
      success: success,
      saved: testMappings,
      loaded: loadedMappings,
      match: { subject: subjectMatch, sender: senderMatch }
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}