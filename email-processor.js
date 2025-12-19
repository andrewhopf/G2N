/* FILE: email-processor.js (new file) */
function processEmailToNotion(emailMessageId) {
  console.log("=== PROCESSING EMAIL TO NOTION ===");
  console.log("Email Message ID:", emailMessageId);
  
  const config = getConfig();
  if (!config.apiKey || !config.databaseId) {
    throw new Error("Configuration incomplete. Please set up API key and database.");
  }
  
  // Extract email data
  const emailData = extractEmailData(emailMessageId);
  if (!emailData) {
    throw new Error("Could not extract email data.");
  }
  
  // Get current mappings
  const mappings = getMappings();
  if (!mappings || Object.keys(mappings).length === 0) {
    throw new Error("No field mappings configured. Please set up mappings first.");
  }
  
  // Apply mappings to create Notion properties
  const notionProperties = applyMappings(emailData, mappings);
  
  // Create page in Notion
  const result = createNotionPage(config.databaseId, config.apiKey, notionProperties);
  
  if (result && result.success) {
    console.log("✅ Successfully created Notion page:", result.url);
    return {
      success: true,
      pageId: result.id,
      pageUrl: result.url,
      emailId: emailMessageId
    };
  } else {
    throw new Error(result?.error || "Failed to create Notion page");
  }
}

function extractEmailData(emailMessageId) {
  console.log("Extracting email data for:", emailMessageId);
  
  try {
    const message = GmailApp.getMessageById(emailMessageId);
    if (!message) {
      throw new Error("Email not found");
    }
    
    const thread = message.getThread();
    const body = message.getBody();
    const plainBody = message.getPlainBody();
    
    // Extract email addresses
    const from = message.getFrom();
    const to = message.getTo();
    const cc = message.getCc();
    const bcc = message.getBcc();
    const replyTo = message.getReplyTo();
    
    // Get attachments
    const attachments = message.getAttachments();
    
    // Build email data object
    const emailData = {
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
      gmailLinkUrl: `https://mail.google.com/mail/u/0/#inbox/${message.getId()}`,
      
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

function createNotionPage(databaseId, apiKey, properties) {
  console.log("=== CREATING NOTION PAGE ===");
  console.log("Database ID:", databaseId);
  console.log("Properties to set:", Object.keys(properties));
  
  try {
    const url = 'https://api.notion.com/v1/pages';
    
    const payload = {
      parent: { database_id: databaseId },
      properties: properties
    };
    
    console.log("Payload:", JSON.stringify(payload, null, 2));
    
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("Response Code:", responseCode);
    
    if (responseCode === 200) {
      const result = JSON.parse(responseText);
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
      const errorData = JSON.parse(responseText);
      return {
        success: false,
        error: errorData.message || "Unknown error",
        code: responseCode
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

function processSelectedEmail() {
  console.log("=== PROCESSING SELECTED EMAIL ===");
  
  try {
    const config = getConfig();
    if (!config.apiKey || !config.databaseId) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText("⚠️ Configuration incomplete. Please set up API key and database."))
        .setNavigation(CardService.newNavigation()
          .updateCard(buildConfigErrorCard()))
        .build();
    }
    
    // Get the active/selected email
    const selectedEmails = GmailApp.getSelectedMessages();
    if (selectedEmails.length === 0) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText("⚠️ No email selected. Please select an email first."))
        .build();
    }
    
    const email = selectedEmails[0];
    const emailMessageId = email.getId();
    
    // Process the email
    const result = processEmailToNotion(emailMessageId);
    
    if (result.success) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText(`✅ Email saved to Notion!`))
        .setNavigation(CardService.newNavigation()
          .updateCard(buildSuccessCard(result)))
        .build();
    } else {
      throw new Error(result.error || "Failed to process email");
    }
    
  } catch (error) {
    console.error("Error processing selected email:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`❌ Error: ${error.message}`))
      .build();
  }
}

function processCurrentEmail() {
  console.log("=== PROCESSING CURRENT EMAIL (FROM SIDEBAR) ===");
  
  try {
    // This function is called from the Gmail sidebar
    // The email context should be available
    const config = getConfig();
    if (!config.apiKey || !config.databaseId) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText("⚠️ Please configure API key and database first"))
        .setNavigation(CardService.newNavigation()
          .popCard()
          .pushCard(buildConfigErrorCard()))
        .build();
    }
    
    // Get the current email from Gmail context
    const accessToken = ScriptApp.getOAuthToken();
    const currentMessage = getCurrentGmailMessage(accessToken);
    
    if (!currentMessage || !currentMessage.messageId) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText("⚠️ Could not get current email. Please open an email first."))
        .build();
    }
    
    // Process the email
    const result = processEmailToNotion(currentMessage.messageId);
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`✅ Saved to Notion!`))
      .setNavigation(CardService.newNavigation()
        .popCard() // Go back to previous card
        .updateCard(buildHomepageCard()))
      .build();
    
  } catch (error) {
    console.error("Error processing current email:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`❌ Failed: ${error.message}`))
      .build();
  }
}

