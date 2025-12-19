// ============================================
// EMAIL SAVER FUNCTIONALITY
// ============================================

function saveEmailToNotion(e) {
  console.log("✅ saveEmailToNotion called", e?.gmail?.messageId);
  
  try {
    const config = getConfig();
    const messageId = e?.gmail?.messageId;
    
    // Validate configuration
    if (!config.apiKey) {
      throw new Error("API key not configured");
    }
    
    if (!config.databaseId) {
      throw new Error("Database not selected");
    }
    
    if (!messageId) {
      throw new Error("No email selected");
    }
    
    // Get email data using the comprehensive extractor
    const emailData = extractCompleteEmailData(messageId);
    if (!emailData) {
      throw new Error("Failed to extract email data");
    }
    
    console.log("Extracted email data:", {
      subject: emailData.subject?.substring(0, 50) + (emailData.subject?.length > 50 ? "..." : ""),
      from: emailData.from,
      date: emailData.date,
      attachments: emailData.attachmentCount || 0
    });
    
    // Get mappings
    const mappings = getMappings();
    
    // Build Notion page properties using property handlers
    const notionProperties = {};
    const pageChildren = [];
    
    // Process all mappings
    Object.entries(mappings).forEach(([mappingKey, mapping]) => {
      try {
        // Skip if mapping is not enabled (except for required properties)
        if (!mapping.enabled && !mapping.isRequired) {
          return;
        }
        
        // Handle page content separately
        if (mapping.isPageContent || mapping.type === 'page_content') {
          const handler = getPropertyHandler('page_content');
          if (handler && handler.processForNotion) {
            const contentBlocks = handler.processForNotion(mapping, emailData);
            if (contentBlocks && contentBlocks.length > 0) {
              pageChildren.push(...contentBlocks);
              console.log(`Added ${contentBlocks.length} content blocks from page content`);
            }
          }
          return;
        }
        
        // Get the appropriate handler for this property type
        const handler = getPropertyHandler(mapping.type);
        
        if (!handler || !handler.processForNotion) {
          console.warn(`No handler found for property type: ${mapping.type}`);
          return;
        }
        
        // Process the property value
        const propertyValue = handler.processForNotion(mapping, emailData, config.apiKey);
        
        if (propertyValue !== null && propertyValue !== undefined) {
          // Use the property ID from mapping if available, otherwise use mappingKey
          const propertyId = mapping.propertyId || mappingKey;
          notionProperties[propertyId] = propertyValue;
          
          // Log what we're saving
          const propertyName = mapping.notionPropertyName || mappingKey;
          console.log(`✓ Mapped ${propertyName} (${mapping.type})`);
        }
        
      } catch (error) {
        console.error(`Error processing mapping ${mappingKey}:`, error);
        // Continue with other mappings even if one fails
      }
    });
    
    // Add email metadata as page children if no other content was added
    if (pageChildren.length === 0 && mappings.page_content?.enabled !== false) {
      // Add basic email info as fallback
      const emailInfoBlocks = createEmailInfoBlocks(emailData);
      pageChildren.push(...emailInfoBlocks);
    }
    
    // Save to Notion API
    console.log("Saving to Notion...");
    console.log("Properties count:", Object.keys(notionProperties).length);
    console.log("Page children count:", pageChildren?.length || 0);
    
    const result = saveToNotionAPIWithChildren(
      config.apiKey,
      config.databaseId,
      notionProperties,
      pageChildren && pageChildren.length > 0 ? pageChildren : null
    );
    
    // Return success response
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("✅ Email saved to Notion!"))
      .setOpenLink(CardService.newOpenLink()
        .setUrl(result.url))
      .build();
    
  } catch (error) {
    console.error("Error saving email:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("❌ Failed to save: " + error.message))
      .build();
  }
}

// Helper functions that need to be included:

/**
 * Create basic email information blocks for the page content
 */
function createEmailInfoBlocks(emailData) {
  const blocks = [];
  
  // Add header
  blocks.push({
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{
        type: 'text',
        text: { content: '📧 Email Details' }
      }]
    }
  });
  
  // Add from information
  if (emailData.from) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '**From:** ' } },
          { type: 'text', text: { content: emailData.from } }
        ]
      }
    });
  }
  
  // Add date
  if (emailData.date) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '**Date:** ' } },
          { type: 'text', text: { content: new Date(emailData.date).toLocaleString() } }
        ]
      }
    });
  }
  
  // Add to recipients
  if (emailData.to) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: '**To:** ' } },
          { type: 'text', text: { content: emailData.to } }
        ]
      }
    });
  }
  
  // Add body content
  if (emailData.plainBody) {
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });
    
    blocks.push({
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{
          type: 'text',
          text: { content: '📄 Email Body' }
        }]
      }
    });
    
    // Split body into paragraphs and add them
    const bodyParagraphs = emailData.plainBody.split('\n\n').filter(p => p.trim().length > 0);
    bodyParagraphs.slice(0, 10).forEach(paragraph => { // Limit to 10 paragraphs
      if (paragraph.trim().length > 0) {
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: paragraph.substring(0, 2000) } // Limit text length
            }]
          }
        });
      }
    });
  }
  
  // Add Gmail link
  if (emailData.gmailLinkUrl) {
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });
    
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { 
            content: '🔗 Open in Gmail',
            link: { url: emailData.gmailLinkUrl }
          }
        }]
      }
    });
  }
  
  return blocks;
}

/**
 * Save to Notion API with page children support
 */
function saveToNotionAPIWithChildren(apiKey, databaseId, properties, children) {
  console.log("Calling Notion API...");
  
  const payload = {
    parent: { database_id: databaseId },
    properties: properties
  };
  
  // Add children if provided
  if (children && children.length > 0) {
    payload.children = children;
  }
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch('https://api.notion.com/v1/pages', options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  console.log(`Notion API response: ${responseCode}`);
  
  if (responseCode === 200) {
    const result = JSON.parse(responseText);
    console.log("✅ Successfully created Notion page:", result.id);
    return {
      id: result.id,
      url: result.url,
      created_time: result.created_time
    };
  } else {
    console.error("Notion API error:", responseText);
    
    let errorMessage = "Failed to save to Notion";
    try {
      const error = JSON.parse(responseText);
      errorMessage = error.message || errorMessage;
    } catch (e) {
      // Keep default error message
    }
    
    throw new Error(`${errorMessage} (Status: ${responseCode})`);
  }
}

