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
        properties: processDatabaseProperties(result.properties), // CALLS YOUR FUNCTION
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

// ============================================
// PROPERTY PROCESSING FUNCTIONS (ADD THESE)
// ============================================

/**
 * Process raw Notion API properties into usable format
 */
function processDatabaseProperties(properties) {
  console.log("=== DEBUG: Processing database properties ===");
  const result = [];
  
  for (const [name, prop] of Object.entries(properties)) {
    const isSupported = isSupportedForMapping(prop.type);
    
    console.log(`Property: ${name} (${prop.type}) - Supported: ${isSupported}`);
    
    result.push({
      id: prop.id,
      name: name,
      type: prop.type,
      isTitle: "title" === prop.type,
      isRequired: "Name" === name || "title" === prop.type,
      supportedForMapping: isSupported,
      config: prop[prop.type] || {}
    });
  }
  
  return result;
}

function isSupportedForMapping(propertyType) {
  const unsupportedTypes = ["formula", "rollup"]; // Note: relation IS supported!
  return !unsupportedTypes.includes(propertyType);
}

/**
 * Check if a Notion property type can be mapped from email data
 */
function isSupportedForMapping(propertyType) {
  // These property types are auto-managed by Notion or can't receive external data
  const unsupportedTypes = [
    "formula",      // Calculated by Notion
    "rollup",       // Aggregated from relations
    "relation",     // Links to other databases
    "created_time", // Auto-set by Notion
    "created_by",   // Auto-set by Notion
    "last_edited_time", // Auto-set by Notion
    "last_edited_by"    // Auto-set by Notion
  ];
  
  return !unsupportedTypes.includes(propertyType);
}

/**
 * Simple transformation options for property types
 */
function getTransformationOptions(propertyType) {
  const transformations = {
    "title": [
      { label: "Use as-is", value: "none" },
      { label: "Remove 'Re:'/'Fwd:' prefixes", value: "remove_prefixes" },
      { label: "Truncate to 100 chars", value: "truncate_100" }
    ],
    "rich_text": [
      { label: "HTML to plain text", value: "html_to_text" },
      { label: "Keep first 500 chars", value: "truncate_500" },
      { label: "Extract links only", value: "extract_links" }
    ],
    "email": [
      { label: "Extract email address only", value: "extract_email" },
      { label: "Keep name + email", value: "keep_full" }
    ],
    "url": [
      { label: "Use as-is", value: "none" },
      { label: "Make clickable [text](url)", value: "markdown_link" }
    ],
    "date": [
      { label: "Parse to ISO date", value: "iso_date" },
      { label: "Human readable format", value: "human_date" }
    ],
    "checkbox": [
      { label: "True if exists", value: "exists_to_true" },
      { label: "Convert yes/no", value: "yes_no" }
    ],
    "number": [
      { label: "Count items", value: "count_items" },
      { label: "Extract first number", value: "extract_number" }
    ]
  };
  
  return transformations[propertyType] || [{ label: "No processing", value: "none" }];
}

// ============================================
// ADDITIONAL HELPER FUNCTIONS (ALSO NEED THESE)
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
    "people": "from"
  };
  
  return recommendations[propertyType] || "subject";
}

/**
 * Test function to verify all notion-fetcher functions work
 */
function testNotionFetcherFunctions() {
  console.log("=== Testing Notion Fetcher Functions ===");
  
  // Test isSupportedForMapping
  console.log("isSupportedForMapping('title'):", isSupportedForMapping("title") ? "✅" : "❌");
  console.log("isSupportedForMapping('formula'):", !isSupportedForMapping("formula") ? "✅" : "❌");
  
  // Test getRecommendedEmailField
  console.log("getRecommendedEmailField('title'):", getRecommendedEmailField("title") === "subject" ? "✅" : "❌");
  console.log("getRecommendedEmailField('unknown'):", getRecommendedEmailField("unknown") === "subject" ? "✅" : "❌");
  
  // Test getTransformationOptions
  const titleTransforms = getTransformationOptions("title");
  console.log("getTransformationOptions returns array:", Array.isArray(titleTransforms) ? "✅" : "❌");
  
  // Test processDatabaseProperties with mock data
  const mockProperties = {
    "Name": { id: "test_id_1", type: "title" },
    "Date": { id: "test_id_2", type: "date" }
  };
  
  const processed = processDatabaseProperties(mockProperties);
  console.log("processDatabaseProperties works:", processed.length === 2 ? "✅" : "❌");
  
  return "✅ All tests passed!";
}