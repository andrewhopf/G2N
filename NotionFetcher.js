/**
 * @fileoverview Notion API integration functions/
 * @version 2.0.0
 * @description Handles fetching database schemas, properties, and workspace users
 */

/**
 * Fetch database schema from Notion API
 * @param {string} databaseId - Notion database ID
 * @param {string} apiKey - Notion API key
 * @returns {Object} Response object with success status and data
 */
function fetchNotionDatabaseSchema(databaseId, apiKey) {
  if (!databaseId || !apiKey) {
    throw new Error("Missing database ID or API key");
  }
  
  try {
    const url = `https://api.notion.com/v1/databases/${databaseId}`;
    const options = {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode !== 200) {
      const errorData = JSON.parse(responseText);
      throw new Error(errorData.message || "Failed to fetch database");
    }
    
    const data = JSON.parse(responseText);
    
    return {
      success: true,
      database: {
        id: data.id,
        title: data.title[0]?.plain_text || "Untitled",
        properties: processDatabaseProperties(data.properties),
        url: data.url
      }
    };
    
  } catch (error) {
    console.error("Error fetching database schema:", error);
    return {
      success: false,
      error: error.message,
      database: null
    };
  }
}

/**
 * Fetch Notion workspace users
 * @returns {Array<{id: string, name: string, email: string}>} Array of Notion users
 */
function fetchNotionWorkspaceUsers() {
  try {
    const config = getConfig();
    
    if (!config.apiKey) {
      return [];
    }
    
    const options = {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Notion-Version": "2022-06-28"
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch("https://api.notion.com/v1/users", options);
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      
      return (data.results || [])
        .filter(user => user.type === "person")
        .map(user => ({
          id: user.id,
          name: user.name || "Unknown User",
          email: user.person?.email || ""
        }));
    }
    
  } catch (error) {
    console.error("Error fetching Notion users:", error);
  }
  
  return [];
}

/**
 * Process raw Notion API properties into usable format
 * @param {Object} properties - Raw properties from Notion API
 * @returns {Array} Processed properties array
 */
function processDatabaseProperties(properties) {
  console.log("=== DEBUG: Processing database properties ===");
  
  const processedProperties = [];
  
  for (const [name, propertyData] of Object.entries(properties)) {
    const isMappable = isPropertyMappable(propertyData.type);
    
    console.log(`Property: ${name} (${propertyData.type}) - Mappable: ${isMappable}`);
    
    processedProperties.push({
      id: propertyData.id,
      name: name,
      type: propertyData.type,
      isTitle: propertyData.type === "title",
      isRequired: name === "Name" || propertyData.type === "title",
      supportedForMapping: isMappable,
      config: propertyData[propertyData.type] || {}
    });
  }
  
  return processedProperties;
}

/**
 * Check if a Notion property type is mappable from email data
 * @param {string} propertyType - The Notion property type
 * @returns {boolean} True if property can be mapped
 */
function isPropertyMappable(propertyType) {
  // Auto-managed properties that should NOT be mappable
  const autoManagedTypes = [
    "formula",      // Calculated by Notion
    "rollup",       // Aggregated from relations
    "created_time", // Auto-set by Notion
    "created_by",   // Auto-set by Notion
    "last_edited_time", // Auto-set by Notion
    "last_edited_by",   // Auto-set by Notion
    "people"        // Special handling required
  ];
  
  return !autoManagedTypes.includes(propertyType);
}

/**
 * Check if property should show Gmail field mapping UI
 * @param {string} propertyType - The Notion property type
 * @returns {boolean} True if property maps to Gmail fields
 */
function shouldShowGmailFieldMapping(propertyType) {
  // Properties that use static values instead of Gmail fields
  const staticValueProperties = [
    "relation",      // Links to other database (static selection)
    "checkbox",      // True/false value (static)
    "select",        // Predefined option (static)
    "status",        // Predefined status (static)
    "multi_select",  // Multiple predefined options (static)
    "people"         // Notion workspace users
  ];
  
  return !staticValueProperties.includes(propertyType);
}

/**
 * Get transformation options for a property type
 * @param {string} propertyType - Notion property type
 * @returns {Array<{label: string, value: string}>} Transformation options
 */
