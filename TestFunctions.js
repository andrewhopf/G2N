// ============================================/
// FILE: TestFunctions.js
// DESCRIPTION: Test functions for debugging and validation
// ============================================

/**
 * Test all card building functions
 * @returns {string} Test results summary
 */
function testAllCards() {
  console.log("=== TESTING ALL CARDS ===");
  
  var allPassed = true;
  
  // Test 1: Homepage card
  try {
    buildHomepageCard();
    console.log("✅ Homepage card built successfully");
  } catch (error) {
    console.error("❌ Homepage card failed:", error);
    allPassed = false;
  }
  
  // Test 2: Settings card
  try {
    buildSettingsCard();
    console.log("✅ Settings card built successfully");
  } catch (error) {
    console.error("❌ Settings card failed:", error);
    allPassed = false;
  }
  
  // Test 3: Email preview card
  try {
    buildEmailPreviewCard({
      gmail: {
        messageId: "test123",
        subject: "Test Email",
        from: "test@example.com"
      }
    });
    console.log("✅ Email preview card built successfully");
  } catch (error) {
    console.error("❌ Email preview card failed:", error);
    allPassed = false;
  }
  
  // Test 4: Database selection card
  try {
    buildDatabaseSelectionCard();
    console.log("✅ Database selection card built successfully");
  } catch (error) {
    console.error("❌ Database selection card failed:", error);
    allPassed = false;
  }
  
  // Test 5: Error card
  try {
    buildErrorCard("Test Error", "This is a test error");
    console.log("✅ Error card built successfully");
  } catch (error) {
    console.error("❌ Error card failed:", error);
    allPassed = false;
  }
  
  // Test 6: Test button actions
  try {
    testNotionConnection();
    console.log("✅ Test connection action works");
  } catch (error) {
    console.error("❌ Test connection failed:", error);
    allPassed = false;
  }
  
  console.log("=== TEST RESULTS ===");
  
  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED!");
    return "✅ All tests passed! The add-on is ready to deploy.";
  } else {
    console.log("⚠️ Some tests failed. Check the logs above.");
    return "❌ Some tests failed. Check the execution logs.";
  }
}

/**
 * Simple test for basic functionality
 * @returns {string} Test result
 */
function testSimple() {
  console.log("Running simple test...");
  
  try {
    // Just test that we can build a basic card
    CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle("Test Card"))
      .addSection(
        CardService.newCardSection()
          .addWidget(
            CardService.newTextParagraph()
              .setText("If you see this in logs, card building works.")
          )
      )
      .build();
    
    console.log("✅ Basic card building works");
    return "✅ Test passed! CardService is working.";
  } catch (error) {
    console.error("❌ Test failed:", error);
    return "❌ Test failed: " + error.message;
  }
}

/**
 * Test email saving functionality
 * @returns {string} Test result
 */
