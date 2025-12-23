// ============================================
// FILE: EmailSaver.js
// DESCRIPTION: Email saving functionality for Gmail to Notion integration
// ============================================

/**
 * Save email to Notion (main function)
 * @param {Object} event - Event object with Gmail data
 * @returns {CardService.ActionResponseBuilder} Action response
 */
function saveEmailToNotion(event) {
  console.log("✅ saveEmailToNotion called", event?.gmail?.messageId);
  
  try {
    var config = getConfig();
    var messageId = event?.gmail?.messageId;
    
    // Validate configuration
    if (!config.apiKey) throw new Error("API key not configured");
    if (!config.databaseId) throw new Error("Database not selected");
    if (!messageId) throw new Error("No email selected");
    
    // Get email data using the comprehensive extractor
    var emailData = extractCompleteEmailData(messageId);
    if (!emailData) throw new Error("Failed to extract email data");
    
    console.log("Extracted email data:", {
      subject: emailData.subject?.substring(0, 50) + (emailData.subject?.length > 50 ? "..." : ""),
      from: emailData.from,
      date: emailData.date,
      attachments: emailData.attachmentCount || 0
    });
    
    // Get mappings
    var mappings = getMappings();
    
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
    }
    
    // Save to Notion API
    console.log("Saving to Notion...");
    console.log("Properties count:", Object.keys(notionProperties).length);
    console.log("Page children count:", pageChildren?.length || 0);
    
    var result = saveToNotionAPIWithChildren(
      config.apiKey,
      config.databaseId,
      notionProperties,
      pageChildren && pageChildren.length > 0 ? pageChildren : null
    );
    
    // Return success response
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("✅ Email saved to Notion!")
      )
      .setOpenLink(
        CardService.newOpenLink()
          .setUrl(result.url)
      )
      .build();
    
  } catch (error) {
    console.error("Error saving email:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("❌ Failed to save: " + error.message)
      )
      .build();
  }
}

/**
 * Quick save email wrapper function
 * @param {Object} event - Event object
 * @returns {CardService.ActionResponse} Action response
 */
function quickG2NSaveEmail(event) {
  console.log("quickG2NSaveEmail called - delegating to saveEmailToNotion");
  var result = saveEmailToNotion(event);
  
  if (result.success) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("✅ " + result.message)
      )
      .setOpenLink(
        CardService.newOpenLink()
          .setUrl(result.url)
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