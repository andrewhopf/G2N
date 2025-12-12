// NotionService.gs 
// =============================================================================
// NOTION API SERVICE WITH BLOCK SUPPORT
// =============================================================================

/**
 * Notion API Service Class - SIMPLE FIXED VERSION
 */
class NotionService {
  constructor() {
    try {
      this.constants = getAppConstants();
      // Simple logger that won't fail
      this.logger = {
        info: (method, message, details) => console.log(`[INFO] [NotionService.${method}] ${message}`, details || ''),
        error: (method, message, details) => console.error(`[ERROR] [NotionService.${method}] ${message}`, details || ''),
        warn: (method, message, details) => console.warn(`[WARN] [NotionService.${method}] ${message}`, details || ''),
        debug: (method, message, details) => console.log(`[DEBUG] [NotionService.${method}] ${message}`, details || ''),
        startTimer: () => new Date().getTime(),
        functionEntry: (method, params) => console.log(`[ENTRY] [NotionService.${method}] START`, params || ''),
        functionExit: (method, result, startTime) => {
          const duration = startTime ? new Date().getTime() - startTime : 0;
          console.log(`[EXIT] [NotionService.${method}] EXIT (${duration}ms)`, result || '');
        },
        performance: (method, operation, startTime, details) => {
          const duration = new Date().getTime() - startTime;
          console.log(`[PERF] [NotionService.${method}] ${operation} (${duration}ms)`, details || '');
          return duration;
        }
      };
      this.initializeG2NNotionService();
    } catch (error) {
      console.error('Failed to initialize NotionService:', error);
      // Emergency fallback
      this.constants = { API: { NOTION: { BASE_URL: 'https://api.notion.com/v1/', VERSION: '2022-06-28' } } };
      this.logger = {
        info: () => {}, error: () => {}, warn: () => {}, debug: () => {},
        startTimer: () => new Date().getTime(),
        functionEntry: () => {}, functionExit: () => {}, performance: () => 0
      };
    }
  }