function getCurrentGmailMessage(accessToken) {
  // Try to get current email from Gmail UI context
  try {
    // Method 1: Check if we can get selected messages
    const selected = GmailApp.getSelectedMessages();
    if (selected.length > 0) {
      const message = selected[0];
      return {
        messageId: message.getId(),
        subject: message.getSubject(),
        from: message.getFrom()
      };
    }
    
    // Method 2: Try to use Gmail advanced service (if enabled)
    if (typeof Gmail !== 'undefined') {
      try {
        const currentMessage = Gmail.Users.Messages.get('me', 'current');
        if (currentMessage) {
          return {
            messageId: currentMessage.id,
            subject: currentMessage.payload.headers.find(h => h.name === 'Subject')?.value,
            from: currentMessage.payload.headers.find(h => h.name === 'From')?.value
          };
        }
      } catch (e) {
        console.log("Advanced Gmail service not available:", e.message);
      }
    }
    
    // Method 3: Use URL parameters (for Gmail add-on context)
    const parameters = CardService.getActiveCard().getParameters();
    if (parameters && parameters.messageId) {
      return {
        messageId: parameters.messageId
      };
    }
    
    return null;
    
  } catch (error) {
    console.error("Error getting current Gmail message:", error);
    return null;
  }
}

function buildSuccessCard(result) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("✅ Success!")
      .setSubtitle("Email saved to Notion"))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(`<b>Your email has been successfully saved to Notion!</b>`))
      .addWidget(CardService.newTextParagraph()
        .setText(`<b>Notion Page:</b> ${result.pageUrl || "Link not available"}`))
      .addWidget(CardService.newTextParagraph()
        .setText(`<b>Email ID:</b> ${result.emailId.substring(0, 20)}...`)))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("📖 Open in Notion")
          .setOpenLink(CardService.newOpenLink()
            .setUrl(result.pageUrl)))
        .addButton(CardService.newTextButton()
          .setText("📧 Open in Gmail")
          .setOpenLink(CardService.newOpenLink()
            .setUrl(`https://mail.google.com/mail/u/0/#inbox/${result.emailId}`)))
        .addButton(CardService.newTextButton()
          .setText("🏠 Home")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("onG2NHomepage")))))
    .build();
}

function testEmailProcessing() {
  console.log("=== TESTING EMAIL PROCESSING ===");
  
  const tests = [
    {
      name: "Configuration check",
      test: () => {
        const config = getConfig();
        return !!(config.apiKey && config.databaseId);
      }
    },
    {
      name: "Mappings available",
      test: () => {
        const mappings = getMappings();
        return mappings && typeof mappings === 'object';
      }
    },
    {
      name: "extractEmailData function",
      test: () => typeof extractEmailData === 'function'
    },
    {
      name: "createNotionPage function",
      test: () => typeof createNotionPage === 'function'
    },
    {
      name: "processEmailToNotion function",
      test: () => typeof processEmailToNotion === 'function'
    }
  ];
  
  let passed = 0;
  const results = [];
  
  tests.forEach(test => {
    try {
      const result = test.test();
      results.push({ test: test.name, passed: result });
      if (result) passed++;
    } catch (e) {
      results.push({ test: test.name, passed: false, error: e.message });
    }
  });
  
  console.log("Test Results:", results);
  
  if (passed === tests.length) {
    console.log("✅ All email processing tests passed!");
    return "✅ Email Processing: READY";
  } else {
    console.log(`⚠️ ${passed}/${tests.length} tests passed`);
    return `⚠️ Email Processing: ${passed}/${tests.length} tests passed`;
  }
}

// Export functions if needed (for testing)
if (typeof module !== 'undefined') {
  module.exports = {
    processEmailToNotion,
    extractEmailData,
    createNotionPage,
    processSelectedEmail,
    processCurrentEmail,
    testEmailProcessing
  };
}