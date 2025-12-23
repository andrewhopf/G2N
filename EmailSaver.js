// ============================================/
// FILE: EmailSaver.js
// DESCRIPTION: Email saving functionality for Gmail to Notion integration
// ============================================

/**
 * Save email to Notion (main function)
 * @param {Object} event - Event object with Gmail data
 * @returns {Object} Result object with success status and message
 */
function saveEmailToNotion(event) {
  console.log("✅ saveEmailToNotion called", event?.gmail?.messageId);
  
  // Debug: Log what's in the event
  console.log("=== DEBUG EVENT ===");
  console.log("Event type:", typeof event);
  if (event && event.gmail) {
    console.log("Gmail keys:", Object.keys(event.gmail));
    console.log("Gmail.messageId:", event.gmail.messageId);
    console.log("Gmail.subject:", event.gmail.subject);
    console.log("Gmail.from:", event.gmail.from);
    console.log("Gmail.to:", event.gmail.to);
    console.log("Gmail.body preview:", event.gmail.body ? event.gmail.body.substring(0, 100) + "..." : "null");
    console.log("Gmail.snippet:", event.gmail.snippet);
  }
  
  try {
    var config = getConfig();
    var messageId = event?.gmail?.messageId;
    
    // Validate configuration
    if (!config.apiKey) throw new Error("API key not configured");
    if (!config.databaseId) throw new Error("Database not selected");
    if (!messageId) throw new Error("No email selected");
    
    console.log("Message ID from event:", messageId);
    
    var emailData = null;
    
    // ============================================
    // METHOD 1: Try the advanced Gmail API method (primary for add-ons)
    // WITH FIX: Always supplement with GmailApp for body content
    // ============================================
    try {
      console.log("Method 1: Trying advanced Gmail API...");
      emailData = extractEmailDataAdvanced(messageId);
      if (emailData) {
        console.log("✅ Advanced method succeeded");
        
        // CRITICAL FIX: Advanced method doesn't extract body content properly
        // Always use GmailApp for body content
        console.log("⚠️ Advanced method may not have body content, supplementing with GmailApp...");
        
        // Get body content from GmailApp
        var gmailAppData = null;
        try {
          // Find a GmailApp-compatible ID
          var gmailAppId = getGmailAppCompatibleId(messageId);
          
          if (gmailAppId) {
            gmailAppData = extractEmailData(gmailAppId);
            if (gmailAppData) {
              // Copy body content from GmailApp to the advanced data
              emailData.plainBody = gmailAppData.plainBody;
              emailData.body = gmailAppData.body;
              emailData.snippet = gmailAppData.snippet || emailData.snippet;
              
              console.log("✓ Added body content from GmailApp");
              console.log("  plainBody length:", emailData.plainBody?.length || 0);
              console.log("  body length:", emailData.body?.length || 0);
            }
          } else {
            console.log("⚠️ No GmailApp-compatible ID found for body content");
            
            // Try to extract body from advanced method's data if available
            if (emailData.snippet && emailData.snippet.length > 0) {
              console.log("Using snippet as fallback body content");
              emailData.plainBody = emailData.snippet;
            }
          }
        } catch (e) {
          console.warn("Could not get GmailApp data for body content:", e.message);
        }
      }
    } catch (error) {
      console.warn("Advanced method error:", error.message);
    }
    
    // ============================================
    // METHOD 2: If advanced method fails, try GmailApp with numeric ID
    // ============================================
    if (!emailData) {
      console.log("Method 2: Trying GmailApp fallback...");
      
      // Try to extract just the numeric ID for GmailApp
      var numericId = messageId;
      if (messageId.includes(':')) {
        numericId = messageId.split(':')[1];
      }
      
      console.log("Trying GmailApp with ID:", numericId);
      
      try {
        emailData = extractEmailData(numericId);
        if (emailData) {
          console.log("✅ GmailApp method succeeded");
          console.log("  plainBody length:", emailData.plainBody?.length || 0);
          console.log("  body length:", emailData.body?.length || 0);
        }
      } catch (error) {
        console.warn("GmailApp method error:", error.message);
      }
    }
    
    // ============================================
    // METHOD 3: Try to get selected messages
    // ============================================
    if (!emailData) {
      console.log("Method 3: Trying getSelectedMessages...");
      try {
        var selectedMessages = GmailApp.getSelectedMessages();
        if (selectedMessages && selectedMessages.length > 0) {
          var message = selectedMessages[0];
          emailData = extractEmailData(message.getId());
          if (emailData) {
            console.log("✅ getSelectedMessages succeeded");
            console.log("  plainBody length:", emailData.plainBody?.length || 0);
          }
        }
      } catch (error) {
        console.warn("getSelectedMessages error:", error.message);
      }
    }
    
    // ============================================
    // METHOD 4: Create data from event as last resort
    // ============================================
    if (!emailData && event?.gmail?.subject) {
      console.log("Method 4: Creating data from event...");
      emailData = {
        messageId: event.gmail.messageId || "event-" + Date.now(),
        subject: event.gmail.subject || "No Subject",
        from: event.gmail.from || "Unknown",
        to: event.gmail.to || "",
        date: new Date(),
        plainBody: event.gmail.body || event.gmail.snippet || "",
        snippet: event.gmail.snippet || "",
        body: event.gmail.body || "",
        threadId: "thread-" + Date.now(),
        internalDate: Date.now(),
        cc: "",
        bcc: "",
        replyTo: "",
        labels: [],
        starred: false,
        inInbox: true,
        unread: false,
        hasAttachments: false,
        attachments: [],
        attachmentCount: 0,
        gmailLinkUrl: "https://mail.google.com",
        historyId: ""
      };
      console.log("✅ Created email data from event");
    }
    
    if (!emailData) {
      throw new Error("Failed to extract email data from any method");
    }
    
    console.log("✅ Email data extracted successfully");
    console.log("Subject:", emailData.subject);
    console.log("From:", emailData.from);
    console.log("Date:", emailData.date);
    console.log("Body length:", emailData.body?.length || 0);
    console.log("PlainBody length:", emailData.plainBody?.length || 0);
    
    // Get mappings
    var mappings = getMappings();
    console.log("Mappings count:", mappings ? Object.keys(mappings).length : 0);
    
    // Build Notion page properties using property handlers
    var notionProperties = {};
    var pageChildren = [];
    
    // Process all mappings
    Object.entries(mappings).forEach(([propertyId, mapping]) => {
      try {
        // Skip if mapping is not enabled (except for required properties)
        if (mapping.enabled || mapping.isRequired) {
          if (mapping.isPageContent || mapping.type === "page_content") {
            // Handle page content separately
            var pageContentHandler = getPropertyHandler("page_content");
            if (pageContentHandler && pageContentHandler.processForNotion) {
              var contentBlocks = pageContentHandler.processForNotion(mapping, emailData);
              if (contentBlocks && contentBlocks.length > 0) {
                pageChildren.push(...contentBlocks);
                console.log(`Added ${contentBlocks.length} content blocks from page content`);
              }
            }
          } else {
            // Handle regular property mappings
            var handler = getPropertyHandler(mapping.type);
            if (handler && handler.processForNotion) {
              var propertyValue = handler.processForNotion(mapping, emailData, config.apiKey);
              if (propertyValue != null) {
                var targetPropertyId = mapping.propertyId || propertyId;
                notionProperties[targetPropertyId] = propertyValue;
                var propertyName = mapping.notionPropertyName || propertyId;
                console.log(`✓ Mapped ${propertyName} (${mapping.type})`);
              }
            } else {
              console.warn("No handler found for property type: " + mapping.type);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing mapping ${propertyId}:`, error);
        // Continue with other mappings even if one fails
      }
    });
    
    // Add email metadata as page children if no other content was added
    if (pageChildren.length === 0 && mappings.page_content?.enabled !== false) {
      var infoBlocks = createEmailInfoBlocks(emailData);
      pageChildren.push(...infoBlocks);
      console.log(`Added ${infoBlocks.length} info blocks`);
    }
    
    // Save to Notion API
    console.log("Saving to Notion...");
    console.log("Properties count:", Object.keys(notionProperties).length);
    console.log("Page children count:", pageChildren?.length || 0);
    
    if (Object.keys(notionProperties).length === 0) {
      console.warn("No properties generated! Creating minimal properties...");
      
      // Create minimal title property
      notionProperties = {
        "title": {
          "title": [{
            "type": "text",
            "text": {
              "content": emailData.subject || "Email from " + emailData.from
            }
          }]
        }
      };
    }
    
    var result = saveToNotionAPIWithChildren(
      config.apiKey,
      config.databaseId,
      notionProperties,
      pageChildren && pageChildren.length > 0 ? pageChildren : null
    );
    
    console.log("✅ Notion page created successfully!");
    console.log("Page ID:", result.id);
    console.log("Page URL:", result.url);
    
    // Return result object with success status
    return {
      success: true,
      message: "Email saved to Notion!",
      url: result.url,
      pageId: result.id,
      emailId: messageId
    };
    
  } catch (error) {
    console.error("Error saving email:", error);
    console.error("Error stack:", error.stack);
    return {
      success: false,
      message: "Failed to save: " + error.message
    };
  }
}
/**
 * Quick save email wrapper function WITH optional open button
 * @param {Object} event - Event object
 * @returns {CardService.ActionResponse} Action response
 */
function quickG2NSaveEmail(event) {
  console.log("quickG2NSaveEmail called - delegating to saveEmailToNotion");
  var result = saveEmailToNotion(event);
  
  if (result.success) {
    // Create a card with success message and optional open button
    var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle("✅ Email Saved"))
      .addSection(
        CardService.newCardSection()
          .addWidget(
            CardService.newTextParagraph().setText("Your email has been successfully saved to Notion.")
          )
          .addWidget(
            CardService.newButtonSet()
              .addButton(
                CardService.newTextButton()
                  .setText("📖 Open in Notion")
                  .setOpenLink(CardService.newOpenLink().setUrl(result.url))
              )
              .addButton(
                CardService.newTextButton()
                  .setText("OK")
                  .setOnClickAction(
                    CardService.newAction()
                      .setFunctionName("onG2NHomepage")
                  )
              )
          )
      )
      .build();
    
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card))
      .build();
  } else {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("❌ " + result.message)
      )
      .build();
  }
}
/**
 * Quick save email wrapper function
 * @param {Object} event - Event object
 * @returns {CardService.ActionResponse} Action response

function quickG2NSaveEmail(event) {
  console.log("quickG2NSaveEmail called - delegating to saveEmailToNotion");
  var result = saveEmailToNotion(event);
  
  if (result.success) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("✅ Email saved to Notion!")
      )
      .build();
  } else {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("❌ " + result.message)
      )
      .build();
  }
}
 */
/**
 * Save to Notion API with page children support
 * @param {string} apiKey - Notion API key
 * @param {string} databaseId - Notion database ID
 * @param {Object} properties - Notion properties object
 * @param {Array} children - Page children blocks (optional)
 * @returns {Object} Result object with page info
 * @throws {Error} If API request fails
 */
function saveToNotionAPIWithChildren(apiKey, databaseId, properties, children) {
  console.log("Calling Notion API...");
  
  var payload = {
    parent: { database_id: databaseId },
    properties: properties
  };
  
  // Add children if provided
  if (children && children.length > 0) {
    payload.children = children;
  }
  
  var options = {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch("https://api.notion.com/v1/pages", options);
  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();
  
  console.log("Notion API response: " + statusCode);
  
  if (statusCode === 200) {
    var result = JSON.parse(responseText);
    console.log("✅ Successfully created Notion page:", result.id);
    return {
      id: result.id,
      url: result.url,
      created_time: result.created_time
    };
  } else {
    console.error("Notion API error:", responseText);
    var errorMessage = "Failed to save to Notion";
    try {
      var errorObj = JSON.parse(responseText);
      errorMessage = errorObj.message || errorMessage;
    } catch (e) {
      // Keep default error message
    }
    throw new Error(errorMessage + ` (Status: ${statusCode})`);
  }
}

/**
 * Create basic email information blocks for the page content
 * @param {Object} emailData - Extracted email data
 * @returns {Array} Array of Notion block objects
 */
function createEmailInfoBlocks(emailData) {
  var blocks = [];
  
  // Add header
  blocks.push({
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [
        {
          type: "text",
          text: { content: "📧 Email Details" }
        }
      ]
    }
  });
  
  // Add from information
  if (emailData.from) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          { type: "text", text: { content: "**From:** " } },
          { type: "text", text: { content: emailData.from } }
        ]
      }
    });
  }
  
  // Add date
  if (emailData.date) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          { type: "text", text: { content: "**Date:** " } },
          { type: "text", text: { content: new Date(emailData.date).toLocaleString() } }
        ]
      }
    });
  }
  
  // Add to recipients
  if (emailData.to) {
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          { type: "text", text: { content: "**To:** " } },
          { type: "text", text: { content: emailData.to } }
        ]
      }
    });
  }
  
  // Add body content
  if (emailData.plainBody) {
    blocks.push({ object: "block", type: "divider", divider: {} });
    
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [
          {
            type: "text",
            text: { content: "📄 Email Body" }
          }
        ]
      }
    });
    
    // Split by paragraphs and limit to 10
    var paragraphs = emailData.plainBody.split("\n\n")
      .filter(p => p.trim().length > 0)
      .slice(0, 10);
    
    paragraphs.forEach(paragraph => {
      if (paragraph.trim().length > 0) {
        blocks.push({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: paragraph.substring(0, 2000) }
              }
            ]
          }
        });
      }
    });
  }
  
  return blocks;
}