function getTransformationOptions(propertyType) {
  const transformations = {
    title: [
      { label: "Use as-is", value: "none" },
      { label: "Remove 'Re:'/'Fwd:'", value: "remove_prefixes" },
      { label: "Truncate (100 chars)", value: "truncate_100" }
    ],
    rich_text: [
      { label: "HTML to plain text", value: "html_to_text" },
      { label: "First 500 chars", value: "truncate_500" },
      { label: "Extract links", value: "extract_links" }
    ],
    email: [
      { label: "Extract email address", value: "extract_email" },
      { label: "Keep full format", value: "keep_full" }
    ],
    date: [
      { label: "Parse date", value: "parse_date" },
      { label: "ISO format", value: "iso_date" },
      { label: "Human readable format", value: "human_date" }
    ],
    url: [
      { label: "Use as-is", value: "none" },
      { label: "Make clickable link", value: "make_clickable" }
    ],
    number: [
      { label: "Count items", value: "count_items" },
      { label: "Extract number", value: "extract_number" }
    ],
    checkbox: [
      { label: "True if exists", value: "exists_to_true" },
      { label: "Convert yes/no", value: "yes_no" }
    ],
    multi_select: [
      { label: "Split by comma", value: "split_comma" },
      { label: "Use first item", value: "first_item" }
    ],
    select: [
      { label: "Use first label", value: "first_item" },
      { label: "Join all labels", value: "join_items" }
    ],
    files: [
      { label: "Upload to Drive", value: "upload_drive" },
      { label: "Skip attachments", value: "skip_files" }
    ]
  };
  
  return transformations[propertyType] || [{ label: "No processing", value: "none" }];
}

/**
 * Get recommended email field for a property type
 * @param {string} propertyType - Notion property type
 * @returns {string} Recommended Gmail field
 */
function getRecommendedEmailField(propertyType) {
  const recommendations = {
    title: "subject",
    rich_text: "body",
    email: "from",
    url: "gmailLinkUrl", // Perfect for URL properties!
    date: "date",
    checkbox: "hasAttachments",
    number: "attachmentCount",
    select: "labels",
    multi_select: "labels",
    status: "labels",
    files: "attachments",
    phone_number: "from",
    people: "from"
  };
  
  return recommendations[propertyType] || "subject";
}

/**
 * Get display name for property type
 * @param {string} propertyType - Notion property type
 * @returns {string} Display name
 */
function getPropertyTypeDisplayName(propertyType) {
  const displayNames = {
    title: "Title",
    rich_text: "Text",
    select: "Select",
    status: "Status",
    multi_select: "Multi-select",
    checkbox: "Checkbox",
    people: "People",
    date: "Date",
    files: "Files",
    relation: "Relation",
    url: "URL",
    number: "Number",
    phone_number: "Phone",
    email: "Email"
  };
  
  return displayNames[propertyType] || propertyType;
}

/**
 * Test Notion fetcher functions
 * @returns {string} Test results
 */
