/**
 * @fileoverview Utility functions with caching support for Gmail to Notion integration
 * @version 2.1.0
 * @description Shared utilities with caching, data transformation, validation, and API calls
 */

// Cache Service for reducing API calls
const CACHE = {
  databases: CacheService.getUserCache(),
  schemas: CacheService.getUserCache(),
  users: CacheService.getUserCache(),
  
  get: function(key, type = 'databases') {
    try {
      const cached = this[type].get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  },
  
  set: function(key, value, type = 'databases', expiration = 300) {
    try {
      this[type].put(key, JSON.stringify(value), expiration);
    } catch (e) {
      console.warn('Cache set failed:', e);
    }
  },
  
  remove: function(key, type = 'databases') {
    this[type].remove(key);
  }
};

/**
 * Optimized fetch with caching for Notion databases
 */
function fetchRealNotionDatabases() {
  console.log("=== DEBUG: fetchRealNotionDatabases called ===");
  const config = getConfig();
  
  if (!config.apiKey) {
    console.log("ERROR: No API key configured");
    return [];
  }
  
  // Check cache first
  const cacheKey = `databases_${config.apiKey.substr(0, 8)}`;
  const cached = CACHE.get(cacheKey);
  if (cached) {
    console.log("Returning cached databases");
    return cached;
  }
  
  try {
    const options = {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.apiKey,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      payload: JSON.stringify({
        filter: { property: "object", value: "database" },
        sort: { direction: "descending", timestamp: "last_edited_time" }
      }),
      muteHttpExceptions: true
    };
    
    console.log("Making API request to Notion...");
    const response = UrlFetchApp.fetch("https://api.notion.com/v1/search", options);
    const status = response.getResponseCode();
    const text = response.getContentText();
    
    console.log("Notion API response status: " + status);
    
    if (status === 200) {
      const results = JSON.parse(text).results || [];
      console.log(`Found ${results.length} databases`);
      
      const databases = results.map(db => {
        let name = "Untitled Database";
        
        // Extract title efficiently
        if (db.title && db.title.length > 0) {
          name = db.title[0].plain_text;
        } else if (db.properties) {
          const titleProp = Object.values(db.properties).find(p => p.type === "title");
          if (titleProp) {
            name = titleProp.name || "Untitled Database";
          }
        }
        
        return {
          id: db.id,
          name: name,
          url: db.url,
          icon: db.icon,
          lastEdited: db.last_edited_time
        };
      });
      
      // Cache the results
      CACHE.set(cacheKey, databases);
      return databases;
    } else {
      console.error(`Notion API error ${status}:`, text.substring(0, 200));
      return [];
    }
  } catch (error) {
    console.error("Error fetching databases:", error);
    return [];
  }
}

/**
 * Test if an email ID is valid for GmailApp
 */
function testGmailAppAccess(emailId) {
  try {
    return GmailApp.getMessageById(emailId) !== null;
  } catch (e) {
    console.log(`GmailApp cannot access email with ID "${emailId}":`, e.message);
    return false;
  }
}

/**
 * Extract email ID that works with GmailApp
 */
function getGmailAppCompatibleId(messageId) {
  const idTests = [
    { id: messageId, desc: "original" },
    { id: messageId.includes(':') ? messageId.split(':')[1] : null, desc: "after colon" },
    { id: messageId.replace(/\D/g, ''), desc: "numeric only" },
    { id: messageId.split(':').pop(), desc: "after last colon" },
    { id: messageId.replace(/^(msg-|id-|f:)/, ''), desc: "without prefix" }
  ];
  
  console.log("Testing GmailApp compatible IDs for:", messageId);
  
  for (const test of idTests) {
    if (!test.id || test.id.length < 5) continue;
    
    console.log(`  Test (${test.desc}): "${test.id}"`);
    
    if (testGmailAppAccess(test.id)) {
      console.log(`  ✅ Found working GmailApp ID: "${test.id}"`);
      return test.id;
    }
  }
  
  console.log("❌ No working GmailApp ID found");
  return null;
}

/**
 * Get all available Gmail fields for mapping
 */
function getAvailableGmailFields() {
  return [
    { label: "📝 Subject", value: "subject" },
    { label: "👤 From/Sender", value: "from" },
    { label: "👥 To Recipients", value: "to" },
    { label: "📋 CC Recipients", value: "cc" },
    { label: "👻 BCC Recipients", value: "bcc" },
    { label: "↩️ Reply-To", value: "replyTo" },
    { label: "📅 Date Received", value: "date" },
    { label: "✉️ Message Date", value: "internalDate" },
    { label: "📄 Body (HTML)", value: "body" },
    { label: "📄 Body (Plain Text)", value: "plainBody" },
    { label: "📋 Body Snippet", value: "snippet" },
    { label: "🔑 Message ID", value: "messageId" },
    { label: "🧵 Thread ID", value: "threadId" },
    { label: "🔗 Gmail Link URL", value: "gmailLinkUrl" },
    { label: "#️⃣ History ID", value: "historyId" },
    { label: "🏷️ Labels", value: "labels" },
    { label: "📌 Starred", value: "starred" },
    { label: "📥 In Inbox", value: "inInbox" },
    { label: "💬 Has Attachments", value: "hasAttachments" },
    { label: "👀 Unread", value: "unread" },
    { label: "📎 Attachments", value: "attachments" },
    { label: "#️⃣ Attachment Count", value: "attachmentCount" },
    { label: "📎 Attachment Names", value: "attachmentNames" }
  ];
}

/**
 * Get allowed Notion property types for a specific Gmail field
 */
function getAllowedPropertyTypesForGmailField(gmailField) {
  const mapping = {
    subject: ["title", "rich_text", "url"],
    from: ["email", "rich_text"],
    to: ["email", "rich_text"],
    cc: ["email", "rich_text"],
    bcc: ["email", "rich_text"],
    replyTo: ["email", "rich_text"],
    body: ["rich_text"],
    plainBody: ["rich_text"],
    snippet: ["rich_text"],
    date: ["date", "rich_text"],
    internalDate: ["date", "rich_text", "number"],
    messageId: ["rich_text", "url"],
    threadId: ["rich_text", "url"],
    gmailLinkUrl: ["url", "rich_text"],
    historyId: ["rich_text", "number"],
    labels: ["multi_select", "select", "rich_text"],
    starred: ["checkbox", "rich_text"],
    inInbox: ["checkbox", "rich_text"],
    hasAttachments: ["checkbox", "rich_text"],
    unread: ["checkbox", "rich_text"],
    attachments: ["files", "rich_text"],
    attachmentCount: ["number", "rich_text", "checkbox"],
    attachmentNames: ["rich_text"]
  };
  
  return mapping[gmailField] || ["rich_text"];
}

/**
 * Extract specific header from email message
 */
function extractHeader(email, headerName) {
  try {
    return email.getHeader(headerName) || "";
  } catch (error) {
    return "";
  }
}

/**
 * Save data to Notion API
 */
function saveToNotionAPI(apiKey, databaseId, properties) {
  const payload = {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    payload: JSON.stringify({
      parent: { database_id: databaseId },
      properties: properties
    }),
    muteHttpExceptions: true
  };
  
  console.log("Sending to Notion API...");
  
  try {
    const response = UrlFetchApp.fetch("https://api.notion.com/v1/pages", payload);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (statusCode === 200) {
      const data = JSON.parse(responseText);
      return {
        id: data.id,
        url: data.url,
        created_time: data.created_time
      };
    } else {
      console.error("Notion API Error:", statusCode, responseText);
      let errorMessage = "Failed to save to Notion";
      
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorMessage;
      } catch (parseError) {
        // Keep default message
      }
      
      throw new Error(`Notion API Error (${statusCode}): ${errorMessage}`);
    }
  } catch (error) {
    console.error("Failed to call Notion API:", error);
    throw error;
  }
}