function testEmailSaving() {
  console.log("=== TESTING EMAIL SAVING ===");
  
  // Check configuration
  var config = getConfig();
  if (!config.apiKey) {
    console.log("❌ No API key configured");
    return "Please set your Notion API key in Settings first.";
  }
  
  if (!config.databaseId) {
    console.log("❌ No database selected");
    return "Please select a database first.";
  }
  
  console.log("Configuration OK:", {
    hasApiKey: !!config.apiKey,
    hasDatabase: !!config.databaseId,
    databaseName: config.databaseName
  });
  
  try {
    // Create test email data in the format expected by extractEmailData
    var testEmailData = {
      messageId: "test-email-" + Date.now(),
      subject: "Test Email " + new Date().toLocaleTimeString(),
      from: "Test User <test@example.com>",
      date: new Date(),
      to: "recipient@example.com",
      cc: null,
      bcc: null,
      body: "<p>This is a test email body for testing the Gmail to Notion integration.</p>",
      plainBody: "This is a test email body for testing the Gmail to Notion integration.",
      snippet: "This is a test email body...",
      threadId: "test-thread-123",
      gmailLinkUrl: "https://mail.google.com/mail/u/0/#inbox/test-id",
      hasAttachments: false,
      attachmentCount: 0,
      attachments: [],
      labels: ["INBOX", "TEST"],
      starred: false,
      inInbox: true,
      unread: false
    };
    
    console.log("Test email data created");
    console.log("Subject:", testEmailData.subject);
    console.log("From:", testEmailData.from);
    
    // Get mappings
    var mappings = getMappings();
    
    if (!mappings || Object.keys(mappings).length === 0) {
      console.log("⚠️ No mappings configured, creating minimal test properties");
      
      // Create minimal test properties (assuming there's a title property)
      var properties = {
        "Name": {  // Most Notion databases have a "Name" or similar title property
          "title": [{ 
            "type": "text", 
            "text": { 
              "content": testEmailData.subject || "Test Email"
            } 
          }]
        }
      };
      
      // Try to add a date property if database supports it
      properties["Date"] = {
        "date": {
          "start": new Date().toISOString()
        }
      };
      
    } else {
      console.log("Using configured mappings to format properties");
      
      // Apply mappings to format properties correctly
      var properties = applyMappings(testEmailData, mappings);
      
      if (!properties || Object.keys(properties).length === 0) {
        console.log("⚠️ No properties generated from mappings, creating fallback");
        
        // Fallback to minimal properties
        properties = {
          "Name": {
            "title": [{ 
              "type": "text", 
              "text": { 
                "content": testEmailData.subject || "Test Email"
              } 
            }]
          }
        };
      }
    }
    
    console.log("Formatted properties:", JSON.stringify(properties, null, 2));
    console.log("Property count:", Object.keys(properties).length);
    
    // Test saving
    console.log("Attempting to save test email...");
    var result = saveToNotionAPI(config.apiKey, config.databaseId, properties);
    
    console.log("✅ Test email saved successfully!");
    console.log("Page ID:", result.id);
    console.log("Page URL:", result.url);
    
    return "✅ Test email saved successfully! Page: " + result.url;
    
  } catch (error) {
    console.error("❌ Failed to save test email:", error);
    return "❌ Test failed: " + error.message;
  }
}

/**
 * Test database fetching functionality
 * @returns {string} Test result
 */
function testDatabaseFetch() {
  console.log("=== TESTING DATABASE FETCH ===");
  
  // First, make sure you have an API key set
  var apiKey = PropertiesService.getUserProperties().getProperty("G2N_API_KEY");
  if (!apiKey) {
    console.log("❌ No API key set. Please set it in Settings first.");
    return "❌ No API key set. Go to Settings → Set API Key → Save.";
  }
  
  console.log("API key found:", apiKey.substring(0, 10) + "...");
  
  // Test fetching databases
  var databases = fetchRealNotionDatabases();
  console.log(`Found ${databases.length} databases:`);
  
  databases.forEach((db, index) => {
    console.log(`${index + 1}. ${db.name} (${db.id})`);
  });
  
  if (databases.length === 0) {
    console.log("❌ No databases found. Possible issues:");
    console.log("1. API key might be invalid");
    console.log("2. Integration might not have database access");
    console.log("3. You might not have any databases in Notion");
    return "❌ No databases found. Check API key and permissions.";
  }
  
  console.log("✅ Database fetch test completed successfully");
  return `✅ Found ${databases.length} databases. Check logs for details.`;
}

/**
 * Test Notion API connection and workspace users
 * @returns {string} Test result
 */
function testNotionAPIConnection() {
  console.log("=== Testing Notion API Connection ===");
  
  var config = getConfig();
  if (!config.apiKey) {
    console.log("❌ No API key configured");
    return "❌ Please set your Notion API key in Settings first.";
  }
  
  console.log("API key found (first 10 chars):", config.apiKey.substring(0, 10) + "...");
  
  try {
    // Test by fetching users (lightweight endpoint)
    var users = fetchNotionWorkspaceUsers();
    console.log(`✅ Notion API connection successful! Found ${users.length} workspace users.`);
    
    if (users.length > 0) {
      console.log("Sample users:");
      users.slice(0, 3).forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email})`);
      });
    }
    
    return `✅ Notion API connection successful! Found ${users.length} workspace users.`;
  } catch (error) {
    console.error("❌ Notion API connection failed:", error);
    return "❌ Notion API connection failed: " + error.message;
  }
}

/**
 * Test database schema fetching
 * @returns {string} Test result
 */
function testDatabaseSchema() {
  console.log("=== Testing Database Schema Fetch ===");
  
  var config = getConfig();
  if (!config.apiKey || !config.databaseId) {
    return "❌ Please configure API key and select a database first.";
  }
  
  try {
    var schemaResult = fetchNotionDatabaseSchema(config.databaseId, config.apiKey);
    
    if (schemaResult.success) {
      var database = schemaResult.database;
      console.log("✅ Database loaded: " + database.title);
      console.log("Total properties: " + database.properties.length);
      
      // Count property types
      var typeCounts = {};
      database.properties.forEach(prop => {
        typeCounts[prop.type] = (typeCounts[prop.type] || 0) + 1;
      });
      
      console.log("Property types:");
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} properties`);
      });
      
      return `✅ Database schema loaded: ${database.title} with ${database.properties.length} properties`;
    }
    
    return "❌ Failed to load database: " + schemaResult.error;
  } catch (error) {
    console.error("Error testing database schema:", error);
    return "❌ Error testing database schema: " + error.message;
  }
}

