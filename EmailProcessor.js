// ============================================/
// FILE: EmailProcessor.js
// DESCRIPTION: Email processing functions for Gmail to Notion integration
// ============================================

/**
 * Process email data and save to Notion
 * @param {string} emailId - Gmail message ID
 * @returns {Object} Result object with success status and page info
 * @throws {Error} If configuration or processing fails
 */
function processEmailToNotion(emailId) {
  console.log("=== PROCESSING EMAIL TO NOTION ===");
  console.log("Email Message ID:", emailId);
  
  var config = getConfig();
  if (!config.apiKey || !config.databaseId) {
    throw new Error("Configuration incomplete. Please set up API key and database.");
  }
  
  // Extract email data
  var emailData = extractEmailData(emailId);
  if (!emailData) {
    throw new Error("Could not extract email data.");
  }
  
  // Get current mappings
  var mappings = getMappings();
  if (!mappings || Object.keys(mappings).length === 0) {
    throw new Error("No field mappings configured. Please set up mappings first.");
  }
  
  // Apply mappings to create Notion properties
  var notionProperties = applyMappings(emailData, mappings);
  
  // Create page in Notion
  var result = createNotionPage(config.databaseId, config.apiKey, notionProperties);
  
  if (result && result.success) {
    console.log("✅ Successfully created Notion page:", result.url);
    return {
      success: true,
      pageId: result.id,
      pageUrl: result.url,
      emailId: emailId
    };
  }
  
  throw new Error(result?.error || "Failed to create Notion page");
}

/**
 * Extract email data from Gmail message (GmailApp method - for fallback)
 * @param {string} emailId - Gmail message ID (numeric only)
 * @returns {Object|null} Extracted email data or null on error
 */
function extractEmailData(emailId) {
  console.log("Extracting email data (GmailApp) for:", emailId);
  
  try {
    var message = GmailApp.getMessageById(emailId);
    if (!message) {
      console.error("Email not found with GmailApp");
      return null;
    }
    
    var thread = message.getThread();
    var attachments = message.getAttachments();
    
    var emailData = {
      // Basic info
      messageId: message.getId(),
      threadId: thread ? thread.getId() : "",
      subject: message.getSubject() || "(No Subject)",
      date: message.getDate() || new Date(),
      internalDate: message.getDate() ? message.getDate().getTime() : Date.now(),
      
      // Sender/Recipient info
      from: message.getFrom() || "",
      to: message.getTo() || "",
      cc: message.getCc() || "",
      bcc: message.getBcc() || "",
      replyTo: message.getReplyTo() || "",
      
      // Content
      body: message.getBody() || "",
      plainBody: message.getPlainBody() || "",
      snippet: message.getSnippet ? message.getSnippet() : "",
      
      // Status
      labels: message.getLabels ? message.getLabels().map(function(label) { 
        return label.getName(); 
      }) : [],
      starred: message.isStarred ? message.isStarred() : false,
      inInbox: message.isInInbox ? message.isInInbox() : false,
      unread: message.isUnread ? message.isUnread() : false,
      hasAttachments: attachments ? attachments.length > 0 : false,
      
      // Attachments
      attachments: attachments || [],
      attachmentCount: attachments ? attachments.length : 0,
      
      // Gmail specific URLs
      gmailLinkUrl: "https://mail.google.com/mail/u/0/#inbox/" + message.getId(),
      
      // History (for sync)
      historyId: thread && thread.getLastMessageHistoryId ? thread.getLastMessageHistoryId() : ""
    };
    
    console.log("✅ Email data extracted successfully (GmailApp)");
    console.log("Subject:", emailData.subject);
    console.log("From:", emailData.from);
    console.log("Attachment count:", emailData.attachmentCount);
    
    return emailData;
    
  } catch (error) {
    console.error("❌ Error extracting email data (GmailApp):", error);
    return null;
  }
}

/**
 * Extract email data using Gmail advanced service (Primary method for Add-ons)
 * @param {string} emailId - Gmail message ID (full format like "msg-f:1846678268263453604")
 * @returns {Object|null} Extracted email data
 */
