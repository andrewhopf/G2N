// notion-fetcher.js
// ============================================
// NOTION API FUNCTIONS
// ============================================

/**
 * Fetches database schema from Notion API
 */
function fetchNotionDatabaseSchema(databaseId, apiKey) {
  if (!databaseId || !apiKey) {
    throw new Error("Missing database ID or API key");
  }
  
  try {
    const url = `https://api.notion.com/v1/databases/${databaseId}`;
    
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() !== 200) {
      throw new Error(result.message || "Failed to fetch database");
    }
    
    return {
      success: true,
      database: {
        id: result.id,
        title: result.title[0]?.plain_text || "Untitled",
        properties: processDatabaseProperties(result.properties),
        url: result.url
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
 * Fetch Notion workspace users for people properties
 * @returns {Array} List of Notion users
 */
function fetchNotionWorkspaceUsers() {
  try {
    var config = getConfig();
    if (!config.apiKey) return [];
    
    var options = {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + config.apiKey,
        "Notion-Version": "2022-06-28"
      },
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch("https://api.notion.com/v1/users", options);
    var data = JSON.parse(response.getContentText());
    
    if (response.getResponseCode() === 200) {
      return data.results
        .filter(user => user.type === "person") // Only real users, not bots
        .map(user => ({
          id: user.id,
          name: user.name || "Unknown User",
          email: user.person?.email || ""
        }));
    }
  } catch (e) {
    console.error("Error fetching Notion users:", e);
  }
  
  return [];
}

// ============================================
// PROPERTY PROCESSING FUNCTIONS
// ============================================

/**
 * Process raw Notion API properties into usable format
 */
function processDatabaseProperties(properties) {
  console.log("=== DEBUG: Processing database properties ===");
  const result = [];
  
  for (const [name, prop] of Object.entries(properties)) {
    // Use the new isPropertyMappable function
    const isMappable = isPropertyMappable(prop.type);
    
    console.log(`Property: ${name} (${prop.type}) - Mappable: ${isMappable}`);
    
    result.push({
      id: prop.id,
      name: name,
      type: prop.type,
      isTitle: "title" === prop.type,
      isRequired: "Name" === name || "title" === prop.type,
      supportedForMapping: isMappable, // Using the correct function
      config: prop[prop.type] || {}
    });
  }
  
  return result;
}

// REMOVED: Both duplicate isSupportedForMapping functions
// They were causing conflicts and incorrect filtering

/**
 * Check if a Notion property type is mappable from email data
 * CORRECTED: Properly categorizes all property types
 * @param {string} propertyType - The Notion property type
 * @returns {boolean} True if property can be mapped
 */
function isPropertyMappable(propertyType) {
  // These property types CANNOT be mapped at all (Notion manages them)
  const unmappableTypes = [
    "formula",          // Calculated by Notion
    "rollup",           // Aggregated from relations
    "created_time",     // Auto-set by Notion
    "created_by",       // Auto-set by Notion
    "last_edited_time", // Auto-set by Notion
    "last_edited_by",   // Auto-set by Notion
    "people"            // NOTION USERS - not mappable from email!
  ];
  
  // All other types are mappable in some way
  return !unmappableTypes.includes(propertyType);
}

/**
 * Check if property should show Gmail field mapping UI
 * Some properties (like select, checkbox, relation, people) use static values instead
 * @param {string} propertyType - The Notion property type
 * @returns {boolean} True if property maps to Gmail fields
 */
function shouldShowGmailFieldMapping(propertyType) {
  // These property types use STATIC VALUES, not Gmail field mapping
  const staticValueTypes = [
    "relation",      // Links to other database (static selection)
    "checkbox",      // True/false value (static)
    "select",        // Predefined option (static)
    "status",        // Predefined status (static)
    "multi_select",  // Multiple predefined options (static)
    "people"         // NOTION USERS - select from workspace members
  ];
  
  // Return true for properties that DO map to Gmail fields
  return !staticValueTypes.includes(propertyType);
}

/**
 * Get transformation options for property type
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
    // NEW: Added for checkbox properties (e.g., hasAttachments, starred)
    checkbox: [
      { label: "True if exists", value: "exists_to_true" },
      { label: "Convert yes/no", value: "yes_no" }
    ],
    // NEW: Added for multi-select properties (e.g., labels)
    multi_select: [
      { label: "Split by comma", value: "split_comma" },
      { label: "Use first item", value: "first_item" }
    ],
    // NEW: Added for select properties (e.g., labels as single select)
    select: [
      { label: "Use first label", value: "first_item" },
      { label: "Join all labels", value: "join_items" }
    ],
    // NEW: Added for files properties (attachments)
    files: [
      { label: "Upload to Drive", value: "upload_drive" },
      { label: "Skip attachments", value: "skip_files" }
    ]
  };
  
  return transformations[propertyType] || [{ label: "No processing", value: "none" }];
}

// ============================================
// ADDITIONAL HELPER FUNCTIONS
// ============================================

/**
 * Get recommended email field for property type
 * MUST return a valid string, never null or undefined
 */
function getRecommendedEmailField(propertyType) {
  const recommendations = {
    "title": "subject",
    "rich_text": "body",
    "email": "from",
    "url": "gmailLinkUrl",  // Perfect for URL properties!
    "date": "date",
    "checkbox": "hasAttachments",
    "number": "attachmentCount",
    "select": "labels",
    "multi_select": "labels",
    "status": "labels",
    "files": "attachments",
    "phone_number": "from",
    "people": "from"  // Note: This is now unused since people is static
  };
  
  return recommendations[propertyType] || "subject";
}

/**
 * Get property type display name for UI
 * @param {string} propertyType - The Notion property type
 * @returns {string} Display name
 */
function getPropertyTypeDisplayName(propertyType) {
  const displayNames = {
    "title": "Title",
    "rich_text": "Text",
    "select": "Select",
    "status": "Status",
    "multi_select": "Multi-select",
    "checkbox": "Checkbox",
    "people": "People",
    "date": "Date",
    "files": "Files",
    "relation": "Relation",
    "url": "URL",
    "number": "Number",
    "phone_number": "Phone",
    "email": "Email"
  };
  
  return displayNames[propertyType] || propertyType;
}

// ============================================
// TEST FUNCTIONS
// ============================================

/**
 * Test function to verify all notion-fetcher functions work
 */
function testNotionFetcherFunctions() {
  console.log("=== Testing Notion Fetcher Functions ===");
  
  let allPassed = true;
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
    if (!passed) allPassed = false;
  });
  
  // Test shouldShowGmailFieldMapping
  console.log("\nTesting shouldShowGmailFieldMapping():");
  const gmailMappingTests = [
    { type: "title", expected: true, desc: "title should show Gmail fields" },
    { type: "relation", expected: false, desc: "relation should NOT show Gmail fields" },
    { type: "select", expected: false, desc: "select should NOT show Gmail fields" },
    { type: "people", expected: false, desc: "people should NOT show Gmail fields" },
    { type: "email", expected: true, desc: "email should show Gmail fields" },
    { type: "checkbox", expected: false, desc: "checkbox should NOT show Gmail fields" },
    { type: "rich_text", expected: true, desc: "rich_text should show Gmail fields" }
  ];
  
  gmailMappingTests.forEach(test => {
    const result = shouldShowGmailFieldMapping(test.type);
    const passed = result === test.expected;
    testResults.push({ test: test.desc, passed });
    console.log(`  ${passed ? "✅" : "❌"} ${test.desc}: ${result} (expected ${test.expected})`);
    if (!passed) allPassed = false;
  });
  
  // Test getRecommendedEmailField
  console.log("\nTesting getRecommendedEmailField():");
  const emailFieldTests = [
    { type: "title", expected: "subject", desc: "title -> subject" },
    { type: "url", expected: "gmailLinkUrl", desc: "url -> gmailLinkUrl" },
    { type: "unknown", expected: "subject", desc: "unknown -> subject" },
    { type: "date", expected: "date", desc: "date -> date" }
  ];
  
  emailFieldTests.forEach(test => {
    const result = getRecommendedEmailField(test.type);
    const passed = result === test.expected;
    testResults.push({ test: test.desc, passed });
    console.log(`  ${passed ? "✅" : "❌"} ${test.desc}: ${result} (expected ${test.expected})`);
    if (!passed) allPassed = false;
  });
  
  // Test getTransformationOptions
  console.log("\nTesting getTransformationOptions():");
  const titleTransforms = getTransformationOptions("title");
  const transformsIsArray = Array.isArray(titleTransforms);
  const hasTransforms = titleTransforms.length > 0;
  
  testResults.push({ test: "getTransformationOptions returns array", passed: transformsIsArray });
  testResults.push({ test: "getTransformationOptions has items", passed: hasTransforms });
  
  console.log(`  ${transformsIsArray ? "✅" : "❌"} Returns array: ${transformsIsArray}`);
  console.log(`  ${hasTransforms ? "✅" : "❌"} Has items: ${titleTransforms.length}`);
  
  if (!transformsIsArray || !hasTransforms) {
    allPassed = false;
  }
  
  // Summary
  console.log("\n=== TEST SUMMARY ===");
  const passedCount = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  
  console.log(`Passed: ${passedCount}/${totalTests}`);
  
  return allPassed ? 
    `✅ All Notion fetcher tests passed! (${passedCount}/${totalTests})` : 
    `❌ Some tests failed! (${passedCount}/${totalTests})`;
}

/**
 * Quick test for Notion API connectivity
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
      users.slice(0, 3).forEach((user, i) => {
        console.log(`  ${i + 1}. ${user.name} (${user.email})`);
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
      const db = result.database;
      console.log(`✅ Database loaded: ${db.title}`);
      console.log(`Total properties: ${db.properties.length}`);
      
      // Count property types
      const typeCounts = {};
      db.properties.forEach(prop => {
        typeCounts[prop.type] = (typeCounts[prop.type] || 0) + 1;
      });
      
      console.log("Property types:");
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} properties`);
      });
      
      return `✅ Database schema loaded: ${db.title} with ${db.properties.length} properties`;
    } else {
      return `❌ Failed to load database: ${result.error}`;
    }
  } catch (error) {
    console.error("Error testing database schema:", error);
    return "❌ Error testing database schema: " + error.message;
  }
}

// --- END: notion-fetcher.js ---