/**
 * Test Notion fetcher functions
 * @returns {string} Test results summary
 */
function testNotionFetcherFunctions() {
  console.log("=== Testing Notion Fetcher Functions ===");
  
  var allPassed = true;
  var results = [];
  
  // Test isPropertyMappable
  console.log("Testing isPropertyMappable():");
  [
    { type: "title", expected: true, desc: "title should be mappable" },
    { type: "formula", expected: false, desc: "formula should NOT be mappable" },
    { type: "relation", expected: true, desc: "relation should be mappable" },
    { type: "people", expected: false, desc: "people should NOT be mappable" },
    { type: "select", expected: true, desc: "select should be mappable" },
    { type: "created_time", expected: false, desc: "created_time should NOT be mappable" },
    { type: "last_edited_by", expected: false, desc: "last_edited_by should NOT be mappable" }
  ].forEach(test => {
    var actual = isPropertyMappable(test.type);
    var passed = actual === test.expected;
    results.push({ test: test.desc, passed: passed });
    
    console.log(`  ${passed ? "✅" : "❌"} ${test.desc}: ${actual} (expected ${test.expected})`);
    if (!passed) allPassed = false;
  });
  
  // Test shouldShowGmailFieldMapping
  console.log("\nTesting shouldShowGmailFieldMapping():");
  [
    { type: "title", expected: true, desc: "title should show Gmail fields" },
    { type: "relation", expected: false, desc: "relation should NOT show Gmail fields" },
    { type: "select", expected: false, desc: "select should NOT show Gmail fields" },
    { type: "people", expected: false, desc: "people should NOT show Gmail fields" },
    { type: "email", expected: true, desc: "email should show Gmail fields" },
    { type: "checkbox", expected: false, desc: "checkbox should NOT show Gmail fields" },
    { type: "rich_text", expected: true, desc: "rich_text should show Gmail fields" }
  ].forEach(test => {
    var actual = shouldShowGmailFieldMapping(test.type);
    var passed = actual === test.expected;
    results.push({ test: test.desc, passed: passed });
    
    console.log(`  ${passed ? "✅" : "❌"} ${test.desc}: ${actual} (expected ${test.expected})`);
    if (!passed) allPassed = false;
  });
  
  // Test getRecommendedEmailField
  console.log("\nTesting getRecommendedEmailField():");
  [
    { type: "title", expected: "subject", desc: "title -> subject" },
    { type: "url", expected: "gmailLinkUrl", desc: "url -> gmailLinkUrl" },
    { type: "unknown", expected: "subject", desc: "unknown -> subject" },
    { type: "date", expected: "date", desc: "date -> date" }
  ].forEach(test => {
    var actual = getRecommendedEmailField(test.type);
    var passed = actual === test.expected;
    results.push({ test: test.desc, passed: passed });
    
    console.log(`  ${passed ? "✅" : "❌"} ${test.desc}: ${actual} (expected ${test.expected})`);
    if (!passed) allPassed = false;
  });
  
  // Test getTransformationOptions
  console.log("\nTesting getTransformationOptions():");
  var options = getTransformationOptions("title");
  var isArray = Array.isArray(options);
  var hasItems = options.length > 0;
  
  results.push({ test: "getTransformationOptions returns array", passed: isArray });
  results.push({ test: "getTransformationOptions has items", passed: hasItems });
  
  console.log(`  ${isArray ? "✅" : "❌"} Returns array: ${isArray}`);
  console.log(`  ${hasItems ? "✅" : "❌"} Has items: ${options.length}`);
  
  if (!isArray || !hasItems) allPassed = false;
  
  // Summary
  console.log("\n=== TEST SUMMARY ===");
  var passedCount = results.filter(r => r.passed).length;
  var totalCount = results.length;
  
  console.log(`Passed: ${passedCount}/${totalCount}`);
  
  return allPassed
    ? `✅ All Notion fetcher tests passed! (${passedCount}/${totalCount})`
    : `❌ Some tests failed! (${passedCount}/${totalCount})`;
}

