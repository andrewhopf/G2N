/**
 * Test duplicate detection service
 * Run from Apps Script editor
 */
function testDuplicateDetection() {
  // Initialize app
  const app = getApp();
  const duplicateService = app.getContainer().resolve('duplicateDetectionService');
  
  // Get a test message
  const messages = GmailApp.search('in:inbox', 0, 1);
  if (messages.length === 0) {
    console.log('❌ No messages found');
    return;
  }
  
  const message = messages[0].getMessages()[0];
  const emailData = EmailData.fromGmailMessage(message);
  
  console.log('Testing duplicate detection...');
  console.log('Email:', emailData.subject);
  console.log('Gmail URL:', emailData.gmailLinkUrl);
  
  // First check - should be unique
  const result1 = duplicateService.checkDuplicate(emailData);
  console.log('\n=== First Check ===');
  console.log('Is duplicate?', result1.isDuplicate);
  console.log('Reason:', result1.reason);
  
  if (result1.isDuplicate) {
    console.log('Existing page:', result1.existingPage.title);
    console.log('Page URL:', result1.existingPage.url);
  }
  
  // Test pending save
  console.log('\n=== Testing Pending Save ===');
  const cleanup = duplicateService.markPending(emailData);
  const result2 = duplicateService.checkDuplicate(emailData);
  console.log('Is duplicate (pending)?', result2.isDuplicate);
  console.log('Reason:', result2.reason);
  
  cleanup();
  
  // After cleanup
  const result3 = duplicateService.checkDuplicate(emailData);
  console.log('\n=== After Cleanup ===');
  console.log('Is duplicate?', result3.isDuplicate);
  console.log('Reason:', result3.reason);
  
  console.log('\n✅ Test complete');
}


/**
 * Test mapping save transaction
 */
function testMappingTransaction() {
  const app = getApp();
  const container = app.getContainer();
  
  const transaction = new MappingSaveTransaction(
    container.resolve('mappingRepo'),
    container.resolve('logger')
  );

  console.log('=== Testing Mapping Transaction ===');
  
  // Test 1: Normal save
  console.log('\n--- Test 1: Normal Save ---');
  try {
    transaction.begin();
    
    const databaseService = container.resolve('databaseService');
    const properties = databaseService.getMappableProperties();
    const handlerFactory = container.resolve('handlerFactory');
    
    // Mock form input
    const mockFormInput = {};
    properties.slice(0, 3).forEach(prop => {
      mockFormInput[`enabled_${prop.id}`] = 'true';
      mockFormInput[`emailField_${prop.id}`] = 'subject';
    });
    
    const result = transaction.save(mockFormInput, properties, handlerFactory);
    transaction.commit();
    
    console.log('✅ Save successful');
    console.log('Processed:', result.processed);
    console.log('Errors:', result.errors.length);
    
  } catch (error) {
    transaction.rollback();
    console.log('❌ Save failed:', error.message);
  }
  
  // Test 2: Rollback on error
  console.log('\n--- Test 2: Rollback Test ---');
  try {
    const originalMappings = container.resolve('mappingRepo').getAll();
    const originalCount = Object.keys(originalMappings).length;
    
    transaction.begin();
    
    // Force an error by passing invalid data
    transaction.save({}, [], null);
    
  } catch (error) {
    console.log('Expected error:', error.message);
    transaction.rollback();
    
    const restoredMappings = container.resolve('mappingRepo').getAll();
    const restoredCount = Object.keys(restoredMappings).length;
    
    console.log('Original count:', originalCount);
    console.log('Restored count:', restoredCount);
    console.log(originalCount === restoredCount ? '✅ Rollback successful' : '❌ Rollback failed');
  }
  
  console.log('\n=== Test Complete ===');
}

/**
 * Comprehensive diagnostic test for Gmail link property and duplicate detection
 * Run this function from the Apps Script editor to diagnose issues
 */
