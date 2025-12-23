// ============================================
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
  
  // Create test email data
  var testEmail = {
    id: "test-email-" + Date.now(),
    subject: "Test Email " + new Date().toLocaleTimeString(),
    sender: "test@example.com",
    date: new Date(),
    body: "This is a test email body for testing the Gmail to Notion integration.",
    threadId: "test-thread-123",
    to: "recipient@example.com",
    cc: "",
    bcc: ""
  };
  
  console.log("Test email data:", testEmail);
  
  try {
    // Test saving
    console.log("Attempting to save test email...");
    var result = saveToNotionAPI(config.apiKey, config.databaseId, testEmail);
    
    console.log("✅ Test email saved successfully!");
    console.log("Page ID:", result.id);
    console.log("Notion URL:", "https://www.notion.so/" + result.id.replace(/-/g, ""));
    
    return "✅ Test email saved successfully! Check your Notion database. Page ID: " + result.id;
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

// ============================================
// INITIALIZATION
// ============================================

console.log("Gmail to Notion add-on starting...");
console.log("Gmail to Notion add-on loaded successfully!");
console.log("Run testAllCards() to verify everything works.");