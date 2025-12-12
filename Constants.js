// Constants.gs TEST
// =============================================================================
// GMAIL TO NOTION INTEGRATION - CONSTANTS FILE
// =============================================================================

// ADD THESE MISSING CONSTANTS AT THE TOP:
const G2N_CONFIG_CACHE_KEY = 'g2n_config_v3';
const G2N_CONFIG_CACHE_EXPIRATION = 300; // 5 minutes in seconds


/**
 * SAFE LOGGING FALLBACKS
 * Ensures logging functions exist even if Logger.gs hasn't loaded
 */
if (typeof g2nInfo === 'undefined') {
  var g2nInfo = function(source, message, details) {
    console.log('[INFO] [' + source + '] ' + message, details || '');
  };
}

if (typeof g2nError === 'undefined') {
  var g2nError = function(source, message, details) {
    console.error('[ERROR] [' + source + '] ' + message, details || '');
  };
}

if (typeof g2nWarn === 'undefined') {
  var g2nWarn = function(source, message, details) {
    console.warn('[WARN] [' + source + '] ' + message, details || '');
  };
}

if (typeof g2nDebug === 'undefined') {
  var g2nDebug = function(source, message, details) {
    console.log('[DEBUG] [' + source + '] ' + message, details || '');
  };
}

/**
 * CORE APPLICATION CONSTANTS
 * Centralized configuration for Gmail to Notion integration
 */