function testBodyExtraction() {
  // Get a sample email
  var threads = GmailApp.getInboxThreads(0, 1);
  if (threads.length > 0) {
    var messages = threads[0].getMessages();
    if (messages.length > 0) {
      var email = messages[0];
      console.log("Subject:", email.getSubject());
      console.log("Body (HTML) length:", email.getBody().length);
      console.log("Body (Plain) length:", email.getPlainBody().length);
      console.log("First 200 chars of plain body:", 
        email.getPlainBody().substring(0, 200));
      
      // Test the extraction function
      var extracted = extractEmailData(email.getId());
      console.log("Extracted body length:", extracted?.body?.length || 0);
      console.log("Extracted plainBody length:", extracted?.plainBody?.length || 0);
    }
  }
}
function checkCurrentMappings() {
  var config = getConfig();
  console.log("Configuration status:");
  console.log("- API Key configured:", !!config.apiKey);
  console.log("- Database selected:", !!config.databaseId);
  console.log("- Database name:", config.databaseName);
  console.log("- Has mappings:", config.hasMappings);
  
  var mappings = getMappings();
  console.log("\nCurrent mappings (" + Object.keys(mappings).length + " total):");
  
  Object.entries(mappings).forEach(([key, mapping]) => {
    console.log(`\nProperty: ${mapping.notionPropertyName || key}`);
    console.log(`  Type: ${mapping.type}`);
    console.log(`  Enabled: ${mapping.enabled}`);
    console.log(`  Email Field: ${mapping.emailField}`);
    console.log(`  Transformation: ${mapping.transformation}`);
  });
  
  // Check specifically for body/plainBody mappings
  console.log("\nSearching for body-related mappings...");
  var bodyMappings = Object.entries(mappings).filter(([key, mapping]) => {
    return mapping.emailField === 'body' || 
           mapping.emailField === 'plainBody' ||
           mapping.emailField === 'snippet' ||
           mapping.notionPropertyName?.toLowerCase().includes('body') ||
           mapping.notionPropertyName?.toLowerCase().includes('content') ||
           mapping.notionPropertyName?.toLowerCase().includes('email');
  });
  
  console.log("Found " + bodyMappings.length + " body-related mappings:");
  bodyMappings.forEach(([key, mapping]) => {
    console.log(`- ${mapping.notionPropertyName}: ${mapping.emailField} (enabled: ${mapping.enabled})`);
  });
}

function testHtmlToTextTransformation() {
  // Get a sample email
  var threads = GmailApp.getInboxThreads(0, 1);
  if (threads.length === 0) {
    console.log("❌ No emails found");
    return;
  }
  
  var email = threads[0].getMessages()[0];
  var emailData = extractEmailData(email.getId());
  
  console.log("Testing html_to_text transformation...");
  console.log("Original HTML body length:", emailData.body.length);
  console.log("Original plainBody length:", emailData.plainBody.length);
  
  // Test the transformation directly
  var transformed = applyTransformation(emailData.body, "html_to_text");
  
  console.log("\nTransformation results:");
  console.log("Transformed length:", transformed.length);
  console.log("First 300 chars of transformed:");
  console.log(transformed.substring(0, 300));
  
  // Test with truncate_500
  var truncated = applyTransformation(emailData.body, "truncate_500");
  console.log("\nTruncate_500 results:");
  console.log("Truncated length:", truncated.length);
  console.log("First 300 chars of truncated:");
  console.log(truncated.substring(0, 300));
  
  // Compare with plainBody
  console.log("\nPlainBody for comparison:");
  console.log("plainBody length:", emailData.plainBody.length);
  console.log("First 300 chars of plainBody:");
  console.log(emailData.plainBody.substring(0, 300));
}

