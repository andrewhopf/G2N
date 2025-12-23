/**
 * @fileoverview Utility functions for Gmail to Notion integration
 * @version 2.0.0
 * @description Shared utilities for data transformation, validation, and API calls
 */

/**
 * Get all available Gmail fields for mapping
 * @returns {Array<{label: string, value: string}>} Array of Gmail fields
 */
function getAvailableGmailFields() {
  return [
    // Basic fields
    { label: "📝 Subject", value: "subject" },
    { label: "👤 From/Sender", value: "from" },
    { label: "👥 To Recipients", value: "to" },
    { label: "📋 CC Recipients", value: "cc" },
    { label: "👻 BCC Recipients", value: "bcc" },
    { label: "↩️ Reply-To", value: "replyTo" },
    
    // Dates
    { label: "📅 Date Received", value: "date" },
    { label: "✉️ Message Date", value: "internalDate" },
    
    // Content
    { label: "📄 Body (HTML)", value: "body" },
    { label: "📄 Body (Plain Text)", value: "plainBody" },
    { label: "📋 Body Snippet", value: "snippet" },
    
    // Identification
    { label: "🔑 Message ID", value: "messageId" },
    { label: "🧵 Thread ID", value: "threadId" },
    { label: "🔗 Gmail Link URL", value: "gmailLinkUrl" },
    { label: "#️⃣ History ID", value: "historyId" },
    
    // Status
    { label: "🏷️ Labels", value: "labels" },
    { label: "📌 Starred", value: "starred" },
    { label: "📥 In Inbox", value: "inInbox" },
    { label: "💬 Has Attachments", value: "hasAttachments" },
    { label: "👀 Unread", value: "unread" },
    
    // Attachments
    { label: "📎 Attachments", value: "attachments" },
    { label: "#️⃣ Attachment Count", value: "attachmentCount" },
    { label: "📎 Attachment Names", value: "attachmentNames" }
  ];
}

/**
 * Get allowed Notion property types for a specific Gmail field
 * @param {string} gmailField - The Gmail field name
 * @returns {string[]} Array of allowed Notion property types
 */
function getAllowedPropertyTypesForGmailField(gmailField) {
  const mapping = {
    // Email identification
    subject: ["title", "rich_text", "url"],
    from: ["email", "rich_text"],
    to: ["email", "rich_text"],
    cc: ["email", "rich_text"],
    bcc: ["email", "rich_text"],
    replyTo: ["email", "rich_text"],
    
    // Content
    body: ["rich_text"],
    plainBody: ["rich_text"],
    snippet: ["rich_text"],
    
    // Dates
    date: ["date", "rich_text"],
    internalDate: ["date", "rich_text", "number"],
    
    // Identification
    messageId: ["rich_text", "url"],
    threadId: ["rich_text", "url"],
    gmailLinkUrl: ["url", "rich_text"],
    historyId: ["rich_text", "number"],
    
    // Status
    labels: ["multi_select", "select", "rich_text"],
    starred: ["checkbox", "rich_text"],
    inInbox: ["checkbox", "rich_text"],
    hasAttachments: ["checkbox", "rich_text"],
    unread: ["checkbox", "rich_text"],
    
    // Attachments
    attachments: ["files", "rich_text"],
    attachmentCount: ["number", "rich_text", "checkbox"],
    attachmentNames: ["rich_text"]
  };
  
  return mapping[gmailField] || ["rich_text"]; // Default to rich_text
}

/**
 * Extract specific header from email message
 * @param {GmailApp.GmailMessage} email - Gmail message
 * @param {string} headerName - Header name to extract
 * @returns {string} Header value or empty string
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
 * @param {string} apiKey - Notion API key
 * @param {string} databaseId - Notion database ID
 * @param {Object} properties - Properties to save
 * @returns {Object} Response object with id and url
 * @throws {Error} If API call fails
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
 * @param {string} text - Text containing email address
 * @returns {string|null} Extracted email address
 */
function extractEmailFromString(text) {
  if (!text) return null;
  
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  
  return match ? match[0] : null;
}

/**
 * Find Notion user ID by email address
 * @param {string} email - Email address
 * @param {string} apiKey - Notion API key
 * @returns {string|null} Notion user ID or null if not found
 */
function findNotionUserIdByEmail(email, apiKey) {
  try {
    if (!email || !apiKey) return null;
    
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
      
      // Find user by email (case-insensitive)
      const user = users.find(user => 
        user.type === "person" && 
        user.person?.email?.toLowerCase() === email.toLowerCase()
      );
      
      if (user) {
        console.log(`Found Notion user for email ${email}: ${user.id}`);
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
 * @param {Object} emailData - Extracted email data
 * @param {Object} mappings - Field mappings configuration
 * @returns {Object} Notion API properties object
 */
function applyMappings(emailData, mappings) {
  console.log("=== APPLYING MAPPINGS ===");
  
  const notionProperties = {};
  
  Object.entries(mappings).forEach(([propertyId, mapping]) => {
    try {
      // Skip if mapping is not enabled (except for required properties)
      if (!mapping.enabled && !mapping.isRequired) {
        return;
      }
      
      const handler = getPropertyHandler(mapping.type);
      
      if (handler && handler.processForNotion) {
        const propertyValue = handler.processForNotion(mapping, emailData);
        
        if (propertyValue !== null) {
          notionProperties[propertyId] = propertyValue;
        }
      }
    } catch (error) {
      console.error(`Error applying mapping for property ${propertyId}:`, error);
      // Continue with other mappings even if one fails
    }
  });
  
  console.log(`Applied ${Object.keys(notionProperties).length} properties`);
  return notionProperties;
}

/**
 * Escape HTML for safe display in UI
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
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
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Format date to ISO string with timezone
 * @param {Date|string} date - Date to format
 * @returns {string} ISO date string
 */
function formatToISODate(date) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      throw new Error("Invalid date");
    }
    
    return dateObj.toISOString();
  } catch (error) {
    console.error("Error formatting date:", error);
    return new Date().toISOString();
  }
}