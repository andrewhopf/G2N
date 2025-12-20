// ============================================
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
 * Extract email data from Gmail message
 * @param {string} emailId - Gmail message ID
 * @returns {Object|null} Extracted email data or null on error
 */
function extractEmailData(emailId) {
  console.log("Extracting email data for:", emailId);
  
  try {
    var message = GmailApp.getMessageById(emailId);
    if (!message) {
      throw new Error("Email not found");
    }
    
    var thread = message.getThread();
    var body = message.getBody();
    var plainBody = message.getPlainBody();
    var from = message.getFrom();
    var to = message.getTo();
    var cc = message.getCc();
    var bcc = message.getBcc();
    var replyTo = message.getReplyTo();
    var attachments = message.getAttachments();
    
    var emailData = {
      // Basic info
      messageId: message.getId(),
      threadId: thread.getId(),
      subject: message.getSubject(),
      date: message.getDate(),
      internalDate: message.getDate().getTime(),
      
      // Sender/Recipient info
      from: from,
      to: to,
      cc: cc,
      bcc: bcc,
      replyTo: replyTo,
      
      // Content
      body: body,
      plainBody: plainBody,
      snippet: message.getSnippet(),
      
      // Status
      labels: message.getLabels().map(label => label.getName()),
      starred: message.isStarred(),
      inInbox: message.isInInbox(),
      unread: message.isUnread(),
      hasAttachments: attachments.length > 0,
      
      // Attachments
      attachments: attachments,
      attachmentCount: attachments.length,
      
      // Gmail specific URLs
      gmailLinkUrl: "https://mail.google.com/mail/u/0/#inbox/" + message.getId(),
      
      // History (for sync)
      historyId: thread.getLastMessageHistoryId()
    };
    
    console.log("✅ Email data extracted successfully");
    console.log("Subject:", emailData.subject);
    console.log("From:", emailData.from);
    console.log("Attachment count:", emailData.attachmentCount);
    
    return emailData;
    
  } catch (error) {
    console.error("❌ Error extracting email data:", error);
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