function previewMappingChanges() {
  var userProps = PropertiesService.getUserProperties();
  var mappingsJson = userProps.getProperty("G2N_MAPPINGS");
  
  if (!mappingsJson) {
    console.log("❌ No mappings found");
    return;
  }
  
  var mappings = JSON.parse(mappingsJson);
  console.log("=== PREVIEW OF CHANGES ===");
  
  Object.entries(mappings).forEach(([key, mapping]) => {
    // Only show rich_text properties that would be affected
    if (mapping.type === "rich_text") {
      console.log(`\nProperty: ${mapping.notionPropertyName}`);
      console.log(`  Type: ${mapping.type}`);
      console.log(`  Current Email Field: ${mapping.emailField}`);
      console.log(`  Current Transformation: ${mapping.transformation}`);
      
      if (mapping.emailField === "body") {
        console.log(`  ⚠️ WOULD CHANGE: emailField: "body" → "plainBody"`);
        console.log(`  ⚠️ WOULD CHANGE: transformation: "${mapping.transformation}" → "none"`);
      }
    }
  });
  
  console.log("\n=== SUMMARY ===");
  var affectedCount = Object.values(mappings).filter(m => 
    m.type === "rich_text" && m.emailField === "body"
  ).length;
  
  console.log(`Would affect ${affectedCount} rich_text property(ies) using "body" field`);
}

function testPlainBodyExtraction() {
  // Get a sample email
  var threads = GmailApp.getInboxThreads(0, 1);
  if (threads.length === 0) {
    console.log("❌ No emails found");
    return;
  }
  
  var email = threads[0].getMessages()[0];
  var emailData = extractEmailData(email.getId());
  
  console.log("=== TESTING PLAINBODY EXTRACTION ===");
  console.log("Body (HTML) length:", emailData.body?.length || 0);
  console.log("PlainBody length:", emailData.plainBody?.length || 0);
  
  // Check if plainBody exists and has content
  if (!emailData.plainBody || emailData.plainBody.trim().length === 0) {
    console.log("❌ WARNING: plainBody is empty or doesn't exist!");
    console.log("   This could break if we switch to plainBody");
    return;
  }
  
  // Test if the current transformation would work on plainBody
  var currentMappings = getMappings();
  Object.entries(currentMappings).forEach(([key, mapping]) => {
    if (mapping.type === "rich_text" && mapping.emailField === "body") {
      console.log(`\nTesting "${mapping.notionPropertyName}":`);
      console.log(`  Current transformation: ${mapping.transformation}`);
      
      // Test the transformation on plainBody
      var result = applyTransformation(emailData.plainBody, mapping.transformation);
      console.log(`  Transformation result length: ${result?.length || 0}`);
      console.log(`  First 100 chars: ${(result || "").substring(0, 100)}...`);
      
      // Test formatting for Notion
      var formatted = formatForNotionAPI(result, "rich_text");
      console.log(`  Can format for Notion: ${!!formatted}`);
    }
  });
}

function testFixedSave() {
  var threads = GmailApp.getInboxThreads(0, 1);
  if (threads.length === 0) {
    console.log("❌ No emails found");
    return;
  }
  
  var email = threads[0].getMessages()[0];
  
  console.log("Testing fixed save function...");
  console.log("Email has plainBody:", email.getPlainBody().length > 0);
  
  var result = saveEmailToNotion({
    gmail: {
      messageId: email.getId()
    }
  });
  
  if (result.success) {
    console.log("\n✅ SUCCESS! Email saved with body content!");
    console.log("Page URL:", result.url);
    console.log("\nCheck your Notion database - the 'Email Body' field should now contain content!");
  } else {
    console.log("\n❌ FAILED:", result.message);
  }
}
/**
 * Debug function to check mappings
 */
function debugMappings() {
    console.log("=== DEBUG MAPPINGS ===");
    
    var props = PropertiesService.getUserProperties();
    var allProps = props.getProperties();
    console.log("All user properties:", Object.keys(allProps));
    
    var mappingsJson = props.getProperty("G2N_MAPPINGS");
    console.log("G2N_MAPPINGS exists:", !!mappingsJson);
    console.log("G2N_MAPPINGS length:", mappingsJson ? mappingsJson.length : 0);
    
    if (mappingsJson) {
        try {
            var mappings = JSON.parse(mappingsJson);
            console.log("Parsed mappings keys:", Object.keys(mappings));
            console.log("Number of mappings:", Object.keys(mappings).length);
            
            // Log first few mappings
            var count = 0;
            for (var key in mappings) {
                if (count < 5) {
                    console.log("Mapping " + key + ":");
                    console.log("  Property Name:", mappings[key].notionPropertyName);
                    console.log("  Type:", mappings[key].type);
                    console.log("  Enabled:", mappings[key].enabled);
                    console.log("  Email Field:", mappings[key].emailField);
                    count++;
                } else {
                    break;
                }
            }
        } catch (e) {
            console.error("Error parsing mappings:", e);
        }
    }
    
    // Also check config
    var config = getConfig();
    console.log("Config:", config);
}