const APP_CONSTANTS = {
  
  // ===========================================================================
  // APPLICATION METADATA
  // ===========================================================================
  APP: {
    VERSION: '2.1.0',
    NAME: 'Gmail to Notion Integration',
    CONFIG_VERSION: '2.1.0',
    DESCRIPTION: 'Save Gmail emails to Notion databases with advanced mapping',
    AUTHOR: 'Gmail to Notion Team',
    SUPPORT_EMAIL: 'support@example.com'
  },

  // ===========================================================================
  // CACHE CONFIGURATION
  // ===========================================================================
  CACHE: {
    CONFIG_KEY: 'g2n_config_v3',
    TTL_SECONDS: 300,
    SCRIPT_CACHE: CacheService.getScriptCache(),
    PROPERTIES: PropertiesService.getScriptProperties(),
    USER_CACHE: CacheService.getUserCache(),
    
    // Cache keys
    KEYS: {
      DATABASES: 'g2n_databases_cache',
      DATABASE_PROPERTIES: 'g2n_db_props_',
      USER_INFO: 'g2n_user_info',
      SEARCH_RESULTS: 'g2n_search_results',
      RATE_LIMIT: 'g2n_rate_limit',
      CONFIG_BACKUP: 'g2n_config_backup'
    },
    
    // Cache TTL durations
    TTL: {
      SHORT: 60,        // 1 minute
      MEDIUM: 300,      // 5 minutes
      LONG: 3600,       // 1 hour
      VERY_LONG: 86400  // 24 hours
    }
  },

  // ===========================================================================
  // API CONFIGURATION
  // ===========================================================================
  API: {
    // Notion API Configuration
    NOTION: {
      BASE_URL: 'https://api.notion.com/v1/',
      VERSION: '2022-06-28',
      TIMEOUT: 30000,
      MAX_RETRIES: 3,
      RETRY_DELAY: 1000,
      
      // API Endpoints
      ENDPOINTS: {
        SEARCH: 'search',
        DATABASES: 'databases/',
        DATABASE_QUERY: 'databases/{databaseId}/query',
        DATABASE_RETRIEVE: 'databases/{databaseId}',
        PAGES: 'pages',
        BLOCKS: 'blocks',
        BLOCK_APPEND: 'blocks/{blockId}/children',
        USERS: 'users/',
        USERS_ME: 'users/me'
      },
      
      // Request Headers
      HEADERS: {
        ACCEPT: 'application/json',
        CONTENT_TYPE: 'application/json',
        NOTION_VERSION: '2022-06-28'
      },
      
      // Response Codes
      RESPONSE_CODES: {
        SUCCESS: 200,
        CREATED: 201,
        NO_CONTENT: 204,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        NOT_FOUND: 404,
        RATE_LIMITED: 429,
        SERVER_ERROR: 500,
        SERVICE_UNAVAILABLE: 503
      },
      
      // API Key Validation
      KEY_PATTERN: /^(ntn_|secret_)[a-zA-Z0-9]+$/,
      KEY_LENGTHS: {
        NTN_LEGACY: 44,
        NTN_NEW: 50,
        SECRET: 43
      }
    },
    
    // Gmail API Configuration
    GMAIL: {
      BASE_URL: 'https://gmail.googleapis.com/gmail/v1/users/me/',
      SCOPES: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      TIMEOUT: 30000,
      BATCH_SIZE: 100,
      
      // API Endpoints
      ENDPOINTS: {
        MESSAGES: 'messages/',
        THREADS: 'threads/',
        ATTACHMENTS: 'messages/{messageId}/attachments/{attachmentId}',
        PROFILE: 'profile',
        LABELS: 'labels'
      }
    },
    
    // Rate Limiting
    RATE_LIMITS: {
      TIME_WINDOW: 60000,      // 1 minute
      MAX_CALLS: 3,            // Max calls per window
      MAX_RETRIES: 3,          // Max retry attempts
      RETRY_DELAY: 1000,       // Base retry delay
      ATTACHMENT_DELAY: 500,   // Delay between attachment processing
      REQUEST_TIMEOUT: 10000,  // Request timeout
      QUEUE_DELAY: 100         // Queue processing delay
    }
  },

  // ===========================================================================
  // STORAGE KEYS
  // ===========================================================================
  STORAGE_KEYS: {
    NOTION_API_KEY: 'NOTION_API_KEY',
    GMAIL_DB_ID: 'GMAIL_DB_ID',
    RESOURCES_DB_ID: 'RESOURCES_DB_ID', 
    PROPERTY_MAPPINGS: 'PROPERTY_MAPPINGS',
    APP_SETTINGS: 'APP_SETTINGS',
    LAST_DATABASE_USED: 'LAST_DATABASE_USED',
    USER_PREFERENCES: 'USER_PREFERENCES',
    MAPPING_TEMPLATES: 'MAPPING_TEMPLATES',
    ERROR_LOGS: 'ERROR_LOGS',
    PERFORMANCE_METRICS: 'PERFORMANCE_METRICS',
    BACKUP_CONFIG: 'BACKUP_CONFIG'
  },

  // ===========================================================================
  // LOGGING CONFIGURATION
  // ===========================================================================
  LOGGING: {
    LEVELS: {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    },
    DEFAULT_LEVEL: 1,
    MAX_DATA_SIZE: 1000,
    PERFORMANCE_THRESHOLD: 10000,
    ENABLED: true,
    LOG_STACKTRACE: true,
    MAX_LOG_ENTRIES: 1000,
    LOG_RETENTION_DAYS: 7,
    
    // Log Sources
    SOURCES: {
      MAIN: 'Main',
      UI: 'UI',
      NOTION: 'Notion',
      GMAIL: 'Gmail',
      CONFIG: 'Config',
      CACHE: 'Cache',
      VALIDATION: 'Validation',
      MAPPING: 'Mapping',
      ATTACHMENTS: 'Attachments',
      SETUP: 'Setup',
      SAVE: 'Save',
      NAVIGATION: 'Navigation'
    }
  },

  // ===========================================================================
  // ERROR CODES AND HANDLING
  // ===========================================================================
  ERROR_CODES: {
    // Mapping Errors
    MAPPING: {
      NOT_FOUND: 'MAP-404',
      TYPE_MISMATCH: 'MAP-422',
      INVALID_FORMAT: 'MAP-400',
      REQUIRED_MISSING: 'MAP-401'
    },
    
    // Cache Errors
    CACHE: {
      READ_FAILURE: 'CAC-500',
      WRITE_FAILURE: 'CAC-501',
      EXPIRED: 'CAC-410',
      INVALID_KEY: 'CAC-400'
    },
    
    // Schema Errors
    SCHEMA: {
      VALIDATION: 'SCH-400',
      INCOMPATIBLE: 'SCH-422',
      REQUIRED_MISSING: 'SCH-401'
    },
    
    // General Errors
    GENERAL: {
      UNKNOWN: 'GEN-000',
      NETWORK: 'NET-500',
      AUTH: 'AUTH-401',
      PERMISSION: 'PERM-403',
      QUOTA: 'QUOTA-429',
      TIMEOUT: 'TIME-408'
    },
    
    // Notion API Errors
    NOTION: {
      API_ERROR: 'NOT-500',
      DATABASE_NOT_FOUND: 'NOT-404',
      INVALID_REQUEST: 'NOT-400',
      RATE_LIMITED: 'NOT-429',
      UNAUTHORIZED: 'NOT-401'
    },
    
    // Gmail API Errors
    GMAIL: {
      MESSAGE_NOT_FOUND: 'GML-404',
      ATTACHMENT_ERROR: 'GML-500',
      PERMISSION_DENIED: 'GML-403',
      RATE_LIMITED: 'GML-429'
    }
  },

  // ===========================================================================
  // RECOVERY AND RETRY SETTINGS
  // ===========================================================================
  RECOVERY: {
    MAX_RETRIES: 2,
    BACKOFF_BASE: 1000,
    BACKOFF_MULTIPLIER: 2,
    QUOTA_DELAY: 5000,
    AUTH_DELAY: 500,
    
    // Recovery Strategies
    STRATEGIES: {
      RETRY: 'retry',
      FALLBACK: 'fallback',
      SKIP: 'skip',
      PROMPT_USER: 'prompt'
    },
    
    // Fallback Actions
    FALLBACK_ACTIONS: {
      USE_DEFAULT_MAPPING: 'use_default_mapping',
      SKIP_ATTACHMENTS: 'skip_attachments',
      USE_BASIC_SAVE: 'use_basic_save',
      CREATE_MINIMAL_PAGE: 'create_minimal_page'
    }
  },

  // ===========================================================================
  // GMAIL CONFIGURATION
  // ===========================================================================
  GMAIL: {
    MAX_BODY_LENGTH: 10000,
    MAX_ATTACHMENT_SIZE: 10485760,        // 10MB
    MAX_ATTACHMENT_PROCESSING_SIZE: 5000000, // 5MB
    MAX_ATTACHMENTS_PER_EMAIL: 10,
    MAX_MEMORY_USAGE: 50000000,           // 50MB
    MAX_RECURSION_DEPTH: 10,
    TRACKING_LABEL: 'SavedToNotion',
    MAX_BODY_PREVIEW: 200,
    GMAIL_LINK_BASE: 'https://mail.google.com/mail/u/0/#inbox/',
    
    // Email Cleaning Configuration
    EMAIL_CLEANING: {
      REMOVE_QUOTES: true,
      REMOVE_SIGNATURES: true,
      CLEAN_HTML: true,
      REMOVE_RE: true,
      TRIM: true,
      PATTERNS: [
        { regex: /^On\s.+?\s?wrote:.*$/gmi, replace: '' },
        { regex: /^>+/gm, replace: '' },
        { regex: /--\s*\n[\s\S]*$/i, replace: '' },
        { regex: /^From:\s.*$/gmi, replace: '' },
        { regex: /^Sent:\s.*$/gmi, replace: '' },
        { regex: /^To:\s.*$/gmi, replace: '' },
        { regex: /[\u200B-\u200D\uFEFF]/g, replace: '' },
        { regex: /\n{3,}/g, replace: '\n\n' },
        { regex: /[ \t]{2,}/g, replace: ' ' }
      ]
    },
    
    // HTML to Text Conversion
    HTML_TO_TEXT_REPLACEMENTS: [
      { regex: /<br\s*\/?>/gi, replacement: '\n' },
      { regex: /<p\s*\/?>/gi, replacement: '\n\n' },
      { regex: /<div\s*\/?>/gi, replacement: '\n' },
      { regex: /<li\s*\/?>/gi, replacement: '\n• ' },
      { regex: /<ul\s*\/?>/gi, replacement: '\n' },
      { regex: /<ol\s*\/?>/gi, replacement: '\n' },
      { regex: /<h[1-6][^>]*>/gi, replacement: '\n\n' },
      { regex: /<\/h[1-6]>/gi, replacement: '\n\n' },
      { regex: /<tr\s*\/?>/gi, replacement: '\n' },
      { regex: /<td\s*\/?>/gi, replacement: ' ' },
      { regex: /<th\s*\/?>/gi, replacement: ' ' },
      { regex: /<table[^>]*>/gi, replacement: '\n' },
      { regex: /<\/table>/gi, replacement: '\n' }
    ],
    
    // HTML Entities
    HTML_ENTITIES: {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&copy;': '(c)',
      '&reg;': '(r)'
    }
  },

  // ===========================================================================
  // SEARCH CONFIGURATION
  // ===========================================================================
  SEARCH: {
    FILTER: {
      property: 'object',
      value: 'database'
    },
    SORT: {
      direction: 'descending',
      timestamp: 'last_edited_time'
    },
    
    // Search Configuration
    QUERY: {
      DEFAULT_PAGE_SIZE: 100,
      MAX_PAGE_SIZE: 100,
      SORT_BY: 'last_edited_time',
      SORT_DIRECTION: 'descending'
    },
    
    // Search Filters
    FILTERS: {
      DATABASE: { property: 'object', value: 'database' },
      PAGE: { property: 'object', value: 'page' }
    }
  },

  // ===========================================================================
  // ERROR PATTERNS FOR RETRY LOGIC
  // ===========================================================================
  ERROR_PATTERNS: {
    RETRYABLE: [
      'rate_limit',
      'too_many_requests', 
      'internal_server_error',
      'service_unavailable',
      'conflict_error',
      'timeout',
      'network_error',
      'gateway_timeout'
    ],
    AUTH: [
      'token',
      'auth',
      '401',
      '403',
      'unauthorized',
      'forbidden'
    ],
    QUOTA: [
      'quota',
      'limit',
      '429',
      'rate_limit'
    ],
    PERMANENT: [
      'not_found',
      'invalid_request',
      'validation_error',
      'missing_required'
    ]
  },

  // ===========================================================================
  // VALIDATION PATTERNS AND LIMITS
  // ===========================================================================
  PATTERNS: {
    DATABASE_ID: /^[a-f0-9-]{32,}$/,
    PAGE_ID: /^[a-f0-9-]{32,}$/,
    BLOCK_ID: /^[a-f0-9-]{32,}$/,
    USER_ID: /^[a-f0-9-]{32,}$/,
    NOTION_KEY: {
      NTN_PATTERN: /^ntn_[a-zA-Z0-9]{39,45}$/,
      SECRET_PATTERN: /^secret_[a-zA-Z0-9]{36}$/
    },
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/[^\s$.?#].[^\s]*$/,
    DATE: /^\d{4}-\d{2}-\d{2}/,
    PHONE: /^[\+]?[(]?[\d\s\-\(\)]{10,}$/
  },

  VALIDATION_LIMITS: {
    MAX_BODY_LENGTH: { min: 1000, max: 50000 },
    CACHE_DURATION: { min: 60, max: 3600 },
    API_KEY_LENGTH: { min: 40, max: 50 },
    DATABASE_ID_LENGTH: 32,
    PAGE_ID_LENGTH: 32,
    MAX_PROPERTY_NAME_LENGTH: 100,
    MAX_SELECT_OPTIONS: 100,
    MAX_RELATION_PAGES: 100
  },

  // ===========================================================================
  // REQUIRED CONFIGURATION FIELDS
  // ===========================================================================
  REQUIRED_FIELDS: [
    'NOTION_API_KEY', 
    'DATABASES.gmail.id',
    'DATABASES.gmail.name',
    'SYSTEM.initialized',
    'SYSTEM.configVersion'
  ],

  // ===========================================================================
  // DEFAULT SETTINGS
  // ===========================================================================
  DEFAULTS: {
    SAVE_MODE: 'quick',
    ATTACHMENT_HANDLING: 'none',
    AUTO_CREATE_PROPERTIES: true,
    CHECK_DUPLICATES: true,
    VALIDATE_MAPPINGS: true,
    CLEAN_EMAIL_BODY: true,
    REMOVE_QUOTED_TEXT: true,
    INCLUDE_EMAIL_LINKS: true,
    SHOW_ADVANCED_OPTIONS: false,
    COLLAPSE_SIMPLE_VIEW: false,
    REMEMBER_LAST_DATABASE: true,
    ENABLE_CACHING: true,
    PROMPT_FOR_MISSING_MAPPINGS: true,
    SHOW_MAPPING_SUGGESTIONS: true,
    PROCESS_ATTACHMENTS_AFTER_SAVE: true,
    CACHE_DURATION: 300,
    RATE_LIMIT_DELAY: 1000,
    MAX_BODY_LENGTH: 10000,
    MAX_ATTACHMENT_SIZE: 10485760,
    
    // Additional Defaults
    DEFAULT_DATABASE_NAME: 'Gmail Emails',
    DEFAULT_RESOURCES_NAME: 'Email Resources',
    MAX_EMAILS_PER_RUN: 10,
    DEFAULT_TIMEZONE: 'UTC',
    DATE_FORMAT: 'YYYY-MM-DD',
    TIME_FORMAT: 'HH:mm:ss',
    DATETIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
    NOTION_DATE_FORMAT: 'YYYY-MM-DD',
    NOTION_DATETIME_FORMAT: 'YYYY-MM-DDTHH:mm:ss.000Z'
  },

  // ===========================================================================
  // UI CONFIGURATION
  // ===========================================================================
  UI: {
    // Icons
    ICONS: {
      SUCCESS: '✅',
      ERROR: '❌', 
      WARNING: '⚠️',
      INFO: 'ℹ️',
      CONFIG: '⚙️',
      DATABASE: '🗄️',
      EMAIL: '📧',
      ATTACHMENT: '📎',
      TEST: '🧪',
      MAPPING: '🔄',
      SAVE: '💾',
      BACK: '↩️',
      HOME: '🏠',
      HELP: '❓',
      LOADING: '⏳',
      SUCCESS_ALT: '✨',
      ERROR_ALT: '🚨',
      WARNING_ALT: '🔔',
      SEARCH: '🔍',
      FILTER: '🔧',
      REFRESH: '🔄',
      DOWNLOAD: '📥',
      UPLOAD: '📤',
      TRASH: '🗑️',
      EDIT: '✏️',
      ADD: '➕',
      REMOVE: '➖',
      CHECK: '✔️',
      CLOSE: '❌',
      MENU: '☰'
    },
    
    // Messages
    MESSAGES: {
      SAVE_SUCCESS: 'Email saved to Notion successfully!',
      SAVE_FAILED: 'Failed to save email to Notion',
      DUPLICATE_FOUND: 'This email has already been saved',
      CONFIG_REQUIRED: 'Please configure the add-on first',
      PROPERTY_MAPPING_HEADER: 'Property Mapping',
      NO_CONFIGURABLE_PROPERTIES: 'No configurable properties found in this database.',
      SETTINGS_SAVED: '✅ Settings saved successfully!',
      SETTINGS_CARD_TITLE: '⚙️ Gmail to Notion - Settings',
      SETTINGS_SAVED_SUCCESS: '✅ All settings saved successfully!',
      NO_FORM_INPUTS: 'No form inputs received from the Advanced Mapping UI.',
      CONNECTION_TEST_SUCCESS: '✅ Notion connection successful!',
      CONNECTION_TEST_FAILED: '❌ Notion connection failed',
      NO_DATABASES_FOUND: 'No databases found in your Notion workspace',
      COMMON_ISSUE: 'Common issue: Make sure you select "Map" options for email fields',
      
      // Additional Messages
      LOADING: 'Loading...',
      PROCESSING: 'Processing...',
      SEARCHING: 'Searching...',
      SAVING: 'Saving...',
      TESTING: 'Testing...',
      VALIDATING: 'Validating...',
      UPLOADING: 'Uploading...',
      DOWNLOADING: 'Downloading...',
      SUCCESS: 'Success!',
      ERROR: 'Error!',
      WARNING: 'Warning!',
      INFO: 'Information',
      CONFIRM: 'Are you sure?',
      CANCEL: 'Cancel',
      OK: 'OK',
      YES: 'Yes',
      NO: 'No',
      RETRY: 'Retry',
      SKIP: 'Skip',
      CONTINUE: 'Continue',
      
      // Setup Wizard Messages
      SETUP_WIZARD: {
        TITLE: 'Gmail to Notion Setup',
        SUBTITLE: 'Let\'s get everything configured automatically',
        STATUS_HEADER: 'Current Status',
        INSTRUCTIONS_HEADER: 'Quick Setup',
        API_KEY_REQUIRED: 'API Key: Required',
        API_KEY_CONFIGURED: 'API Key: Configured',
        DATABASES_READY: 'Databases: Ready',
        DATABASES_NOT_SETUP: 'Databases: Not setup',
        SETUP_COMPLETE: 'Setup complete! You can start saving emails.'
      },

      // NEW: Configuration Required Messages
      CONFIGURATION_REQUIRED: {
        TITLE: 'Configuration Required',
        DESCRIPTION: 'Please configure your Notion integration to start saving emails.',
        COMMON_ISSUES_HEADER: 'This usually happens when:',
        ISSUE_REAUTH: '• The add-on needs re-authentication',
        ISSUE_PERMISSIONS: '• Gmail permissions were revoked', 
        ISSUE_ACCESS: '• The email is no longer accessible'
      },

      // NEW: Homepage Messages
      HOMEPAGE: {
        SUBTITLE: 'Connected to: {database}',
        QUICK_ACTIONS_HEADER: '🚀 Quick Actions',
        SAVE_INSTRUCTIONS: 'Save the current email to Notion:',
        CONFIGURATION_HEADER: '⚙️ Configuration'
      },

      // NEW: Configuration Card Messages
      CONFIGURATION: {
        TITLE: '⚙️ Gmail to Notion - Settings',
        SUBTITLE: 'Version {version}',
        API_SECTION: '🔑 Notion API Configuration',
        API_KEY_TITLE: 'Notion API Key',
        API_KEY_HINT: 'Your Notion integration API key (starts with ntn_)',
        API_KEY_INSTRUCTIONS: 'Get your API key from notion.so/my-integrations',
        DATABASE_STATUS: '🗄️ Current Database Status',
        GMAIL_DATABASE_LABEL: 'Selected Gmail Database',
        ATTACHMENTS_DATABASE_LABEL: 'Attachments Database',
        NO_DATABASE_SELECTED: 'No database selected',
        NOT_CONFIGURED: 'Not configured',
        DATABASE_ID_LABEL: 'ID: {id}',
        DATABASE_CHANGE_INSTRUCTIONS: 'To change databases, use the database selector in the email preview.',
        DATABASE_MANAGEMENT: '🔄 Database Management',
        ACTIONS: 'Actions'
      },

      // NEW: Database Selection Messages
      DATABASE_SELECTION: {
        TITLE: '🗄️ Select Database',
        HEADER: 'Available Databases',
        SUBTITLE: 'Choose a database to save emails to:',
        NO_DATABASES_FOUND: '❌ No accessible databases found. Please check your Notion integration settings.',
        CONFIGURATION_REQUIRED: 'Database configuration required'
      },

      // NEW: Email Preview Messages
      EMAIL_PREVIEW: {
        TITLE: '📧 Email Preview',
        NO_SUBJECT: 'No Subject',
        UNKNOWN_SENDER: 'Unknown Sender',
        UNKNOWN_DATE: 'Unknown Date',
        NO_CONTENT: '[No email content available]',
        CONTENT_UNAVAILABLE: '[Email content not available or too short]',
        ATTACHMENTS_COUNT: '**Attachments:** {count} file(s)',
        ERROR_DISPLAYING: 'Error displaying email preview.'
      },

      // NEW: Save Options Messages
      SAVE_OPTIONS: {
        TITLE: '💾 Save to Notion',
        INCLUDE_BODY: 'Include Content',
        INCLUDE_BODY_DESCRIPTION: 'Include email body content'
      },

      // NEW: Advanced Mapping Messages
      ADVANCED_MAPPING: {
        TITLE: '⚙️ Advanced Property Mapping',
        DATABASE_LABEL: 'Database: **{name}**',
        INSTRUCTIONS: 'Map email fields to database properties or create new ones:',
        MAP_TO_PROPERTY: 'Map to Property',
        DONT_MAP: '-- Don\'t Map --',
        CREATE_NEW_PROPERTY: '➕ Create New Property...',
        NEW_PROPERTY_TYPE: 'New Property Type',
        NEW_PROPERTY_NAME: 'New Property Name',
        NEW_PROPERTY_HINT: 'e.g., {suggestion}',
        ACTIONS_HEADER: 'Actions'
      },

      // NEW: Error Messages
      ERRORS: {
        DETAIL_LABEL: 'Error:'
      },

      // NEW: Authentication Error Messages
      AUTH_ERROR: {
        TITLE: 'Gmail Access Needed',
        DESCRIPTION: 'We need access to your Gmail account to read the email content.',
        COMMON_ISSUES_HEADER: 'This usually happens when:',
        ISSUE_REAUTH: '• The add-on needs re-authentication',
        ISSUE_PERMISSIONS: '• Gmail permissions were revoked',
        ISSUE_ACCESS: '• The email is no longer accessible'
      },

      // NEW: Database Error Messages
      DATABASE_ERROR: {
        TITLE: 'No Databases Available',
        DESCRIPTION: 'We could not find any accessible Notion databases.',
        COMMON_SOLUTIONS_HEADER: '**Common solutions:**',
        SOLUTION_API_KEY: '• Check your Notion API key in settings',
        SOLUTION_DATABASES_EXIST: '• Ensure you have databases in your workspace',
        SOLUTION_SHARE_DATABASES: '• Share databases with your integration'
      }
    },

    // NEW: Buttons
    BUTTONS: {
      CONFIGURE_SETTINGS: '⚙️ Configure Settings',
      TEST_CONNECTION: '🔗 Test Connection',
      CHANGE_DATABASE: '🔄 Change Database',
      REFRESH_DATABASE_INFO: '🔄 Refresh Database Info',
      CONFIGURE_MAPPINGS: '⚙️ Configure Mappings',
      SAVE_API_KEY: '💾 Save API Key Only',
      BACK_TO_HOME: '← Back to Home',
      BACK_TO_EMAIL: '📧 Back to Email',
      OPEN_NOTION_INTEGRATIONS: '🔗 Open Notion Integrations',
      QUICK_SAVE: '💾 Save to Notion',
      ADVANCED_SAVE: '⚙️ Advanced Mapping',
      RELOAD: '🔄 Reload',
      RETRY: '🔄 Try Again',
      SAVE_MAPPINGS: '💾 Save Mappings',
      AUTO_DETECT: '🔄 Auto-Detect'
    },

    // NEW: Sections
    SECTIONS: {
      DATABASE_SELECTION: {
        HEADER: '🗄️ Current Database',
        WIDGETS: {
          DATABASE_NAME: '📊 **{name}**',
          DATABASE_ID: 'Database ID: {id}'
        }
      },
      EMAIL_PREVIEW: {
        HEADER: '📧 Email Preview',
        WIDGETS: {
          SUBJECT: '**Subject:** {subject}',
          FROM: '**From:** {sender}',
          DATE: '**Date:** {date}',
          PREVIEW: '**Preview:** {content}'
        }
      },
      SAVE_OPTIONS: {
        HEADER: '💾 Save to Notion',
        WIDGETS: {
          INCLUDE_BODY: 'Include email body content'
        }
      },
      CONFIGURATION: {
        API: '🔑 Notion API Configuration',
        DATABASE_STATUS: '🗄️ Current Database Status',
        DATABASE_MANAGEMENT: '🔄 Database Management',
        ACTIONS: 'Actions'
      }
    },

    // NEW: Form Fields
    FORM_FIELDS: {
      API_KEY: 'apiKey',
      INCLUDE_BODY: 'include_body',
      MAPPING_PREFIX: 'mapping_',
      NEW_PROP_TYPE_PREFIX: 'new_prop_type_',
      NEW_PROP_NAME_PREFIX: 'new_prop_name_'
    },
    
    // Colors
    COLORS: {
      PRIMARY: '#4285F4',
      SECONDARY: '#34A853',
      ACCENT: '#FBBC05',
      ERROR: '#EA4335',
      NEUTRAL: '#5F6368',
      SUCCESS: '#34A853',
      WARNING: '#FBBC05',
      INFO: '#4285F4',
      BACKGROUND: '#FFFFFF',
      SURFACE: '#F8F9FA',
      TEXT_PRIMARY: '#202124',
      TEXT_SECONDARY: '#5F6368',
      TEXT_DISABLED: '#9AA0A6',
      BORDER: '#DADCE0',
      HOVER: '#F1F3F4',
      SELECTED: '#E8F0FE'
    },
    
    // Layout
    LAYOUT: {
      MAX_SECTION_ITEMS: 10,
      MAX_BUTTONS_PER_ROW: 3,
      MAX_TEXT_LENGTH: 2000,
      PREVIEW_TRUNCATE: 100,
      PROGRESS_BAR_SEGMENTS: 5,
      CARD_MAX_WIDTH: 600,
      SECTION_SPACING: 8,
      WIDGET_SPACING: 4,
      PADDING: 16,
      BORDER_RADIUS: 8,
      SHADOW_ELEVATION: 2,
      ANIMATION_DURATION: 300
    },
    
    // Interaction
    INTERACTION: {
      LOADING_DELAY: 1500,
      SUCCESS_DISPLAY_TIME: 3000,
      ERROR_DISPLAY_TIME: 5000,
      PROGRESS_UPDATE_INTERVAL: 500,
      DEBOUNCE_DELAY: 300,
      TOOLTIP_DELAY: 1000,
      AUTO_SAVE_DELAY: 2000,
      NOTIFICATION_TIMEOUT: 5000,
      CONFIRMATION_TIMEOUT: 10000
    }
  },

  // ===========================================================================
  // ERROR MESSAGES
  // ===========================================================================
  ERRORS: {
    NOTION_CONNECTION: 'Failed to connect to Notion API',
    NOTION_PERMISSION: 'Notion integration lacks required permissions',
    NOTION_RATE_LIMIT: 'Notion API rate limit exceeded',
    GMAIL_ACCESS: 'Cannot access Gmail message',
    CONFIG_INVALID: 'Configuration is invalid or incomplete',
    DATABASE_NOT_FOUND: 'Database not found or inaccessible',
    API_KEY_INVALID: 'Invalid Notion API key format',
    DATABASE_ID_INVALID: 'Invalid database ID format',
    DATABASE_PROPERTIES: 'Database properties: {count} properties',
    FORM_INPUTS_RECEIVED: 'Form inputs received: {count} fields'
  },

  // ===========================================================================
  // PROPERTY CONFIGURATION
  // ===========================================================================
  PROPERTIES: {
    UNIQUE_MESSAGE_ID: 'Unique Message ID',
    SUBJECT: 'Name',
    SENDER: 'From',
    DATE_SENT: 'Date',
    GMAIL_LINK: 'Gmail Link',
    BODY_PREVIEW: 'Body Preview',
    
    // Required Properties
    REQUIRED_PROPERTIES: [
      {
        id: 'uniqueMessageId',
        name: 'Unique Message ID',
        description: 'Unique identifier to prevent duplicate email saves',
        required: true,
        notionType: 'rich_text',
        autoCreate: true
      },
      {
        id: 'gmailLink', 
        name: 'Gmail Link',
        description: 'Direct link to the Gmail message for quick access',
        required: true,
        notionType: 'url',
        autoCreate: true
      }
    ],
    
    // Property Types
    PROPERTY_TYPES: {
      RICH_TEXT: 'rich_text',
      URL: 'url',
      DATE: 'date',
      SELECT: 'select',
      MULTI_SELECT: 'multi_select',
      NUMBER: 'number',
      TITLE: 'title',
      EMAIL: 'email',
      PHONE_NUMBER: 'phone_number',
      CHECKBOX: 'checkbox',
      PEOPLE: 'people',
      RELATION: 'relation',
      ROLLUP: 'rollup',
      STATUS: 'status',
      FILES: 'files',
      CREATED_TIME: 'created_time',
      LAST_EDITED_TIME: 'last_edited_time',
      CREATED_BY: 'created_by',
      LAST_EDITED_BY: 'last_edited_by',
      FORMULA: 'formula'
    },
    
    // Default Values
    DEFAULT_VALUES: {
      TITLE: 'Untitled Email',
      SELECT: 'Uncategorized',
      MULTI_SELECT: [],
      NUMBER: 0,
      CHECKBOX: false,
      DATE: 'now',
      EMAIL: '',
      PHONE: '',
      URL: ''
    },
    
    // Property Creation Settings
    CREATION: {
      MAX_NAME_LENGTH: 100,
      MAX_DESCRIPTION_LENGTH: 200,
      ALLOWED_CHARACTERS: /^[a-zA-Z0-9_\-\s]+$/,
      RESERVED_NAMES: ['id', 'type', 'created', 'modified', 'object']
    }
  },

  // ===========================================================================
  // DATABASE CONFIGURATION
  // ===========================================================================
  DATABASES: {
    GMAIL: 'gmail',
    RESOURCES: 'resources',
    
    // Default Names
    DEFAULT_NAMES: {
      GMAIL: 'Gmail Database',
      RESOURCES: 'Resources Database'
    },
    
    // Database Templates
    TEMPLATES: {
      GMAIL: {
        name: 'Gmail Emails',
        description: 'Database for storing emails from Gmail',
        icon: '📧',
        properties: {
          Name: { type: 'title', name: 'Email Subject' },
          From: { type: 'rich_text', name: 'Sender' },
          Date: { type: 'date', name: 'Date Sent' },
          'Gmail Link': { type: 'url', name: 'Gmail Link' },
          'Unique ID': { type: 'rich_text', name: 'Unique Message ID' }
        }
      },
      RESOURCES: {
        name: 'Email Resources',
        description: 'Database for storing email attachments and resources',
        icon: '📎',
        properties: {
          Name: { type: 'title', name: 'File Name' },
          'Original Email': { type: 'relation', name: 'Related Email' },
          Type: { type: 'select', name: 'File Type' },
          Size: { type: 'number', name: 'File Size' },
          URL: { type: 'url', name: 'File URL' }
        }
      }
    }
  },

  // ===========================================================================
  // WORKFLOW CONFIGURATION
  // ===========================================================================
  WORKFLOW: {
    // Workflow States
    STATES: {
      INITIAL: 'initial',
      CONFIG_CHECK: 'config_check',
      EMAIL_FETCH: 'email_fetch',
      DATABASE_SELECTION: 'database_selection',
      MAPPING_VALIDATION: 'mapping_validation',
      DUPLICATE_CHECK: 'duplicate_check',
      PROPERTY_BUILDING: 'property_building',
      PAGE_CREATION: 'page_creation',
      ATTACHMENT_PROCESSING: 'attachment_processing',
      CLEANUP: 'cleanup',
      COMPLETE: 'complete',
      ERROR: 'error'
    },
    
    // Save Modes
    SAVE_MODES: {
      QUICK: {
        id: 'quick',
        name: 'Quick Save',
        description: 'Save with predefined mapping templates',
        requiresMapping: false,
        supportsAttachments: true,
        steps: ['config_check', 'email_fetch', 'duplicate_check', 'property_building', 'page_creation', 'attachment_processing']
      },
      ADVANCED: {
        id: 'advanced',
        name: 'Advanced Mapping', 
        description: 'Custom property mapping for each field',
        requiresMapping: true,
        supportsAttachments: true,
        steps: ['config_check', 'email_fetch', 'mapping_validation', 'duplicate_check', 'property_building', 'page_creation', 'attachment_processing']
      }
    },
    
    // Error Handling
    ERROR_HANDLING: {
      MAX_RETRIES: 3,
      RETRY_DELAYS: [1000, 2000, 5000],
      FALLBACK_STRATEGIES: {
        API_RATE_LIMIT: 'retry_with_backoff',
        AUTH_ERROR: 'refresh_auth',
        NETWORK_ERROR: 'retry_immediately',
        VALIDATION_ERROR: 'skip_validation',
        MAPPING_ERROR: 'use_fallback_mapping',
        ATTACHMENT_ERROR: 'skip_attachments'
      },
      RECOVERY_ACTIONS: {
        RETRY: 'retry',
        SKIP: 'skip',
        USE_DEFAULT: 'use_default',
        PROMPT_USER: 'prompt_user',
        ABORT: 'abort'
      }
    },
    
    // Timeouts
    TIMEOUTS: {
      EMAIL_FETCH: 30000,
      DATABASE_QUERY: 15000,
      PAGE_CREATION: 20000,
      ATTACHMENT_UPLOAD: 60000,
      TOTAL_PROCESS: 120000
    },
    
    // Progress Tracking
    PROGRESS: {
      STEPS: 10,
      UPDATE_INTERVAL: 1000,
      SHOW_ESTIMATE: true
    }
  },

  // ===========================================================================
  // PROPERTY MAPPING CONFIGURATION
  // ===========================================================================
  PROPERTY_MAPPINGS: {
    // Selectable Properties
    SELECTABLE_PROPERTIES: {
      'select': {
        type: 'select',
        label: 'Select Option',
        description: 'Single-select dropdown for categorization',
        valueSource: 'user_choice',
        supports: ['status', 'priority', 'category', 'type']
      },
      'multi_select': {
        type: 'multi_select', 
        label: 'Multi-Select Tags',
        description: 'Multi-select tags for multiple categorization',
        valueSource: 'user_choice',
        supports: ['tags', 'topics', 'labels', 'categories']
      },
      'status': {
        type: 'status',
        label: 'Status',
        description: 'Status indicator for workflow tracking',
        valueSource: 'predefined',
        supports: ['progress', 'state', 'stage']
      },
      'checkbox': {
        type: 'checkbox',
        label: 'Checkbox',
        description: 'Boolean toggle for simple flags',
        valueSource: 'predefined',
        supports: ['completion', 'verification', 'approval']
      },
      'people': {
        type: 'people',
        label: 'People',
        description: 'User assignment and responsibility',
        valueSource: 'user_choice',
        supports: ['assignee', 'reviewer', 'owner']
      },
      'relation': {
        type: 'relation',
        label: 'Relation',
        description: 'Link to other database pages',
        valueSource: 'database_relation',
        supports: ['related_pages', 'connections']
      },
      'rollup': {
        type: 'rollup',
        label: 'Rollup',
        description: 'Aggregated data from relations',
        valueSource: 'calculated',
        supports: ['aggregates', 'calculations']
      }
    },

    // Mappable Properties
    MAPPABLE_PROPERTIES: {
      'title': {
        type: 'title',
        label: 'Title',
        description: 'Primary title property for page identification',
        supports: ['subject', 'sender', 'uniqueId'],
        required: true,
        limitOne: true
      },
      'rich_text': {
        type: 'rich_text', 
        label: 'Text',
        description: 'Flexible text content with formatting',
        supports: ['subject', 'body', 'sender', 'recipients', 'labels'],
        maxLength: 2000
      },
      'phone_number': {
        type: 'phone_number',
        label: 'Phone Number', 
        description: 'Phone number fields',
        supports: ['sender_phone', 'contact_info'],
        validation: 'phone'
      },
      'number': {
        type: 'number',
        label: 'Number',
        description: 'Numeric values and counts',
        supports: ['attachment_count', 'word_count'],
        validation: 'number'
      },
      'date': {
        type: 'date',
        label: 'Date',
        description: 'Date and time values',
        supports: ['dateSent', 'created_time'],
        validation: 'date'
      },
      'email': {
        type: 'email',
        label: 'Email',
        description: 'Email address fields',
        supports: ['sender', 'to', 'cc', 'bcc'],
        validation: 'email'
      },
      'url': {
        type: 'url',
        label: 'URL',
        description: 'Web links and URLs',
        supports: ['gmailLink'],
        validation: 'url'
      }
    },

    // Common Mappings
    COMMON_MAPPINGS: [
      { value: 'subject', label: 'Email Subject' },
      { value: 'sender', label: 'Sender Information' },
      { value: 'dateSent', label: 'Date Sent' },
      { value: 'body', label: 'Email Body' }
    ],

    // Type-Specific Mappings
    TYPE_SPECIFIC_MAPPINGS: {
      'rich_text': [
        { value: 'subject_text', label: 'Email Subject' },
        { value: 'body_text', label: 'Email Body' },
        { value: 'sender_text', label: 'Sender Info' },
        { value: 'recipients_text', label: 'Recipients List' }
      ],
      'email': [
        { value: 'sender_email', label: 'Sender Email' },
        { value: 'to_email', label: 'To Recipients' }
      ],
      'date': [
        { value: 'dateSent', label: 'Email Date' },
        { value: 'currentDate', label: 'Current Date' }
      ]
    },

    // Email Fields
    EMAIL_FIELDS: [
      { value: 'subject', label: 'Email Subject' },
      { value: 'sender', label: 'Sender Information' },
      { value: 'dateSent', label: 'Date and Time Sent' },
      { value: 'body', label: 'Email Body' },
      { value: 'gmailLink', label: 'Gmail Link' },
      { value: 'uniqueMessageId', label: 'Unique Message ID' },
      { value: 'to', label: 'To Recipients' },
      { value: 'cc', label: 'CC Recipients' },
      { value: 'bcc', label: 'BCC Recipients' },
      { value: 'labels', label: 'Gmail Labels' }
    ]
  },

  // ===========================================================================
  // FUNCTION NAMES - ENHANCED FOR UISERVICE
  // ===========================================================================
  FUNCTION_NAMES: {
    ON_HOMEPAGE: 'onG2NHomepage',
    ON_GMAIL_MESSAGE: 'onG2NGmailMessage',
    ON_UNIVERSAL_ACTION: 'onG2NUniversalAction',
    SAVE_CONFIG: 'saveG2NConfigSettings',
    TEST_CONNECTION: 'testG2NNotionConnection',
    VALIDATE_CONFIG: 'validateG2NConfiguration',
    QUICK_SAVE_EMAIL: 'enhancedQuickG2NSaveEmail',
    ADVANCED_SAVE_EMAIL: 'enhancedAdvancedG2NSaveEmail',
    BUILD_CONFIG_CARD: 'buildG2NConfigCard',
    BUILD_PREVIEW_CARD: 'buildG2NPreviewCard',
    BUILD_HOMEPAGE_CARD: 'buildG2NHomepageCard',
    SHOW_SETTINGS_CATEGORY: 'showG2NSettingsCategory',
    SAVE_ALL_SETTINGS: 'saveG2NAllSettings',
    IMPORT_CONFIGURATION_FROM_JSON: 'importG2NConfigurationFromJson',
    RESET_SETTINGS_TO_DEFAULTS: 'resetG2NSettingsToDefaults',
    ENHANCED_TEST_CONNECTION: 'enhancedTestG2NNotionConnection',
    RESET_ALL_DATA: 'resetG2NAllData',
    SELECT_DATABASE: 'selectG2NDatabase',
    SHOW_ADVANCED_MAPPING: 'showG2NAdvancedMapping',
    SAVE_PROPERTY_MAPPINGS: 'savePropertyMappings',
    RESET_PROPERTY_MAPPINGS: 'resetPropertyMappings',
    TEST_EMAIL_PREVIEW: 'testEmailPreview',
    REFRESH_DATABASES: 'refreshDatabases',
    SHOW_DEBUG: 'showDebug',
    TEST_UI: 'testUI',
    TEST_DATABASES: 'testDatabases',
    
    // New function names for enhanced functionality
    UNIFIED_SAVE: 'unifiedSaveToNotion',
    SHOW_SETUP_WIZARD: 'showG2NSetupWizard',
    BUILD_SIMPLIFIED_HOMEPAGE: 'buildSimplifiedHomepageCard',
    SAVE_ADVANCED_MAPPING: 'saveAdvancedMapping',
    ON_DATABASE_SELECTED: 'onG2NDatabaseSelected',

    // UI Service Functions
    SHOW_SETTINGS: 'showG2NSettings',
    SHOW_DATABASE_SELECTION: 'showG2NDatabaseSelection',
    ON_GMAIL_MESSAGE: 'onG2NGmailMessage',
    ON_DATABASE_SELECTED: 'onG2NDatabaseSelected',
    QUICK_SAVE_EMAIL: 'quickG2NSaveEmail',
    SHOW_ADVANCED_MAPPING: 'showG2NAdvancedMapping',
    TEST_NOTION_CONNECTION: 'testNotionAPIConnection',
    SHOW_NOTION_INTEGRATIONS_HELP: 'showNotionIntegrationsHelp',
    REFRESH_DATABASE_INFO: 'refreshDatabaseInfo',
    ON_CHANGE_DATABASE_REQUEST: 'onChangeDatabaseRequest',
    //SAVE_ADVANCED_MAPPING: 'saveAdvancedMapping',
    AUTO_DETECT_MAPPING: 'autoDetectMapping',
    SAVE_CONFIG: 'saveG2NConfigSettings',
    
    // New enhanced functions
    BUILD_PREVIEW_CARD: 'buildPreviewCard',
    BUILD_ADVANCED_MAPPING_CARD: 'buildEnhancedAdvancedMappingCard',
    BUILD_DATABASE_SELECTION_CARD: 'buildDatabaseSelectionCard',
    BUILD_CONFIG_CARD: 'buildConfigCard'
  },

  // ===========================================================================
  // CARD BUILDER METHODS
  // ===========================================================================
  CARD_BUILDER_METHODS: {
    NEW_ACTION_RESPONSE: 'newActionResponseBuilder',
    NEW_NOTIFICATION: 'newNotification',
    NEW_NAVIGATION: 'newNavigation',
    SET_NOTIFICATION: 'setNotification',
    SET_NAVIGATION: 'setNavigation',
    POP_TO_ROOT: 'popToRoot',
    UPDATE_CARD: 'updateCard',
    BUILD_CARD: 'build',
    SET_HEADER: 'setHeader',
    ADD_SECTION: 'addSection',
    SET_FIXED_FOOTER: 'setFixedFooter'
  },

  // ===========================================================================
  // LOGGING SECTIONS
  // ===========================================================================
  LOGGING_SECTIONS: {
    MAIN: 'Main',
    SAVE_CONFIG_FROM_CARD: 'saveG2NConfigFromCard',
    RETURN_TO_SIMPLE_VIEW: 'returnToSimpleView',
    QUICK_BACK_TO_MAIN: 'quickBackToMain',
    UI_SERVICE: 'UIService',
    NOTION_SERVICE: 'NotionService',
    GMAIL_SERVICE: 'GmailService',
    CONFIG_SERVICE: 'ConfigService',
    CACHE_SERVICE: 'CacheService',
    VALIDATION: 'Validation',
    MAPPING: 'Mapping',
    ATTACHMENTS: 'Attachments',
    SETUP: 'Setup',
    SAVE: 'Save',
    NAVIGATION: 'Navigation'
  },

  // ===========================================================================
  // ACTION RESPONSE TYPES
  // ===========================================================================
  ACTION_RESPONSE_TYPES: {
    SUCCESS: 'buildG2NSuccessResponse',
    ERROR: 'buildG2NErrorResponse',
    INFO: 'buildG2NInfoResponse',
    WARNING: 'buildG2NWarningResponse',
    CONFIRMATION: 'buildG2NConfirmationResponse',
    PROGRESS: 'buildG2NProgressResponse'
  },

  // ===========================================================================
  // CONFIGURATION FIELDS
  // ===========================================================================
  CONFIG_FIELDS: {
    API_KEY: 'apiKey',
    GMAIL_DB: 'gmailDb',
    RESOURCES_DB: 'resourcesDb',
    PROPERTY_MAPPINGS: 'propertyMappings',
    SETTINGS: 'settings',
    SYSTEM: 'system',
    BACKUP: 'backup'
  },

  // ===========================================================================
  // FORM INPUT KEY
  // ===========================================================================
  FORM_INPUT_KEY: 'formInput',

  // ===========================================================================
  // STATUS INDICATORS
  // ===========================================================================
  STATUS_INDICATORS: { 
    START: '=== {function} START ===', 
    SUCCESS: '=== {function} SUCCESS ===',
    ERROR: '=== {function} ERROR ===',
    WARNING: '=== {function} WARNING ===',
    INFO: '=== {function} INFO ==='
  },

  // ===========================================================================
  // PERFORMANCE CONFIGURATION
  // ===========================================================================
  PERFORMANCE: {
    THRESHOLDS: {
      SLOW_OPERATION: 5000,        // 5 seconds
      VERY_SLOW_OPERATION: 15000,  // 15 seconds
      MEMORY_WARNING: 50000000,    // 50 MB
      MEMORY_CRITICAL: 90000000    // 90 MB
    },
    METRICS: {
      ENABLED: true,
      SAMPLE_RATE: 0.1,           // 10% of operations
      RETENTION_DAYS: 30
    }
  },

  // ===========================================================================
  // SECURITY CONFIGURATION
  // ===========================================================================
  SECURITY: {
    VALIDATION: {
      STRICT_MODE: true,
      SANITIZE_INPUT: true,
      VALIDATE_JSON: true,
      CHECK_ORIGIN: true
    },
    RATE_LIMITING: {
      ENABLED: true,
      MAX_REQUESTS_PER_MINUTE: 60,
      MAX_REQUESTS_PER_HOUR: 1000
    }
  },

  // ===========================================================================
  // EMAIL FIELD CONFIGURATION FOR MAPPING
  // ===========================================================================
  EMAIL_FIELDS: {
    DEFINITIONS: [
      { 
        id: 'subject', 
        name: '📧 Email Subject', 
        description: 'The subject line of the email',
        compatibleTypes: ['title', 'rich_text']
      },
      { 
        id: 'from', 
        name: '👤 From Address', 
        description: 'Sender email address',
        compatibleTypes: ['email', 'rich_text']
      },
      { 
        id: 'to', 
        name: '📨 To Address', 
        description: 'Recipient email address(es)',
        compatibleTypes: ['email', 'rich_text']
      },
      { 
        id: 'dateSent', 
        name: '📅 Date Sent', 
        description: 'When the email was sent',
        compatibleTypes: ['date']
      },
      { 
        id: 'body', 
        name: '📝 Email Body', 
        description: 'The content of the email',
        compatibleTypes: ['rich_text']
      },
      { 
        id: 'gmailLink', 
        name: '🔗 Gmail Link', 
        description: 'Link to open this email in Gmail',
        compatibleTypes: ['url']
      },
      { 
        id: 'messageId', 
        name: '🆔 Message ID', 
        description: 'Unique Gmail message identifier',
        compatibleTypes: ['rich_text']
      }
    ],
    
    // Property type display names
    PROPERTY_TYPE_DISPLAY_NAMES: {
      'title': 'Title',
      'rich_text': 'Text',
      'number': 'Number', 
      'select': 'Select',
      'multi_select': 'Multi-select',
      'date': 'Date',
      'url': 'URL',
      'email': 'Email',
      'checkbox': 'Checkbox',
      'phone_number': 'Phone',
      'status': 'Status'
    }
  },

  // ===========================================================================
  // ERROR HANDLING - ENHANCED FOR UISERVICE
  // ===========================================================================
  ERROR_HANDLING: {
    CARD_TITLES: {
      HOMEPAGE: '❌ Homepage Error',
      SETTINGS: '❌ Settings Error', 
      DATABASE: '🗄️ Database Access Required',
      AUTH: '🔐 Authentication Required',
      PREVIEW: '❌ Preview Error',
      MAPPING: '❌ Mapping Error'
    },
    
    SUGGESTIONS: {
      DEFAULT: 'Please try again or check the console for details.',
      AUTH: 'This usually happens when the add-on needs re-authentication, Gmail permissions were revoked, or the email is no longer accessible.',
      DATABASE: 'Common solutions: Check your Notion API key in settings, ensure you have databases in your workspace, and share databases with your integration.'
    }
  }
};

/**
 * ENHANCED CONFIGURATION OBJECT
 * Comprehensive configuration storage with mapping support
 */
let G2N_APP_CONFIG = {
  NOTION_API_KEY: '',
  
  DATABASES: {
    gmail: {
      id: '',
      name: '',
      lastVerified: null,
      propertyCount: 0,
      isAccessible: false
    },
    resources: {
      id: '',
      name: '',
      lastVerified: null,
      propertyCount: 0,
      isAccessible: false
    }
  },
  
  PROPERTY_MAPPINGS: {
    mappings: {},
    metadata: {
      lastUpdated: null,
      version: '1.0',
      databaseCount: 0,
      mappingCount: 0,
      autoGenerated: false
    }
  },
  
  SETTINGS: {
    // Core Settings
    autoCreateProperties: APP_CONSTANTS.DEFAULTS.AUTO_CREATE_PROPERTIES,
    checkDuplicates: APP_CONSTANTS.DEFAULTS.CHECK_DUPLICATES,
    validateMappings: APP_CONSTANTS.DEFAULTS.VALIDATE_MAPPINGS,
    defaultSaveMode: APP_CONSTANTS.DEFAULTS.SAVE_MODE,
    
    // User Experience
    promptForMissingMappings: APP_CONSTANTS.DEFAULTS.PROMPT_FOR_MISSING_MAPPINGS,
    showMappingSuggestions: APP_CONSTANTS.DEFAULTS.SHOW_MAPPING_SUGGESTIONS,
    showAdvancedOptions: APP_CONSTANTS.DEFAULTS.SHOW_ADVANCED_OPTIONS,
    collapseSimpleView: APP_CONSTANTS.DEFAULTS.COLLAPSE_SIMPLE_VIEW,
    rememberLastDatabase: APP_CONSTANTS.DEFAULTS.REMEMBER_LAST_DATABASE,
    
    // Email Processing
    attachmentHandling: APP_CONSTANTS.DEFAULTS.ATTACHMENT_HANDLING,
    attachmentDatabase: '',
    maxAttachmentSize: APP_CONSTANTS.DEFAULTS.MAX_ATTACHMENT_SIZE,
    processAttachmentsAfterSave: APP_CONSTANTS.DEFAULTS.PROCESS_ATTACHMENTS_AFTER_SAVE,
    cleanEmailBody: APP_CONSTANTS.DEFAULTS.CLEAN_EMAIL_BODY,
    removeQuotedText: APP_CONSTANTS.DEFAULTS.REMOVE_QUOTED_TEXT,
    includeEmailLinks: APP_CONSTANTS.DEFAULTS.INCLUDE_EMAIL_LINKS,
    maxBodyLength: APP_CONSTANTS.DEFAULTS.MAX_BODY_LENGTH,
    
    // Performance
    enableCaching: APP_CONSTANTS.DEFAULTS.ENABLE_CACHING,
    cacheDuration: APP_CONSTANTS.DEFAULTS.CACHE_DURATION,
    rateLimitDelay: APP_CONSTANTS.DEFAULTS.RATE_LIMIT_DELAY
  },
  
  SYSTEM: {
    initialized: false,
    lastConfigUpdate: null,
    configVersion: APP_CONSTANTS.APP.CONFIG_VERSION,
    requiredPropertiesVerified: false,
    keyValidation: {
      isValid: false,
      format: 'unknown',
      lastValidated: null
    },
    performance: {
      totalOperations: 0,
      successfulOperations: 0,
      averageResponseTime: 0
    }
  }
};

// =============================================================================
// ACCESSOR FUNCTIONS
// =============================================================================

/**
 * Get main constants object
 */
function getAppConstants() {
  return APP_CONSTANTS;
}

/**
 * Get API constants
 */
function getApiConstants() {
  return APP_CONSTANTS.API;
}

/**
 * Get storage keys
 */
function getStorageKeys() {
  return APP_CONSTANTS.STORAGE_KEYS;
}

/**
 * Get default settings
 */
function getDefaultSettings() {
  return APP_CONSTANTS.DEFAULTS;
}

/**
 * Get UI constants
 */
function getUiConstants() {
  return APP_CONSTANTS.UI;
}

/**
 * Get property constants
 */
function getPropertyConstants() {
  return APP_CONSTANTS.PROPERTIES;
}

/**
 * Get cache service
 */
function getCacheService() {
  return APP_CONSTANTS.CACHE.SCRIPT_CACHE;
}

/**
 * Get properties service
 */
function getPropertiesService() {
  return APP_CONSTANTS.CACHE.PROPERTIES;
}

/**
 * Create standardized error object
 */
function createG2NError(message, code) {
  return {
    message: message,
    code: code,
    timestamp: new Date().toISOString(),
    toString: function() {
      return `${this.code}: ${this.message}`;
    }
  };
}

/**
 * Get all G2N constants in a structured format
 */
function getG2NConstants() {
  const constants = getAppConstants();
  return {
    NOTION: {
      API_VERSION: constants.API.NOTION.VERSION,
      BASE_URL: constants.API.NOTION.BASE_URL,
      MAX_PAGE_SIZE: 100,
      RATE_LIMIT_DELAY: constants.API.RATE_LIMITS.RETRY_DELAY
    },
    GMAIL: {
      MAX_BODY_LENGTH: constants.GMAIL.MAX_BODY_LENGTH,
      MAX_ATTACHMENT_SIZE: constants.GMAIL.MAX_ATTACHMENT_SIZE,
      TRACKING_LABEL: constants.GMAIL.TRACKING_LABEL
    },
    APP: {
      VERSION: constants.APP.VERSION,
      CACHE_DURATION: constants.CACHE.TTL_SECONDS,
      MAX_RETRY_ATTEMPTS: constants.API.RATE_LIMITS.MAX_RETRIES,
      RETRY_DELAY: constants.API.RATE_LIMITS.RETRY_DELAY
    },
    PROPERTIES: {
      UNIQUE_MESSAGE_ID: constants.PROPERTIES.UNIQUE_MESSAGE_ID,
      SUBJECT: constants.PROPERTIES.SUBJECT,
      SENDER: constants.PROPERTIES.SENDER,
      DATE_SENT: constants.PROPERTIES.DATE_SENT,
      GMAIL_LINK: constants.PROPERTIES.GMAIL_LINK,
      BODY_PREVIEW: constants.PROPERTIES.BODY_PREVIEW
    },
    ERRORS: constants.ERRORS,
    UI: constants.UI,
    FUNCTION_NAMES: constants.FUNCTION_NAMES,
    FORM_INPUT_KEY: constants.FORM_INPUT_KEY,
    CONFIG_FIELDS: constants.CONFIG_FIELDS
  };
}

/**
 * Get function name constants for use in other files
 */
function getFunctionConstants() {
  return APP_CONSTANTS.FUNCTION_NAMES;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Notion API headers for API calls
 */
function getNotionAPIHeaders() {
  const config = getEnhancedG2NConfig();
  const constants = getAppConstants();
  
  return {
    'Authorization': `Bearer ${config.NOTION_API_KEY}`,
    'Notion-Version': constants.API.NOTION.VERSION,
    'Content-Type': 'application/json'
  };
}

/**
 * Get Gmail API headers for API calls
 */
function getGmailAPIHeaders() {
  return {
    'Authorization': `Bearer ${ScriptApp.getOAuthToken()}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Check if an error is retryable based on error patterns
 */
function isRetryableError(error) {
  const constants = getAppConstants();
  const errorMessage = error.toString().toLowerCase();
  
  for (const pattern of constants.ERROR_PATTERNS.RETRYABLE) {
    if (errorMessage.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get retry delay based on attempt number
 */
function getRetryDelay(attempt) {
  const constants = getAppConstants();
  return constants.RECOVERY.BACKOFF_BASE * Math.pow(constants.RECOVERY.BACKOFF_MULTIPLIER, attempt - 1);
}

/**
 * Validate database ID format
 */
function isValidDatabaseId(databaseId) {
  const constants = getAppConstants();
  return constants.PATTERNS.DATABASE_ID.test(databaseId);
}

/**
 * Validate Notion API key format
 */
function isValidNotionApiKey(apiKey) {
  const constants = getAppConstants();
  return constants.PATTERNS.NOTION_KEY.NTN_PATTERN.test(apiKey) || 
         constants.PATTERNS.NOTION_KEY.SECRET_PATTERN.test(apiKey);
}

/**
 * Get default property mappings for a database
 */
function getDefaultPropertyMappings(databaseId) {
  const constants = getAppConstants();
  
  return {
    subject: { type: 'title', name: 'Subject' },
    sender: { type: 'rich_text', name: 'From' },
    dateSent: { type: 'date', name: 'Date' },
    gmailLink: { type: 'url', name: 'Gmail Link' },
    uniqueMessageId: { type: 'rich_text', name: 'Unique Message ID' },
    databaseId: databaseId,
    createdAt: new Date().toISOString()
  };
}
// =============================================================================
// MISSING HELPER FUNCTIONS - ADD THESE
// =============================================================================

/**
 * Get default G2N configuration
 */
function getDefaultG2NConfig() {
  return {
    NOTION_API_KEY: '',
    DATABASES: {
      gmail: {
        id: '',
        name: '',
        lastVerified: null,
        propertyCount: 0,
        isAccessible: false
      },
      resources: {
        id: '',
        name: '',
        lastVerified: null,
        propertyCount: 0,
        isAccessible: false
      }
    },
    PROPERTY_MAPPINGS: {
      mappings: {},
      metadata: {
        lastUpdated: null,
        version: '1.0',
        databaseCount: 0,
        mappingCount: 0,
        autoGenerated: false
      }
    },
    SETTINGS: {
      autoCreateProperties: true,
      checkDuplicates: true,
      validateMappings: true,
      defaultSaveMode: 'quick',
      promptForMissingMappings: true,
      showMappingSuggestions: true,
      showAdvancedOptions: false,
      collapseSimpleView: false,
      rememberLastDatabase: true,
      attachmentHandling: 'none',
      attachmentDatabase: '',
      maxAttachmentSize: 10485760,
      processAttachmentsAfterSave: true,
      cleanEmailBody: true,
      removeQuotedText: true,
      includeEmailLinks: true,
      maxBodyLength: 10000,
      enableCaching: true,
      cacheDuration: 300,
      rateLimitDelay: 1000
    },
    SYSTEM: {
      initialized: false,
      lastConfigUpdate: null,
      configVersion: '2.1.0',
      requiredPropertiesVerified: false,
      keyValidation: {
        isValid: false,
        format: 'unknown',
        lastValidated: null
      },
      performance: {
        totalOperations: 0,
        successfulOperations: 0,
        averageResponseTime: 0
      }
    }
  };
}

/**
 * Quick constants test function
 */
function testG2NConstantsQuick() {
  const constants = getAppConstants();
  
  try {
    const checks = [
      { name: 'APP_CONSTANTS exists', check: !!constants },
      { name: 'UI constants exist', check: !!constants.UI },
      { name: 'API constants exist', check: !!constants.API },
      { name: 'FUNCTION_NAMES exist', check: !!constants.FUNCTION_NAMES },
      { name: 'G2N_APP_CONFIG exists', check: typeof G2N_APP_CONFIG !== 'undefined' }
    ];
    
    const passed = checks.filter(check => check.check).length;
    const total = checks.length;
    
    return {
      healthy: passed === total,
      checks: checks,
      passed: passed,
      total: total
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * Clear G2N cache
 */
function clearG2NCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(G2N_CONFIG_CACHE_KEY);
    console.log('✅ G2N cache cleared');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Build G2N error response
 */
function buildG2NErrorResponse(message) {
  return CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(message)))
    .build();
}

// ADD THIS FUNCTION - it's referenced but not defined
function getEnhancedG2NConfig() {
  // This should return your enhanced config
  return G2N_APP_CONFIG || getDefaultG2NConfig();
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize constants and verify structure
 */
function initializeG2NConstants() {
  try {
    const constants = getAppConstants();
    
    console.log('G2N Constants initialized:', {
      version: constants.APP.VERSION,
      functionCount: Object.keys(constants.FUNCTION_NAMES || {}).length,
      hasUI: !!constants.UI,
      hasAPI: !!constants.API
    });
    
    return {
      success: true,
      version: constants.APP.VERSION,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Failed to initialize constants:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize when script loads
initializeG2NConstants();

// Constants.gs
// =============================================================================
// GMAIL TO NOTION INTEGRATION - CONSTANTS FILE
// =============================================================================

/**
 * SAFE LOGGING FALLBACKS
 * Ensures logging functions exist even if Logger.gs hasn't loaded
 */
if (typeof g2nInfo === 'undefined') {
  var g2nInfo = function(source, message, details) {
    console.log('[INFO] [' + source + '] ' + message, details || '');
  };
}

if (typeof g2nError === 'undefined') {
  var g2nError = function(source, message, details) {
    console.error('[ERROR] [' + source + '] ' + message, details || '');
  };
}

if (typeof g2nWarn === 'undefined') {
  var g2nWarn = function(source, message, details) {
    console.warn('[WARN] [' + source + '] ' + message, details || '');
  };
}

if (typeof g2nDebug === 'undefined') {
  var g2nDebug = function(source, message, details) {
    console.log('[DEBUG] [' + source + '] ' + message, details || '');
  };
}

// =============================================================================
// ACCESSOR FUNCTIONS
// =============================================================================

/**
 * Get main constants object
 */
function getAppConstants() {
  return APP_CONSTANTS;
}

/**
 * Get API constants
 */
function getApiConstants() {
  return APP_CONSTANTS.API;
}

/**
 * Get storage keys
 */
function getStorageKeys() {
  return APP_CONSTANTS.STORAGE_KEYS;
}

/**
 * Get default settings
 */
function getDefaultSettings() {
  return APP_CONSTANTS.DEFAULTS;
}

/**
 * Get UI constants
 */
function getUiConstants() {
  return APP_CONSTANTS.UI;
}

/**
 * Get property constants
 */
function getPropertyConstants() {
  return APP_CONSTANTS.PROPERTIES;
}

/**
 * Get cache service
 */
function getCacheService() {
  return APP_CONSTANTS.CACHE.SCRIPT_CACHE;
}

/**
 * Get properties service
 */
function getPropertiesService() {
  return APP_CONSTANTS.CACHE.PROPERTIES;
}

/**
 * Create standardized error object
 */
function createG2NError(message, code) {
  return {
    message: message,
    code: code,
    timestamp: new Date().toISOString(),
    toString: function() {
      return `${this.code}: ${this.message}`;
    }
  };
}

/**
 * Get all G2N constants in a structured format
 */
function getG2NConstants() {
  const constants = getAppConstants();
  return {
    NOTION: {
      API_VERSION: constants.API.NOTION.VERSION,
      BASE_URL: constants.API.NOTION.BASE_URL,
      MAX_PAGE_SIZE: 100,
      RATE_LIMIT_DELAY: constants.API.RATE_LIMITS.RETRY_DELAY
    },
    GMAIL: {
      MAX_BODY_LENGTH: constants.GMAIL.MAX_BODY_LENGTH,
      MAX_ATTACHMENT_SIZE: constants.GMAIL.MAX_ATTACHMENT_SIZE,
      TRACKING_LABEL: constants.GMAIL.TRACKING_LABEL
    },
    APP: {
      VERSION: constants.APP.VERSION,
      CACHE_DURATION: constants.CACHE.TTL_SECONDS,
      MAX_RETRY_ATTEMPTS: constants.API.RATE_LIMITS.MAX_RETRIES,
      RETRY_DELAY: constants.API.RATE_LIMITS.RETRY_DELAY
    },
    PROPERTIES: {
      UNIQUE_MESSAGE_ID: constants.PROPERTIES.UNIQUE_MESSAGE_ID,
      SUBJECT: constants.PROPERTIES.SUBJECT,
      SENDER: constants.PROPERTIES.SENDER,
      DATE_SENT: constants.PROPERTIES.DATE_SENT,
      GMAIL_LINK: constants.PROPERTIES.GMAIL_LINK,
      BODY_PREVIEW: constants.PROPERTIES.BODY_PREVIEW
    },
    ERRORS: constants.ERRORS,
    UI: constants.UI,
    FUNCTION_NAMES: constants.FUNCTION_NAMES,
    FORM_INPUT_KEY: constants.FORM_INPUT_KEY,
    CONFIG_FIELDS: constants.CONFIG_FIELDS
  };
}

/**
 * Get function name constants for use in other files
 */
function getFunctionConstants() {
  return APP_CONSTANTS.FUNCTION_NAMES;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Notion API headers for API calls
 */
function getNotionAPIHeaders() {
  const config = getEnhancedG2NConfig();
  const constants = getAppConstants();
  
  return {
    'Authorization': `Bearer ${config.NOTION_API_KEY}`,
    'Notion-Version': constants.API.NOTION.VERSION,
    'Content-Type': 'application/json'
  };
}

/**
 * Get Gmail API headers for API calls
 */
function getGmailAPIHeaders() {
  return {
    'Authorization': `Bearer ${ScriptApp.getOAuthToken()}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Check if an error is retryable based on error patterns
 */
function isRetryableError(error) {
  const constants = getAppConstants();
  const errorMessage = error.toString().toLowerCase();
  
  for (const pattern of constants.ERROR_PATTERNS.RETRYABLE) {
    if (errorMessage.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get retry delay based on attempt number
 */
function getRetryDelay(attempt) {
  const constants = getAppConstants();
  return constants.RECOVERY.BACKOFF_BASE * Math.pow(constants.RECOVERY.BACKOFF_MULTIPLIER, attempt - 1);
}

/**
 * Validate database ID format
 */
function isValidDatabaseId(databaseId) {
  const constants = getAppConstants();
  return constants.PATTERNS.DATABASE_ID.test(databaseId);
}

/**
 * Validate Notion API key format
 */
function isValidNotionApiKey(apiKey) {
  const constants = getAppConstants();
  return constants.PATTERNS.NOTION_KEY.NTN_PATTERN.test(apiKey) || 
         constants.PATTERNS.NOTION_KEY.SECRET_PATTERN.test(apiKey);
}

/**
 * Get default property mappings for a database
 */
function getDefaultPropertyMappings(databaseId) {
  const constants = getAppConstants();
  
  return {
    subject: { type: 'title', name: 'Subject' },
    sender: { type: 'rich_text', name: 'From' },
    dateSent: { type: 'date', name: 'Date' },
    gmailLink: { type: 'url', name: 'Gmail Link' },
    uniqueMessageId: { type: 'rich_text', name: 'Unique Message ID' },
    databaseId: databaseId,
    createdAt: new Date().toISOString()
  };
}

// =============================================================================
// MISSING HELPER FUNCTIONS - ADD THESE
// =============================================================================

/**
 * Get default G2N configuration
 */
function getDefaultG2NConfig() {
  return {
    NOTION_API_KEY: '',
    DATABASES: {
      gmail: {
        id: '',
        name: '',
        lastVerified: null,
        propertyCount: 0,
        isAccessible: false
      },
      resources: {
        id: '',
        name: '',
        lastVerified: null,
        propertyCount: 0,
        isAccessible: false
      }
    },
    PROPERTY_MAPPINGS: {
      mappings: {},
      metadata: {
        lastUpdated: null,
        version: '1.0',
        databaseCount: 0,
        mappingCount: 0,
        autoGenerated: false
      }
    },
    SETTINGS: {
      autoCreateProperties: true,
      checkDuplicates: true,
      validateMappings: true,
      defaultSaveMode: 'quick',
      promptForMissingMappings: true,
      showMappingSuggestions: true,
      showAdvancedOptions: false,
      collapseSimpleView: false,
      rememberLastDatabase: true,
      attachmentHandling: 'none',
      attachmentDatabase: '',
      maxAttachmentSize: 10485760,
      processAttachmentsAfterSave: true,
      cleanEmailBody: true,
      removeQuotedText: true,
      includeEmailLinks: true,
      maxBodyLength: 10000,
      enableCaching: true,
      cacheDuration: 300,
      rateLimitDelay: 1000
    },
    SYSTEM: {
      initialized: false,
      lastConfigUpdate: null,
      configVersion: '2.1.0',
      requiredPropertiesVerified: false,
      keyValidation: {
        isValid: false,
        format: 'unknown',
        lastValidated: null
      },
      performance: {
        totalOperations: 0,
        successfulOperations: 0,
        averageResponseTime: 0
      }
    }
  };
}


/**
 * Quick constants test function
 */
function testG2NConstantsQuick() {
  const constants = getAppConstants();
  
  try {
    const checks = [
      { name: 'APP_CONSTANTS exists', check: !!constants },
      { name: 'UI constants exist', check: !!constants.UI },
      { name: 'API constants exist', check: !!constants.API },
      { name: 'FUNCTION_NAMES exist', check: !!constants.FUNCTION_NAMES },
      { name: 'G2N_APP_CONFIG exists', check: typeof G2N_APP_CONFIG !== 'undefined' }
    ];
    
    const passed = checks.filter(check => check.check).length;
    const total = checks.length;
    
    return {
      healthy: passed === total,
      checks: checks,
      passed: passed,
      total: total
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * Clear G2N cache
 */
function clearG2NCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove(G2N_CONFIG_CACHE_KEY);
    console.log('✅ G2N cache cleared');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Build G2N error response
 */
function buildG2NErrorResponse(message) {
  return CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(message)))
    .build();
}

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize constants and verify structure
 */
function initializeG2NConstants() {
  try {
    const constants = getAppConstants();
    
    console.log('G2N Constants initialized:', {
      version: constants.APP.VERSION,
      functionCount: Object.keys(constants.FUNCTION_NAMES || {}).length,
      hasUI: !!constants.UI,
      hasAPI: !!constants.API
    });
    
    return {
      success: true,
      version: constants.APP.VERSION,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Failed to initialize constants:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Initialize when script loads
initializeG2NConstants();

// =============================================================================
// TESTING SYSTEM (MOVED TO BOTTOM FOR BETTER ORGANIZATION)
// =============================================================================

/**
 * Comprehensive constants validation system
 */
const G2N_CONSTANTS_TESTER = {
  
  /**
   * Test all constants for existence and structure
   */
  testAllConstants: function() {
    const tests = [];
    const constants = getAppConstants();
    
    g2nInfo('ConstantsTest', 'Starting comprehensive constants validation');
    
    // Run all tests
    tests.push(this.testBasicStructure(constants));
    tests.push(this.testRequiredSections(constants));
    tests.push(this.testApiConstants(constants.API));
    tests.push(this.testUiConstants(constants.UI));
    tests.push(this.testFunctionNames(constants.FUNCTION_NAMES));
    tests.push(this.testStorageKeys(constants.STORAGE_KEYS));
    tests.push(this.testPropertyMappings(constants.PROPERTY_MAPPINGS));
    tests.push(this.testErrorConstants(constants.ERRORS));
    tests.push(this.testGmailConstants(constants.GMAIL));
    tests.push(this.testCrossFileConstants());
    tests.push(this.testConfigObject());
    tests.push(this.testAccessorFunctions());
    
    const summary = this.generateTestSummary(tests);
    
    g2nInfo('ConstantsTest', 'Constants validation completed', summary);
    
    return {
      success: summary.passed === summary.total,
      summary: summary,
      details: tests,
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Test basic APP_CONSTANTS structure
   */
  testBasicStructure: function(constants) {
    const test = { name: 'Basic Structure', passed: false, issues: [] };
    
    try {
      if (!constants) {
        test.issues.push('APP_CONSTANTS is undefined');
        return test;
      }
      
      if (typeof constants !== 'object') {
        test.issues.push('APP_CONSTANTS is not an object');
        return test;
      }
      
      // Check required top-level keys
      const requiredKeys = ['APP', 'API', 'UI', 'STORAGE_KEYS', 'FUNCTION_NAMES'];
      for (const key of requiredKeys) {
        if (!constants[key]) {
          test.issues.push(`Missing required key: ${key}`);
        }
      }
      
      // Check APP section
      if (constants.APP) {
        if (!constants.APP.VERSION) test.issues.push('APP.VERSION missing');
        if (!constants.APP.NAME) test.issues.push('APP.NAME missing');
      }
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Test required sections exist
   */
  testRequiredSections: function(constants) {
    const test = { name: 'Required Sections', passed: false, issues: [] };
    const sections = [
      'CACHE', 'API', 'STORAGE_KEYS', 'LOGGING', 'ERROR_CODES', 'RECOVERY',
      'GMAIL', 'SEARCH', 'ERROR_PATTERNS', 'PATTERNS', 'VALIDATION_LIMITS',
      'REQUIRED_FIELDS', 'DEFAULTS', 'UI', 'ERRORS', 'PROPERTIES', 'DATABASES',
      'WORKFLOW', 'PROPERTY_MAPPINGS', 'FUNCTION_NAMES', 'CARD_BUILDER_METHODS',
      'LOGGING_SECTIONS', 'ACTION_RESPONSE_TYPES', 'CONFIG_FIELDS'
    ];
    
    try {
      for (const section of sections) {
        if (!constants[section]) {
          test.issues.push(`Missing section: ${section}`);
        }
      }
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Test API constants
   */
  testApiConstants: function(apiConstants) {
    const test = { name: 'API Constants', passed: false, issues: [] };
    
    try {
      if (!apiConstants) {
        test.issues.push('API constants are undefined');
        return test;
      }
      
      if (!apiConstants.NOTION) test.issues.push('NOTION API constants missing');
      if (!apiConstants.GMAIL) test.issues.push('GMAIL API constants missing');
      
      if (apiConstants.NOTION) {
        if (!apiConstants.NOTION.BASE_URL) test.issues.push('NOTION.BASE_URL missing');
        if (!apiConstants.NOTION.VERSION) test.issues.push('NOTION.VERSION missing');
        if (!apiConstants.NOTION.ENDPOINTS) test.issues.push('NOTION.ENDPOINTS missing');
      }
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Test UI constants
   */
  testUiConstants: function(uiConstants) {
    const test = { name: 'UI Constants', passed: false, issues: [] };
    
    try {
      if (!uiConstants) {
        test.issues.push('UI constants are undefined');
        return test;
      }
      
      if (!uiConstants.ICONS) test.issues.push('UI.ICONS missing');
      if (!uiConstants.MESSAGES) test.issues.push('UI.MESSAGES missing');
      if (!uiConstants.COLORS) test.issues.push('UI.COLORS missing');
      
      // Check for new setup wizard messages
      if (uiConstants.MESSAGES && !uiConstants.MESSAGES.SETUP_WIZARD) {
        test.issues.push('UI.MESSAGES.SETUP_WIZARD missing');
      }
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Test function names
   */
  testFunctionNames: function(functionNames) {
    const test = { name: 'Function Names', passed: false, issues: [] };
    
    try {
      if (!functionNames) {
        test.issues.push('Function names are undefined');
        return test;
      }
      
      // Check for required function names
      const requiredFunctions = [
        'UNIFIED_SAVE', 'SHOW_SETUP_WIZARD', 'BUILD_SIMPLIFIED_HOMEPAGE',
        'SAVE_ADVANCED_MAPPING', 'ON_DATABASE_SELECTED'
      ];
      
      for (const funcName of requiredFunctions) {
        if (!functionNames[funcName]) {
          test.issues.push(`Required function name missing: ${funcName}`);
        }
      }
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Test storage keys
   */
  testStorageKeys: function(storageKeys) {
    const test = { name: 'Storage Keys', passed: false, issues: [] };
    
    try {
      if (!storageKeys) {
        test.issues.push('Storage keys are undefined');
        return test;
      }
      
      const requiredKeys = ['NOTION_API_KEY', 'GMAIL_DB_ID', 'PROPERTY_MAPPINGS'];
      for (const key of requiredKeys) {
        if (!storageKeys[key]) {
          test.issues.push(`Required storage key missing: ${key}`);
        }
      }
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Test property mappings
   */
  testPropertyMappings: function(propertyMappings) {
    const test = { name: 'Property Mappings', passed: false, issues: [] };
    
    try {
      if (!propertyMappings) {
        test.issues.push('Property mappings are undefined');
        return test;
      }
      
      if (!propertyMappings.SELECTABLE_PROPERTIES) {
        test.issues.push('SELECTABLE_PROPERTIES missing');
      }
      
      if (!propertyMappings.MAPPABLE_PROPERTIES) {
        test.issues.push('MAPPABLE_PROPERTIES missing');
      }
      
      if (!propertyMappings.EMAIL_FIELDS) {
        test.issues.push('EMAIL_FIELDS missing');
      }
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Test error constants
   */
  testErrorConstants: function(errors) {
    const test = { name: 'Error Constants', passed: false, issues: [] };
    
    try {
      if (!errors) {
        test.issues.push('Error constants are undefined');
        return test;
      }
      
      const requiredErrors = [
        'NOTION_CONNECTION', 'NOTION_PERMISSION', 'GMAIL_ACCESS', 'CONFIG_INVALID'
      ];
      
      for (const error of requiredErrors) {
        if (!errors[error]) {
          test.issues.push(`Required error message missing: ${error}`);
        }
      }
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Test Gmail constants
   */
  testGmailConstants: function(gmailConstants) {
    const test = { name: 'Gmail Constants', passed: false, issues: [] };
    
    try {
      if (!gmailConstants) {
        test.issues.push('Gmail constants are undefined');
        return test;
      }
      
      if (!gmailConstants.MAX_BODY_LENGTH) test.issues.push('MAX_BODY_LENGTH missing');
      if (!gmailConstants.MAX_ATTACHMENT_SIZE) test.issues.push('MAX_ATTACHMENT_SIZE missing');
      if (!gmailConstants.TRACKING_LABEL) test.issues.push('TRACKING_LABEL missing');
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Test cross-file constants
   */
  testCrossFileConstants: function() {
    const test = { name: 'Cross-File Constants', passed: false, issues: [] };
    
    try {
      // Test accessor functions
      if (typeof getAppConstants !== 'function') {
        test.issues.push('getAppConstants function missing');
      }
      
      if (typeof getUiConstants !== 'function') {
        test.issues.push('getUiConstants function missing');
      }
      
      if (typeof getFunctionConstants !== 'function') {
        test.issues.push('getFunctionConstants function missing');
      }
      
      // Test helper functions
      if (typeof getNotionAPIHeaders !== 'function') {
        test.issues.push('getNotionAPIHeaders function missing');
      }
      
      if (typeof isValidDatabaseId !== 'function') {
        test.issues.push('isValidDatabaseId function missing');
      }
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Test configuration object
   */
  testConfigObject: function() {
    const test = { name: 'Configuration Object', passed: false, issues: [] };
    
    try {
      if (typeof G2N_APP_CONFIG === 'undefined') {
        test.issues.push('G2N_APP_CONFIG is undefined');
        return test;
      }
      
      if (!G2N_APP_CONFIG.NOTION_API_KEY) test.issues.push('NOTION_API_KEY field missing');
      if (!G2N_APP_CONFIG.DATABASES) test.issues.push('DATABASES field missing');
      if (!G2N_APP_CONFIG.PROPERTY_MAPPINGS) test.issues.push('PROPERTY_MAPPINGS field missing');
      if (!G2N_APP_CONFIG.SETTINGS) test.issues.push('SETTINGS field missing');
      if (!G2N_APP_CONFIG.SYSTEM) test.issues.push('SYSTEM field missing');
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Test accessor functions
   */
  testAccessorFunctions: function() {
    const test = { name: 'Accessor Functions', passed: false, issues: [] };
    
    try {
      const constants = getAppConstants();
      if (!constants) {
        test.issues.push('getAppConstants returned undefined');
      }
      
      const uiConstants = getUiConstants();
      if (!uiConstants) {
        test.issues.push('getUiConstants returned undefined');
      }
      
      const functionConstants = getFunctionConstants();
      if (!functionConstants) {
        test.issues.push('getFunctionConstants returned undefined');
      }
      
      const g2nConstants = getG2NConstants();
      if (!g2nConstants) {
        test.issues.push('getG2NConstants returned undefined');
      }
      
      test.passed = test.issues.length === 0;
      
    } catch (error) {
      test.issues.push(`Test error: ${error.message}`);
    }
    
    return test;
  },
  
  /**
   * Generate test summary
   */
  generateTestSummary: function(tests) {
    const passed = tests.filter(test => test.passed).length;
    const total = tests.length;
    
    return {
      total: total,
      passed: passed,
      failed: total - passed,
      successRate: Math.round((passed / total) * 100),
      timestamp: new Date().toISOString()
    };
  },
  
  /**
   * Quick health check for constants
   */
  quickHealthCheck: function() {
    const constants = getAppConstants();
    const checks = [];
    
    // Quick essential checks
    checks.push({ check: 'APP_CONSTANTS exists', passed: !!constants });
    checks.push({ check: 'API constants exist', passed: !!constants?.API });
    checks.push({ check: 'UI constants exist', passed: !!constants?.UI });
    checks.push({ check: 'Function names exist', passed: !!constants?.FUNCTION_NAMES });
    checks.push({ check: 'G2N_APP_CONFIG exists', passed: typeof G2N_APP_CONFIG !== 'undefined' });
    
    // Check for new additions
    checks.push({ check: 'Setup Wizard messages exist', passed: !!constants?.UI?.MESSAGES?.SETUP_WIZARD });
    checks.push({ check: 'New function names exist', passed: !!constants?.FUNCTION_NAMES?.UNIFIED_SAVE });
    checks.push({ check: 'Performance thresholds exist', passed: !!constants?.PERFORMANCE?.THRESHOLDS });
    
    const allPassed = checks.every(check => check.passed);
    
    return {
      healthy: allPassed,
      checks: checks,
      timestamp: new Date().toISOString()
    };
  }
};

// =============================================================================
// TEST FUNCTIONS FOR APPS SCRIPT EDITOR
// =============================================================================

/**
 * Quick Health Check (Run in Apps Script Editor)
 */
function testConstantsQuick() {
  try {
    console.log('🧪 Running Quick Constants Health Check...');
    const result = G2N_CONSTANTS_TESTER.quickHealthCheck();
    
    console.log('=== QUICK HEALTH CHECK RESULTS ===');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.healthy) {
      console.log('✅ All essential constants are healthy!');
    } else {
      console.log('❌ Constants have issues. Run testConstantsFull() for details.');
    }
    
    return result;
  } catch (error) {
    console.error('Quick test failed:', error);
    return { healthy: false, error: error.message };
  }
}

/**
 * Comprehensive Test (Run in Apps Script Editor)
 */
function testConstantsFull() {
  try {
    console.log('🔍 Running Comprehensive Constants Test...');
    const result = G2N_CONSTANTS_TESTER.testAllConstants();
    
    console.log('=== COMPREHENSIVE TEST RESULTS ===');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 All constants passed comprehensive testing!');
    } else {
      console.log('💥 Some constants failed. Check the report above for details.');
    }
    
    return result;
  } catch (error) {
    console.error('Comprehensive test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Run All Tests (Run in Apps Script Editor)
 */
function runAllConstantTests() {
  console.log('🚀 Running All Constant Tests...\n');
  
  const tests = [
    { name: 'Quick Health Check', func: testConstantsQuick },
    { name: 'Comprehensive Test', func: testConstantsFull }
  ];
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n=== Running ${test.name} ===`);
    try {
      const result = test.func();
      const success = result.healthy !== undefined ? result.healthy : 
                     result.success !== undefined ? result.success : false;
      
      if (success) {
        passed++;
        console.log(`✅ ${test.name}: PASSED`);
      } else {
        failed++;
        console.log(`❌ ${test.name}: FAILED`);
      }
      
      results.push({
        test: test.name,
        passed: success,
        result: result
      });
      
    } catch (error) {
      failed++;
      console.log(`💥 ${test.name}: ERROR - ${error.message}`);
      results.push({
        test: test.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  console.log('\n🎯 FINAL TEST SUMMARY =================');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Your constants are perfectly configured.');
  } else {
    console.log('⚠️  Some tests failed. Check the individual test results above.');
  }
  
  return {
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: Math.round((passed / tests.length) * 100)
    },
    details: results,
    timestamp: new Date().toISOString()
  };
}

// =============================================================================
// TEST FUNCTIONS FOR APPS SCRIPT EDITOR
// =============================================================================

/**
 * Quick Health Check (Run in Apps Script Editor)
 */
function testConstantsQuick() {
  try {
    console.log('🧪 Running Quick Constants Health Check...');
    const result = G2N_CONSTANTS_TESTER.quickHealthCheck();
    
    console.log('=== QUICK HEALTH CHECK RESULTS ===');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.healthy) {
      console.log('✅ All essential constants are healthy!');
    } else {
      console.log('❌ Constants have issues. Run testConstantsFull() for details.');
    }
    
    return result;
  } catch (error) {
    console.error('Quick test failed:', error);
    return { healthy: false, error: error.message };
  }
}

/**
 * Comprehensive Test (Run in Apps Script Editor)
 */
function testConstantsFull() {
  try {
    console.log('🔍 Running Comprehensive Constants Test...');
    const result = G2N_CONSTANTS_TESTER.testAllConstants();
    
    console.log('=== COMPREHENSIVE TEST RESULTS ===');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('🎉 All constants passed comprehensive testing!');
    } else {
      console.log('💥 Some constants failed. Check the report above for details.');
    }
    
    return result;
  } catch (error) {
    console.error('Comprehensive test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Run All Tests (Run in Apps Script Editor)
 */
function runAllConstantTests() {
  console.log('🚀 Running All Constant Tests...\n');
  
  const tests = [
    { name: 'Quick Health Check', func: testConstantsQuick },
    { name: 'Comprehensive Test', func: testConstantsFull }
  ];
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n=== Running ${test.name} ===`);
    try {
      const result = test.func();
      const success = result.healthy !== undefined ? result.healthy : 
                     result.success !== undefined ? result.success : false;
      
      if (success) {
        passed++;
        console.log(`✅ ${test.name}: PASSED`);
      } else {
        failed++;
        console.log(`❌ ${test.name}: FAILED`);
      }
      
      results.push({
        test: test.name,
        passed: success,
        result: result
      });
      
    } catch (error) {
      failed++;
      console.log(`💥 ${test.name}: ERROR - ${error.message}`);
      results.push({
        test: test.name,
        passed: false,
        error: error.message
      });
    }
  }
  
  console.log('\n🎯 FINAL TEST SUMMARY =================');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Your constants are perfectly configured.');
  } else {
    console.log('⚠️  Some tests failed. Check the individual test results above.');
  }
  
  return {
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: Math.round((passed / tests.length) * 100)
    },
    details: results,
    timestamp: new Date().toISOString()
  };
}

// =============================================================================
// EXPORT FOR TESTING
// =============================================================================

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    APP_CONSTANTS,
    G2N_APP_CONFIG,
    getAppConstants,
    getApiConstants,
    getStorageKeys,
    getDefaultSettings,
    getUiConstants,
    getPropertyConstants,
    getCacheService,
    getPropertiesService,
    getG2NConstants,
    getFunctionConstants,
    createG2NError,
    initializeG2NConstants,
    G2N_CONSTANTS_TESTER,
    testConstantsQuick,
    testConstantsFull,
    runAllConstantTests
  };
}
// =============================================================================
// LOGGING FUNCTIONS - ADD THESE TO MAIN.GS OR CONSTANTS.GS
// =============================================================================

/**
 * Start timer for performance tracking
 */
function g2nStartTimer() {
  return new Date().getTime();
}

/**
 * Log function entry - ADD THIS FUNCTION
 */
function g2nFunctionEntry(functionName, details) {
  console.log('[' + functionName + '] START', details || '');
}

/**
 * Log function exit - ADD THIS FUNCTION
 */
function g2nFunctionExit(functionName, details, startTime) {
  const duration = new Date().getTime() - startTime;
  const status = details.success ? 'SUCCESS' : 'ERROR';
  console.log('[' + functionName + '] ' + status, { ...details, duration: duration });
}

/**
 * Log info message
 */
function g2nInfo(source, message, details) {
  console.log('[INFO] ' + source + ' - ' + message, details || '');
}

/**
 * Log error message
 */
function g2nError(source, message, details) {
  console.error('[ERROR] ' + source + ' - ' + message, details || '');
}

/**
 * Log warning message
 */
function g2nWarn(source, message, details) {
  console.warn('[WARN] ' + source + ' - ' + message, details || '');
}

/**
 * Log performance metrics
 */
function g2nPerf(source, operation, startTime, details) {
  const duration = new Date().getTime() - startTime;
  console.log('[PERF] ' + source + ' - ' + operation, { ...details, duration: duration });
}