function extractEmailDataAdvanced(emailId) {
  console.log("Extracting email data (advanced) for:", emailId);
  
  try {
    // Check if Gmail advanced service is available
    if (typeof Gmail === 'undefined') {
      console.error("Gmail advanced service not available");
      return null;
    }
    
    // Try with format: 'full' to get all data
    var message = Gmail.Users.Messages.get('me', emailId, {format: 'full'});
    if (!message) {
      console.error("Email not found via advanced service:", emailId);
      return null;
    }
    
    var payload = message.payload;
    var headers = payload.headers || [];
    
    // Extract headers
    var getHeader = function(name) {
      var header = headers.find(function(h) { return h.name === name; });
      return header ? header.value : "";
    };
    
    var subject = getHeader('Subject');
    var from = getHeader('From');
    var to = getHeader('To');
    var cc = getHeader('Cc');
    var bcc = getHeader('Bcc');
    var date = getHeader('Date');
    
    // Get body content with safe base64 decoding
    var body = "";
    var plainBody = "";
    
  function decodeBase64Safe(data) {
  if (!data || typeof data !== 'string') {
    console.warn("Invalid base64 data:", typeof data, data);
    return "";
  }
  try {
    // Handle URL-safe base64
    var base64Data = data.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64Data.length % 4 !== 0) {
      base64Data += '=';
    }
    var decoded = Utilities.base64Decode(base64Data);
    return Utilities.newBlob(decoded).getDataAsString('UTF-8');
  } catch (error) {
    console.warn("Base64 decoding error:", error.message);
    return "";
  }
}
    
    function extractBodyFromParts(parts) {
      var html = "";
      var text = "";
      
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        
        if (part.mimeType === 'text/html' && part.body && part.body.data) {
          html = decodeBase64Safe(part.body.data);
        } else if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          text = decodeBase64Safe(part.body.data);
        }
        
        // Recursively check nested parts
        if (part.parts && part.parts.length > 0) {
          var nested = extractBodyFromParts(part.parts);
          if (!html && nested.html) html = nested.html;
          if (!text && nested.text) text = nested.text;
        }
      }
      
      return {html: html, text: text};
    }
    
    if (payload.parts && payload.parts.length > 0) {
      // Multipart message
      var extracted = extractBodyFromParts(payload.parts);
      body = extracted.html;
      plainBody = extracted.text;
    } else if (payload.body && payload.body.data) {
      // Simple message
      var content = decodeBase64Safe(payload.body.data);
      if (payload.mimeType === 'text/html') {
        body = content;
        plainBody = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      } else {
        plainBody = content;
        body = content;
      }
    }
    
    // Create snippet from body
    var snippet = plainBody ? plainBody.substring(0, 200) + (plainBody.length > 200 ? '...' : '') : "";
    
    return {
      messageId: message.id,
      threadId: message.threadId,
      subject: subject || "(No Subject)",
      from: from || "",
      to: to || "",
      cc: cc || "",
      bcc: bcc || "",
      date: new Date(date) || new Date(),
      internalDate: message.internalDate ? parseInt(message.internalDate) : Date.now(),
      body: body || "",
      plainBody: plainBody || "",
      snippet: snippet,
      labels: message.labelIds || [],
      starred: message.labelIds && message.labelIds.includes('STARRED'),
      inInbox: message.labelIds && message.labelIds.includes('INBOX'),
      unread: message.labelIds && message.labelIds.includes('UNREAD'),
      hasAttachments: false,
      attachments: [],
      attachmentCount: 0,
      gmailLinkUrl: "https://mail.google.com/mail/u/0/#inbox/" + message.id,
      historyId: message.historyId || ""
    };
    
  } catch (error) {
    console.error("❌ Error extracting email data (advanced):", error.message);
    console.error("Error stack:", error.stack);
    return null;
  }
}

/**
 * Create a page in Notion database
 * @param {string} databaseId - Notion database ID
 * @param {string} apiKey - Notion API key
 * @param {Object} properties - Notion properties object
 * @returns {Object} Result object with success status
 */