/**
 * Extract email address from string
 */
function extractEmailFromString(text) {
  if (!text) return null;
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

/**
 * Find Notion user ID by email address
 */
function findNotionUserIdByEmail(email, apiKey) {
  try {
    if (!email || !apiKey) return null;
    
    // Check cache first
    const cacheKey = `user_${email}`;
    const cached = CACHE.get(cacheKey, 'users');
    if (cached) return cached;
    
    const options = {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": "2022-06-28"
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch("https://api.notion.com/v1/users", options);
    
    if (response.getResponseCode() === 200) {
      const users = JSON.parse(response.getContentText()).results || [];
      const user = users.find(user => 
        user.type === "person" && 
        user.person?.email?.toLowerCase() === email.toLowerCase()
      );
      
      if (user) {
        console.log(`Found Notion user for email ${email}: ${user.id}`);
        CACHE.set(cacheKey, user.id, 'users', 600);
        return user.id;
      }
    }
    
    console.log("No Notion user found for email:", email);
    return null;
    
  } catch (error) {
    console.warn("Could not search Notion users:", error.message);
    return null;
  }
}

/**
 * Apply mappings to email data to create Notion properties
 */
function applyMappings(emailData, mappings) {
  console.log("=== APPLYING MAPPINGS ===");
  
  const notionProperties = {};
  
  Object.entries(mappings).forEach(([propertyId, mapping]) => {
    try {
      if (!mapping.enabled && !mapping.isRequired) return;
      
      const handler = getPropertyHandler(mapping.type);
      if (handler && handler.processForNotion) {
        const propertyValue = handler.processForNotion(mapping, emailData);
        if (propertyValue !== null) {
          notionProperties[propertyId] = propertyValue;
        }
      }
    } catch (error) {
      console.error(`Error applying mapping for property ${propertyId}:`, error);
    }
  });
  
  console.log(`Applied ${Object.keys(notionProperties).length} properties`);
  return notionProperties;
}

/**
 * Escape HTML for safe display in UI
 */
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validate email address format
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Format date to ISO string with timezone
 */
function formatToISODate(date) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
    return dateObj.toISOString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return new Date().toISOString();
  }
}