  /**
   * Get Notion API headers with error handling
   */
  getNotionHeaders() {
    try {
      const config = getEnhancedG2NConfig();
      
      if (!config.NOTION_API_KEY) {
        throw new Error('No Notion API key configured. Please check your settings.');
      }
      
      // Validate API key format
      if (!config.NOTION_API_KEY.startsWith('ntn_') && !config.NOTION_API_KEY.startsWith('secret_')) {
        throw new Error('Invalid Notion API key format. Should start with "ntn_" or "secret_".');
      }
      
      return {
        'Authorization': 'Bearer ' + config.NOTION_API_KEY,
        'Notion-Version': this.constants.API.NOTION.VERSION,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('Error getting Notion headers: ' + error);
      throw error;
    }
  }

  /**
   * Safe API call with comprehensive error handling
   */
  makeNotionApiCall(url, options) {
    try {
      console.log('🌐 Making Notion API call to: ' + url);
      
      const defaultOptions = {
        'muteHttpExceptions': true,
        'headers': this.getNotionHeaders()
      };
      
      // Merge options
      const finalOptions = {};
      for (const key in defaultOptions) {
        if (defaultOptions.hasOwnProperty(key)) {
          finalOptions[key] = defaultOptions[key];
        }
      }
      for (const key in options) {
        if (options.hasOwnProperty(key)) {
          finalOptions[key] = options[key];
        }
      }
      
      console.log('🔧 Request options:', {
        method: finalOptions.method || 'GET',
        url: url,
        hasPayload: !!finalOptions.payload
      });
      
      let response;
      try {
        response = UrlFetchApp.fetch(url, finalOptions);
      } catch (fetchError) {
        console.error('❌ Network error fetching URL: ' + fetchError);
        throw new Error('Network error: Cannot reach Notion API. Check your internet connection and API key.');
      }
      
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      console.log('📡 Response status: ' + responseCode);
      
      if (responseCode === 200 || responseCode === 201) {
        try {
          return JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ Failed to parse JSON response: ' + parseError);
          throw new Error('Invalid response from Notion API');
        }
      } else if (responseCode === 401) {
        throw new Error('Invalid Notion API key. Please check your integration settings.');
      } else if (responseCode === 403) {
        throw new Error('Notion integration lacks permissions. Please check your integration settings.');
      } else if (responseCode === 404) {
        throw new Error('Resource not found. Please check your database ID.');
      } else if (responseCode === 429) {
        throw new Error('Notion API rate limit exceeded. Please try again in a moment.');
      } else if (responseCode >= 500) {
        throw new Error('Notion API server error. Please try again later.');
      } else {
        console.error('❌ Notion API error: ' + responseCode + ' ' + responseText);
        let errorMessage = 'Notion API error (' + responseCode + ')';
        try {
          const errorObj = JSON.parse(responseText);
          if (errorObj && errorObj.message) {
            errorMessage += ': ' + errorObj.message;
          }
        } catch (e) {
          errorMessage += ': ' + responseText.substring(0, 100);
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('💥 Notion API call failed: ' + error);
      throw error;
    }
  }

  /**
   * Verify database access
   */
  verifyG2NDatabaseAccess(databaseId) {
    try {
      console.log('🔍 Verifying access to database: ' + databaseId);
      
      if (!databaseId) {
        throw new Error('No database ID provided');
      }
      
      const url = this.constants.API.NOTION.BASE_URL + 'databases/' + databaseId;
      
      return this.makeNotionApiCall(url, {
        method: 'GET'
      });
      
    } catch (error) {
      console.error('❌ Database verification error: ' + error);
      throw new Error('Cannot access database: ' + error.message);
    }
  }

  /**
   * Create page in database
   */
  createPageInDatabase(databaseId, properties) {
    try {
      console.log('📝 Creating page in database: ' + databaseId);
      
      const url = this.constants.API.NOTION.BASE_URL + 'pages';
      
      const payload = {
        parent: { database_id: databaseId },
        properties: properties
      };
      
      console.log('🚀 Sending page creation request');
      console.log('📦 Properties: ' + Object.keys(properties));
      
      return this.makeNotionApiCall(url, {
        method: 'POST',
        payload: JSON.stringify(payload)
      });
      
    } catch (error) {
      console.error('❌ Page creation error: ' + error);
      throw error;
    }
  }

  /**
   * Append block children to a page - CRITICAL METHOD FOR EMAIL BODY
   */
  appendBlockChildren(blockId, children) {
    try {
      console.log('📝 Appending ' + children.length + ' blocks to: ' + blockId);
      
      const url = this.constants.API.NOTION.BASE_URL + 'blocks/' + blockId + '/children';
      
      const payload = {
        children: children
      };
      
      console.log('🚀 Sending block append request to: ' + url);
      console.log('📦 First block sample: ' + JSON.stringify(children[0], null, 2));
      
      return this.makeNotionApiCall(url, {
        method: 'PATCH',
        payload: JSON.stringify(payload)
      });
      
    } catch (error) {
      console.error('❌ Block append error: ' + error);
      throw error;
    }
  }

/**
 * Fetch databases with caching - SIMPLE WORKING VERSION - FIXED
 */
fetchG2NDatabasesWithCache() {
  console.log('🗄️ Fetching databases from Notion...');
  
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'notion_databases';
    
    // Try to get from cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      try {
        const databases = JSON.parse(cached);
        if (databases && databases.length > 0) {
          console.log(`✅ Using cached databases: ${databases.length} databases`);
          return databases;
        }
      } catch (parseError) {
        console.warn('Failed to parse cached databases:', parseError.message);
      }
    }
    
    // Fetch from API
    const searchResponse = this.sendG2NNotionRequest('search', 'POST', {
      filter: { property: 'object', value: 'database' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' }
    });
    
    if (!searchResponse.results) {
      throw new Error('No results in search response');
    }
    
    const databases = searchResponse.results.map(db => {
      let dbName = 'Untitled Database';
      if (db.title && db.title.length > 0 && db.title[0].plain_text) {
        dbName = db.title[0].plain_text;
      } else if (db.id) {
        dbName = `Database (${db.id.substring(0, 8)}...)`;
      }
      return { name: dbName, id: db.id };
    });
    
    // Cache the results
    if (databases.length > 0) {
      cache.put(cacheKey, JSON.stringify(databases), 300); // 5 minutes
      console.log(`💾 Cached ${databases.length} databases`);
    }
    
    console.log(`✅ Found ${databases.length} databases`);
    return databases;
    
  } catch (error) {
    console.error('❌ Failed to fetch databases:', error.message);
    return [];
  }
} // ✅ FIXED: Added the missing closing brace

  /**
   * Search databases directly (without cache)
   */
  searchDatabases() {
    try {
      console.log('🔍 Searching for databases...');
      
      const url = this.constants.API.NOTION.BASE_URL + 'search';
      
      const payload = {
        filter: {
          property: 'object',
          value: 'database'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      };
      
      const response = this.makeNotionApiCall(url, {
        method: 'POST',
        payload: JSON.stringify(payload)
      });
      
      if (response && response.results) {
        console.log('✅ Found ' + response.results.length + ' databases');
        return response.results;
      } else {
        console.warn('⚠️ No databases found in response');
        return [];
      }
    } catch (error) {
      console.error('❌ Database search failed: ' + error);
      throw error;
    }
  }

  /**
   * Clear database cache
   */
  clearDatabaseCache() {
    try {
      const cache = CacheService.getScriptCache();
      cache.remove('g2n_databases_cache');
      console.log('✅ Database cache cleared');
    } catch (error) {
      console.error('❌ Cache clear error: ' + error);
    }
  }

  /**
   * Test API connection
   */
  testConnection() {
    try {
      console.log('🧪 Testing Notion API connection...');
      
      const url = this.constants.API.NOTION.BASE_URL + 'users/me';
      
      const userInfo = this.makeNotionApiCall(url, {
        method: 'GET'
      });
      
      console.log('✅ Connection test successful');
      return {
        success: true,
        user: userInfo,
        message: 'Notion API connection successful!'
      };
      
    } catch (error) {
      console.error('❌ Connection test failed: ' + error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test block creation functionality
   */
  testBlockCreation() {
    try {
      console.log('🧪 Testing block creation...');
      
      const config = getEnhancedG2NConfig();
      const databaseId = config.DATABASES.gmail.id;
      
      if (!databaseId) {
        throw new Error('No database configured');
      }
      
      // Create a test page first
      const testPage = this.createPageInDatabase(databaseId, {
        'Task': { title: [{ text: { content: 'Block Creation Test - ' + new Date().toLocaleString() } }] },
        'Message ID': { rich_text: [{ text: { content: 'test-block-' + Date.now() } }] }
      });
      
      if (!testPage.id) {
        throw new Error('Failed to create test page');
      }
      
      console.log('✅ Test page created: ' + testPage.id);
      
      // Create simple test blocks
      const testBlocks = [
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{
              type: 'text',
              text: { content: '🧪 Test Blocks' }
            }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: 'This is the first paragraph of test content.' }
            }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: 'This is the second paragraph. If you can see this, block creation is working!' }
            }]
          }
        }
      ];
      