function testNotionFetcherFunctions() {
  console.log("=== Testing Notion Fetcher Functions ===");
  
  let allTestsPassed = true;
  const testResults = [];
  
  // Test isPropertyMappable
  console.log("Testing isPropertyMappable():");
  const mappableTests = [
    { type: "title", expected: true, desc: "title should be mappable" },
    { type: "formula", expected: false, desc: "formula should NOT be mappable" },
    { type: "relation", expected: true, desc: "relation should be mappable" },
    { type: "people", expected: false, desc: "people should NOT be mappable" },
    { type: "select", expected: true, desc: "select should be mappable" },
    { type: "created_time", expected: false, desc: "created_time should NOT be mappable" },
    { type: "last_edited_by", expected: false, desc: "last_edited_by should NOT be mappable" }
  ];
  
  mappableTests.forEach(test => {
    const result = isPropertyMappable(test.type);
    const passed = result === test.expected;
    
    testResults.push({ test: test.desc, passed });
    console.log(`  ${passed ? "✅" : "❌"} ${test.desc}: ${result} (expected ${test.expected})`);
    
    if (!passed) allTestsPassed = false;
  });
  
  // Test shouldShowGmailFieldMapping
  console.log("\nTesting shouldShowGmailFieldMapping():");
  const gmailFieldTests = [
    { type: "title", expected: true, desc: "title should show Gmail fields" },
    { type: "relation", expected: false, desc: "relation should NOT show Gmail fields" },
    { type: "select", expected: false, desc: "select should NOT show Gmail fields" },
    { type: "people", expected: false, desc: "people should NOT show Gmail fields" },
    { type: "email", expected: true, desc: "email should show Gmail fields" },
    { type: "checkbox", expected: false, desc: "checkbox should NOT show Gmail fields" },
    { type: "rich_text", expected: true, desc: "rich_text should show Gmail fields" }
  ];
  
  gmailFieldTests.forEach(test => {
    const result = shouldShowGmailFieldMapping(test.type);
    const passed = result === test.expected;
    
    testResults.push({ test: test.desc, passed });
    console.log(`  ${passed ? "✅" : "❌"} ${test.desc}: ${result} (expected ${test.expected})`);
    
    if (!passed) allTestsPassed = false;
  });
  
  // Test getRecommendedEmailField
  console.log("\nTesting getRecommendedEmailField():");
  const recommendationTests = [
    { type: "title", expected: "subject", desc: "title -> subject" },
    { type: "url", expected: "gmailLinkUrl", desc: "url -> gmailLinkUrl" },
    { type: "unknown", expected: "subject", desc: "unknown -> subject" },
    { type: "date", expected: "date", desc: "date -> date" }
  ];
  
  recommendationTests.forEach(test => {
    const result = getRecommendedEmailField(test.type);
    const passed = result === test.expected;
    
    testResults.push({ test: test.desc, passed });
    console.log(`  ${passed ? "✅" : "❌"} ${test.desc}: ${result} (expected ${test.expected})`);
    
    if (!passed) allTestsPassed = false;
  });
  
  // Test getTransformationOptions
  console.log("\nTesting getTransformationOptions():");
  const options = getTransformationOptions("title");
  const isArray = Array.isArray(options);
  const hasItems = options.length > 0;
  
  testResults.push({ test: "getTransformationOptions returns array", passed: isArray });
  testResults.push({ test: "getTransformationOptions has items", passed: hasItems });
  
  console.log(`  ${isArray ? "✅" : "❌"} Returns array: ${isArray}`);
  console.log(`  ${hasItems ? "✅" : "❌"} Has items: ${options.length}`);
  
  if (!isArray || !hasItems) {
    allTestsPassed = false;
  }
  
  // Summary
  console.log("\n=== TEST SUMMARY ===");
  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;
  
  console.log(`Passed: ${passedCount}/${totalCount}`);
  
  return allTestsPassed 
    ? `✅ All Notion fetcher tests passed! (${passedCount}/${totalCount})`
    : `❌ Some tests failed! (${passedCount}/${totalCount})`;
}

/**
 * Quick test for Notion API connectivity
 * @returns {string} Test result message
 */
function testNotionAPIConnection() {
  console.log("=== Testing Notion API Connection ===");
  
  const config = getConfig();
  
  if (!config.apiKey) {
    console.log("❌ No API key configured");
    return "❌ Please set your Notion API key in Settings first.";
  }
  
  console.log("API key found (first 10 chars):", config.apiKey.substring(0, 10) + "...");
  
  try {
    // Test by fetching users (lightweight endpoint)
    const users = fetchNotionWorkspaceUsers();
    
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
 * @returns {string} Test result message
 */
function testDatabaseSchema() {
  console.log("=== Testing Database Schema Fetch ===");
  
  const config = getConfig();
  
  if (!config.apiKey || !config.databaseId) {
    return "❌ Please configure API key and select a database first.";
  }
  
  try {
    const result = fetchNotionDatabaseSchema(config.databaseId, config.apiKey);
    
    if (result.success) {
      const database = result.database;
      console.log("✅ Database loaded: " + database.title);
      console.log("Total properties: " + database.properties.length);
      
      // Count property types
      const typeCounts = {};
      database.properties.forEach(prop => {
        typeCounts[prop.type] = (typeCounts[prop.type] || 0) + 1;
      });
      
      console.log("Property types:");
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} properties`);
      });
      
      return `✅ Database schema loaded: ${database.title} with ${database.properties.length} properties`;
    }
    
    return "❌ Failed to load database: " + result.error;
    
  } catch (error) {
    console.error("Error testing database schema:", error);
    return "❌ Error testing database schema: " + error.message;
  }
}