function testNotionUrlPropertyAndDuplicateDetection() {
  try {
    // Setup logging
    const logs = [];
    function log(message, data = null) {
      const entry = data ? `${message}: ${JSON.stringify(data)}` : message;
      logs.push(entry);
      console.log(entry);
    }
    
    log("=== NOTION URL PROPERTY & DUPLICATE DETECTION TEST ===");
    
    // 1. Get services needed for testing
    log("🔄 Initializing services...");
    const app = getApp(); // Initialize the application
    const container = app.getContainer();
    const configRepo = container.resolve('configRepo');
    const notionService = container.resolve('notionService');
    const notionAdapter = notionService.adapter;
    
    // 2. Get configuration
    log("🔄 Retrieving configuration...");
    const config = configRepo.getAll();
    const apiKey = config.apiKey;
    const databaseId = config.databaseId;
    
    if (!apiKey || !databaseId) {
      log("❌ Missing API key or database ID");
      return {
        success: false,
        logs,
        error: "Configuration incomplete"
      };
    }
    
    log("✅ Configuration retrieved", {
      apiKey: apiKey ? "present" : "missing",
      databaseId: databaseId ? databaseId.substring(0, 8) + "..." : "missing",
      databaseName: config.databaseName
    });
    
    // 3. Test property name determination
    log("🔄 Testing URL property name determination...");
    const mappings = JSON.parse(config.mappings || '{}');
    const urlMapping = Object.values(mappings).find(m => m && m.emailField === 'gmailLinkUrl');
    const propertyName = urlMapping ? urlMapping.notionPropertyName : 'Gmail link';
    
    log("✅ Determined property name", {
      propertyName,
      foundInMappings: !!urlMapping,
      totalMappings: Object.keys(mappings).length
    });
    
    // 4. Test property existence and type in Notion
    log("🔄 Checking if property exists in Notion schema...");
    let propertyExists = false;
    let propertyType = null;
    let properties = [];
    
    try {
      const dbSchema = notionAdapter.getDatabase(databaseId, apiKey);
      log("✅ Database schema retrieved", {
        title: dbSchema.title,
        propertyCount: dbSchema.properties.length
      });
      
      properties = dbSchema.properties;
      const foundProp = properties.find(p => p.name === propertyName);
      
      if (foundProp) {
        propertyExists = true;
        propertyType = foundProp.type;
        log("✅ Property found in schema", {
          name: foundProp.name,
          type: foundProp.type,
          id: foundProp.id
        });
      } else {
        log("❌ Property not found in schema", {
          propertyName,
          allProperties: properties.map(p => p.name)
        });
      }
    } catch (error) {
      log("❌ Error fetching database schema", {
        error: error.message,
        stack: error.stack
      });
    }
    
    // 5. Test property validation & creation
    if (!propertyExists || propertyType !== 'url') {
      log("🔄 Testing property creation...");
      try {
        const result = notionAdapter.validateUrlProperty(databaseId, propertyName, apiKey);
        log("✅ Property validation/creation result", {
          success: !!result
        });
        
        // Re-check schema after creation
        const updatedSchema = notionAdapter.getDatabase(databaseId, apiKey);
        const updatedProp = updatedSchema.properties.find(p => p.name === propertyName);
        
        if (updatedProp) {
          log("✅ Property now exists", {
            name: updatedProp.name,
            type: updatedProp.type
          });
        } else {
          log("❌ Property still doesn't exist after creation attempt");
        }
      } catch (error) {
        log("❌ Error validating/creating property", {
          error: error.message,
          stack: error.stack
        });
      }
    }
    
    // 6. Test URL storage
    log("🔄 Testing URL storage...");
    const testTitle = "URL TEST PAGE - " + new Date().toISOString();
    const testUrl = "https://mail.google.com/mail/u/0/#inbox/" + Math.random().toString(36).substring(2, 10);
    
    try {
      // Create test page with URL
      const properties = {
        "Title": { // Adjust this if your title property has a different name
          title: [
            {
              type: "text",
              text: {
                content: testTitle
              }
            }
          ]
        }
      };
      
      // Add the URL property
      properties[propertyName] = {
        url: testUrl
      };
      
      log("🔄 Creating test page with URL", {
        title: testTitle,
        url: testUrl
      });
      
      const page = notionAdapter.createPage(databaseId, properties, [], apiKey);
      
      log("✅ Test page created", {
        id: page.id,
        url: page.url
      });
      
      // Store the test page details for cleanup
      const testPageId = page.id;
      const testPageInfo = {
        id: testPageId,
        title: testTitle,
        url: testUrl,
        propertyName: propertyName
      };
      
      // 7. Test URL query/duplicate detection
      log("🔄 Testing URL query for duplicate detection...");
      
      try {
        // Query with exact match
        const queryPayload = {
          page_size: 10,
          filter: {
            property: propertyName,
            url: {
              equals: testUrl
            }
          }
        };
        
        log("🔄 Sending query for exact URL match", {
          filter: queryPayload.filter
        });
        
        const results = notionAdapter.queryDatabase(databaseId, queryPayload, apiKey);
        
        log("✅ Query results", {
          count: results.length,
          foundMatch: results.length > 0,
          firstResult: results.length > 0 ? {
            id: results[0].id,
            matchesTestPage: results[0].id === testPageId
          } : null
        });
        
        // If no results, try variations
        if (results.length === 0) {
          log("🔄 No exact matches, trying variations...");
          
          // Try contains
          const containsPayload = {
            page_size: 10,
            filter: {
              property: propertyName,
              url: {
                contains: testUrl.split('/').pop() // Just the ID part
              }
            }
          };
          
          log("🔄 Sending query with 'contains'", {
            filter: containsPayload.filter
          });
          
          const containsResults = notionAdapter.queryDatabase(databaseId, containsPayload, apiKey);
          
          log("✅ 'Contains' query results", {
            count: containsResults.length,
            foundMatch: containsResults.length > 0
          });
          
          // Try normalized URL
          const normalizedUrl = testUrl.replace('#inbox/', '');
          const normalizedPayload = {
            page_size: 10,
            filter: {
              property: propertyName,
              url: {
                equals: normalizedUrl
              }
            }
          };
          
          log("🔄 Sending query with normalized URL", {
            filter: normalizedPayload.filter,
            normalizedUrl
          });
          
          const normalizedResults = notionAdapter.queryDatabase(databaseId, normalizedPayload, apiKey);
          
          log("✅ Normalized URL query results", {
            count: normalizedResults.length,
            foundMatch: normalizedResults.length > 0
          });
        }
        
        // 8. Try general query without filters
        log("🔄 Testing general query without filters...");
        const generalResults = notionAdapter.queryDatabase(databaseId, { page_size: 10 }, apiKey);
        
        log("✅ General query results", {
          count: generalResults.length,
          hasResults: generalResults.length > 0,
          foundTestPage: generalResults.some(page => page.id === testPageId)
        });
        
        // If the test page is found, examine its properties
        const foundTestPage = generalResults.find(page => page.id === testPageId);
        if (foundTestPage) {
          log("✅ Found test page in general results", {
            properties: Object.keys(foundTestPage.properties)
          });
          
          const urlProp = foundTestPage.properties[propertyName];
          log("URL property in test page", urlProp);
        }
        
        return {
          success: true,
          logs,
          testPage: testPageInfo,
          recommendations: generateRecommendations({
            propertyExists,
            propertyType,
            foundInExactQuery: results.length > 0,
            foundInGeneralQuery: generalResults.some(page => page.id === testPageId)
          })
        };
        
      } catch (error) {
        log("❌ Error testing URL query", {
          error: error.message,
          stack: error.stack
        });
        
        return {
          success: false,
          logs,
          error: error.message,
          testPage: testPageInfo
        };
      }
      
    } catch (error) {
      log("❌ Error creating test page", {
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        logs,
        error: error.message
      };
    }
    
  } catch (error) {
    console.error("Fatal error in test:", error);
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(results) {
  const recommendations = [];
  
  if (!results.propertyExists) {
    recommendations.push("The URL property doesn't exist in your Notion database. Add a property called 'Gmail link' of type 'URL'.");
  }
  
  if (results.propertyExists && results.propertyType !== 'url') {
    recommendations.push(`The property exists but is type '${results.propertyType}' instead of 'URL'. Change the property type to URL.`);
  }
  
  if (!results.foundInExactQuery && results.foundInGeneralQuery) {
    recommendations.push("The URL is being stored but exact matching isn't working. This suggests a format mismatch between stored and queried URLs.");
    recommendations.push("Try modifying the filter to use 'contains' instead of 'equals' or normalize the URL format.");
  }
  
  if (results.propertyExists && results.propertyType === 'url' && !results.foundInGeneralQuery) {
    recommendations.push("The property exists with the correct type, but the URL isn't being saved correctly to your test page.");
    recommendations.push("Check the code that saves URLs to ensure it's correctly formatting the URL property.");
  }
  
  return recommendations;
}

/**
 * Run the test and log results
 */
function runNotionUrlTest() {
  const results = testNotionUrlPropertyAndDuplicateDetection();
  console.log("=== TEST RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
  
  if (results.recommendations && results.recommendations.length > 0) {
    console.log("\n=== RECOMMENDATIONS ===");
    results.recommendations.forEach((rec, i) => {
      console.log(`${i+1}. ${rec}`);
    });
  }
  
  return results;
} 
function showAttachmentsConfiguration(event) {
  try {
    const app = getApp();
    const container = app.getContainer();
    const notionService = container.resolve('notionService');
    const configRepo = container.resolve('configRepo');
    const logger = container.resolve('logger');
    
    logger.info('Building attachments configuration card');
    
    // Get current configuration
    const config = configRepo.getAll();
    
    // List databases
    let databases = [];
    try {
      databases = notionService.listDatabases() || [];
    } catch (e) {
      logger.warn('Could not list databases', e);
      return _buildErrorCardSafely('Notion Error', 
        'Could not list databases. Check API key and permissions.');
    }
    
    const currentDbId = config.attachmentDatabaseId || config.databaseId || '';
    
    // Build the card
    const header = CardService.newCardHeader()
      .setTitle('📎 Attachments Configuration')
      .setSubtitle('Configure how email attachments are handled');
    
    const card = CardService.newCardBuilder()
      .setHeader(header);
    
    // === SECTION 1: Database Selection ===
    const dbSection = CardService.newCardSection()
      .setHeader('🗄️ Select Attachment Database');
    
    if (databases.length === 0) {
      dbSection.addWidget(CardService.newTextParagraph()
        .setText('No Notion databases found.'));
    } else {
      const selection = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName('attachment_database_id') // Consistent field name
        .setTitle('Choose Database');
      
      selection.addItem('-- Select database --', '', currentDbId === '');
      databases.forEach(db => {
        selection.addItem(db.name, db.id, db.id === currentDbId);
      });
      
      dbSection.addWidget(selection);
    }
    
    card.addSection(dbSection);
    
    // === SECTION 2: Files Property Configuration ===
    const filesSection = CardService.newCardSection()
      .setHeader('📁 Files Property');
    
    filesSection.addWidget(CardService.newTextInput()
      .setFieldName('files_property_name') // Consistent field name
      .setTitle('Property Name for Files')
      .setValue(config.filesPropertyName || 'Attachments')
      .setHint('Name of the files property in Notion (default: "Attachments")'));
    
    card.addSection(filesSection);
    
    // === SECTION 3: Attachment Handling ===
    const handlingSection = CardService.newCardSection()
      .setHeader('⚙️ Attachment Handling');
    
    const handlingDropdown = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('file_handling') // Consistent field name
      .setTitle('How to handle attachments');
    
    const currentHandling = config.fileHandling || 'upload_to_drive';
    handlingDropdown.addItem('Upload to Google Drive', 'upload_to_drive', currentHandling === 'upload_to_drive');
    handlingDropdown.addItem('Link only (no upload)', 'link_only', currentHandling === 'link_only');
    handlingDropdown.addItem('Skip attachments', 'skip', currentHandling === 'skip');
    
    handlingSection.addWidget(handlingDropdown);
    card.addSection(handlingSection);
    
    // === SECTION 4: Actions ===
    const actionSection = CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('✅ Ensure Files Property')
          .setBackgroundColor('#0F9D58')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(CardService.newAction()
            .setFunctionName('ensureAttachmentField')))
        .addButton(CardService.newTextButton()
          .setText('💾 Save Settings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('saveAttachmentSettings'))));
    
    card.addSection(actionSection);
    
    // === SECTION 5: Navigation ===
    const navSection = CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('🔙 Back to Settings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showG2NSettings')))
        .addButton(CardService.newTextButton()
          .setText('⚙️ Settings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showG2NSettings'))));
    
    card.addSection(navSection);
    
    return card.build();
    
  } catch (error) {
    console.error('showAttachmentsConfiguration error:', error);
    return _buildErrorCardSafely('Attachments Error', error.message || 'Unknown error');
  }
}
/**
 * Test attachments configuration
 */
function testAttachmentsConfig() {
  try {
    console.log('Testing attachments configuration...');
    
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('🧪 Test Attachments'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Click below to test attachments configuration:'))
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText('⚙️ Open Attachments Config')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('showAttachmentsConfiguration')))
          .addButton(CardService.newTextButton()
            .setText('⚙️ Settings')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('showG2NSettings')))))
      .build();
    
    return card;
    
  } catch (error) {
    console.error('Test error:', error);
    
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('❌ Test Error'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Error: ' + error.message)))
      .build();
  }
}