      // Append blocks to the page
      const blockResult = this.appendBlockChildren(testPage.id, testBlocks);
      console.log('✅ Test blocks appended successfully');
      
      return {
        success: true,
        pageId: testPage.id,
        url: testPage.url,
        message: 'Block creation test completed successfully!'
      };
      
    } catch (error) {
      console.error('❌ Block creation test failed: ' + error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Simple Notion API request method
   */
  sendG2NNotionRequest(endpoint, method = 'GET', payload) {
    console.log(`🌐 Making Notion API call to: ${endpoint}`);
    
    try {
      const config = getEnhancedG2NConfig();
      const url = `https://api.notion.com/v1/${endpoint}`;
      const headers = {
        'Authorization': `Bearer ${config.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      };
      
      const options = {
        method: method,
        headers: headers,
        muteHttpExceptions: true,
        timeout: 10000
      };
      
      if (payload) {
        options.payload = JSON.stringify(payload);
      }
      
      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      console.log(`📡 Response status: ${responseCode}`);
      
      if (responseCode !== 200) {
        throw new Error(`HTTP ${responseCode}: ${responseText}`);
      }
      
      return JSON.parse(responseText);
      
    } catch (error) {
      console.error(`Notion API request failed: ${error.message}`);
      throw error;
    }
  }
  /**
   * Refresh database cache
   */
  refreshG2NDatabaseCache() {
    console.log('🔄 Refreshing database cache...');
    
    try {
      const cache = CacheService.getScriptCache();
      cache.remove('notion_databases');
      
      // This will repopulate cache
      const databases = this.fetchG2NDatabasesWithCache();
      
      console.log(`✅ Database cache refreshed: ${databases.length} databases`);
      
      return { 
        success: true, 
        message: 'Database cache refreshed',
        databaseCount: databases.length
      };
      
    } catch (error) {
      console.error('❌ Failed to refresh database cache:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  /**
   * Initialize Notion service - ADD THIS METHOD
   */
  initializeG2NNotionService() {
    console.log('🔧 Initializing Notion API service');
    
    // Clear any existing queue
    if (typeof G2N_REQUEST_QUEUE !== 'undefined') {
      G2N_REQUEST_QUEUE.length = 0;
    }
    if (typeof G2N_REQUEST_TIMESTAMPS !== 'undefined') {
      G2N_REQUEST_TIMESTAMPS.length = 0;
    }
    if (typeof G2N_IS_PROCESSING_QUEUE !== 'undefined') {
      G2N_IS_PROCESSING_QUEUE = false;
    }
    
    console.log('✅ Notion API service initialized successfully');
  }
  //END OF CLASS
}

// =============================================================================
// GLOBAL FUNCTIONS
// =============================================================================

/**
 * Global function to test block creation
 */
function testNotionBlockCreation() {
  try {
    const notionService = new NotionService();
    const result = notionService.testBlockCreation();
    
    if (result.success) {
      return CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
          .setTitle('✅ Block Test Complete'))
        .addSection(CardService.newCardSection()
          .addWidget(CardService.newTextParagraph()
            .setText('Block creation test completed successfully!'))
          .addWidget(CardService.newTextParagraph()
            .setText('Test page: ' + result.url))
          .addWidget(CardService.newTextParagraph()
            .setText('Check the Notion page to see if the test blocks appear below the properties.')))
        .build();
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Block test failed: ' + error);
    const uiService = new UIService();
    return uiService.buildErrorCard('Block Test Failed', error.message);
  }
}

/**
 * Test Notion API connection
 */
function testNotionAPIConnection() {
  try {
    const notionService = new NotionService();
    const result = notionService.testConnection();
    
    if (result.success) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText('✅ Notion API connection successful!'))
        .build();
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Connection test failed: ' + error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Connection failed: ' + error.message))
      .build();
  }
}

/**
 * Clear database cache
 */
function clearNotionCache() {
  try {
    const notionService = new NotionService();
    notionService.clearDatabaseCache();
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Database cache cleared'))
      .build();
      
  } catch (error) {
    console.error('Cache clear failed: ' + error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Cache clear failed: ' + error.message))
      .build();
  }
}

/**
 * Get NotionService instance
 */
function getNotionService() {
  return new NotionService();
}