/**
 * Compare saved mappings with current schema
 */
function compareMappingsWithSchema() {
    console.log("=== COMPARING MAPPINGS WITH SCHEMA ===");
    
    var config = getConfig();
    if (!config.apiKey || !config.databaseId) {
        console.log("ERROR: No API key or database ID");
        return;
    }
    
    // Get current schema
    var schema = fetchNotionDatabaseSchema(config.databaseId, config.apiKey);
    if (!schema.success) {
        console.log("ERROR: Could not fetch schema");
        return;
    }
    
    var currentProperties = schema.database.properties;
    console.log("Current schema has " + currentProperties.length + " properties");
    
    // Get saved mappings
    var props = PropertiesService.getUserProperties();
    var mappingsJson = props.getProperty("G2N_MAPPINGS");
    if (!mappingsJson) {
        console.log("ERROR: No saved mappings");
        return;
    }
    
    var savedMappings = JSON.parse(mappingsJson);
    console.log("Saved mappings has " + Object.keys(savedMappings).length + " mappings");
    
    // Create maps for comparison
    var savedByName = {};
    var currentByName = {};
    var savedById = {};
    var currentById = {};
    
    // Build saved mappings maps
    for (var id in savedMappings) {
        var mapping = savedMappings[id];
        savedByName[mapping.notionPropertyName] = { id: id, mapping: mapping };
        savedById[id] = mapping;
    }
    
    // Build current schema maps
    currentProperties.forEach(function(prop) {
        currentByName[prop.name] = { id: prop.id, prop: prop };
        currentById[prop.id] = prop;
    });
    
    console.log("\n=== COMPARISON BY NAME ===");
    console.log("Properties in saved mappings but not in current schema:");
    var missingInCurrent = [];
    for (var name in savedByName) {
        if (!currentByName[name]) {
            missingInCurrent.push(name);
        }
    }
    console.log(missingInCurrent.length > 0 ? missingInCurrent.join(", ") : "None");
    
    console.log("\nProperties in current schema but not in saved mappings:");
    var missingInSaved = [];
    for (var name in currentByName) {
        if (!savedByName[name]) {
            missingInSaved.push(name);
        }
    }
    console.log(missingInSaved.length > 0 ? missingInSaved.join(", ") : "None");
    
    console.log("\n=== COMPARISON BY ID ===");
    console.log("Checking if saved mapping IDs exist in current schema...");
    var matchingIds = [];
    var nonMatchingIds = [];
    
    for (var savedId in savedMappings) {
        if (currentById[savedId]) {
            matchingIds.push(savedId + " (" + savedMappings[savedId].notionPropertyName + ")");
        } else {
            nonMatchingIds.push(savedId + " (" + savedMappings[savedId].notionPropertyName + ")");
        }
    }
    
    console.log("Matching IDs: " + matchingIds.length);
    if (matchingIds.length > 0) {
        matchingIds.forEach(function(id) {
            console.log("  ✅ " + id);
        });
    }
    
    console.log("\nNon-matching IDs: " + nonMatchingIds.length);
    if (nonMatchingIds.length > 0) {
        nonMatchingIds.forEach(function(id) {
            console.log("  ❌ " + id);
        });
    }
    
    console.log("\n=== SUGGESTED ACTION ===");
    if (nonMatchingIds.length > 0 && matchingIds.length === 0) {
        console.log("All property IDs have changed. Run fixMappingsPropertyIds() to fix them.");
    } else if (nonMatchingIds.length > 0) {
        console.log("Some property IDs have changed. Run fixMappingsPropertyIds() to fix the mismatched ones.");
    } else {
        console.log("All property IDs match! The issue might be elsewhere.");
    }
}

// ============================================
// INITIALIZATION
// ============================================

console.log("Gmail to Notion add-on starting...");
console.log("Gmail to Notion add-on loaded successfully!");
console.log("Run testAllCards() to verify everything works.");