function createNotionPage(databaseId, apiKey, properties) {
  console.log("=== CREATING NOTION PAGE ===");
  console.log("Database ID:", databaseId);
  console.log("Properties to set:", Object.keys(properties));
  
  try {
    var payload = {
      parent: { database_id: databaseId },
      properties: properties
    };
    
    console.log("Payload:", JSON.stringify(payload, null, 2));
    
    var options = {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch("https://api.notion.com/v1/pages", options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    console.log("Response Code:", statusCode);
    
    if (statusCode === 200) {
      var result = JSON.parse(responseText);
      console.log("✅ Notion page created successfully");
      console.log("Page ID:", result.id);
      console.log("Page URL:", result.url);
      
      return {
        success: true,
        id: result.id,
        url: result.url,
        created_time: result.created_time,
        last_edited_time: result.last_edited_time
      };
    } else {
      console.error("❌ Notion API error:", responseText);
      return {
        success: false,
        error: JSON.parse(responseText).message || "Unknown error",
        code: statusCode
      };
    }
    
  } catch (error) {
    console.error("❌ Exception creating Notion page:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get current Gmail message from UI context
 * @param {string} oauthToken - OAuth token
 * @returns {Object|null} Message object or null
 */
function getCurrentGmailMessage(oauthToken) {
  // Try to get current email from Gmail UI context
  try {
    // Method 1: Check if we can get selected messages
    var selectedMessages = GmailApp.getSelectedMessages();
    if (selectedMessages.length > 0) {
      var message = selectedMessages[0];
      return {
        messageId: message.getId(),
        subject: message.getSubject(),
        from: message.getFrom()
      };
    }
    
    // Method 2: Try to use Gmail advanced service (if enabled)
    if (typeof Gmail !== "undefined") {
      try {
        var gmailMessage = Gmail.Users.Messages.get("me", "current");
        if (gmailMessage) {
          return {
            messageId: gmailMessage.id,
            subject: gmailMessage.payload.headers.find(h => h.name === "Subject")?.value,
            from: gmailMessage.payload.headers.find(h => h.name === "From")?.value
          };
        }
      } catch (error) {
        console.log("Advanced Gmail service not available:", error.message);
      }
    }
    
    // Method 3: Use URL parameters (for Gmail add-on context)
    var cardParams = CardService.getActiveCard().getParameters();
    if (cardParams && cardParams.messageId) {
      return { messageId: cardParams.messageId };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting current Gmail message:", error);
    return null;
  }
}

/**
 * Test email processing functions
 * @returns {string} Test results
 */
function testEmailProcessing() {
  console.log("=== TESTING EMAIL PROCESSING ===");
  
  var tests = [
    {
      name: "Configuration check",
      test: () => {
        var config = getConfig();
        return !!(config.apiKey && config.databaseId);
      }
    },
    {
      name: "Mappings available",
      test: () => {
        var mappings = getMappings();
        return mappings && typeof mappings === "object";
      }
    },
    {
      name: "extractEmailData function",
      test: () => typeof extractEmailData === "function"
    },
    {
      name: "createNotionPage function",
      test: () => typeof createNotionPage === "function"
    },
    {
      name: "processEmailToNotion function",
      test: () => typeof processEmailToNotion === "function"
    }
  ];
  
  var passedCount = 0;
  var results = [];
  
  tests.forEach(test => {
    try {
      var passed = test.test();
      results.push({ test: test.name, passed: passed });
      if (passed) passedCount++;
    } catch (error) {
      results.push({
        test: test.name,
        passed: false,
        error: error.message
      });
    }
  });
  
  console.log("Test Results:", results);
  
  if (passedCount === tests.length) {
    console.log("✅ All email processing tests passed!");
    return "✅ Email Processing: READY";
  } else {
    console.log(`⚠️ ${passedCount}/${tests.length} tests passed`);
    return `⚠️ Email Processing: ${passedCount}/${tests.length} tests passed`;
  }
}

// Export functions for testing
if (typeof module !== "undefined") {
  module.exports = {
    processEmailToNotion: processEmailToNotion,
    extractEmailData: extractEmailData,
    createNotionPage: createNotionPage,
    processSelectedEmail: processSelectedEmail,
    processCurrentEmail: processCurrentEmail,
    testEmailProcessing: testEmailProcessing
  };
}