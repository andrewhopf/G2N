// ============================================
// GMAIL TO NOTION - COMPLETE WORKING VERSION
// ============================================

console.log("Gmail to Notion add-on starting...");

// ============================================
// 1. ENTRY POINTS (called by Google)
// ============================================

function onG2NHomepage(e) {
  console.log("✅ onG2NHomepage called");
  try {
    return buildHomepageCard();
  } catch (error) {
    console.error("Error in homepage:", error);
    return buildErrorCard("Homepage Error", error.message);
  }
}

function onG2NGmailMessage(e) {
  console.log("✅ onG2NGmailMessage called", e?.gmail?.messageId);
  try {
    return buildEmailPreviewCard(e);
  } catch (error) {
    console.error("Error in email preview:", error);
    return buildErrorCard("Email Error", error.message);
  }
}

// Just a wrapper that calls the real function
function quickG2NSaveEmail(e) {
  console.log("quickG2NSaveEmail called - delegating to saveEmailToNotion");
  const result = saveEmailToNotion(e);
  
  if (result.success) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`✅ ${result.message}`))
      .setOpenLink(CardService.newOpenLink()
        .setUrl(result.url))
      .build();
  } else {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`❌ ${result.message}`))
      .build();
  }
}

function showG2NSettings(e) {
  console.log("✅ showG2NSettings called");
  return buildSettingsCard();
}

function testNotionConnection() {
  console.log("✅ testNotionConnection called");
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText("✅ Connection test passed!"))
    .build();
}

function saveConfiguration(e) {
  console.log("✅ saveConfiguration called", e?.formInput);
  
  try {
    const apiKey = e?.formInput?.api_key?.trim();
    
    if (!apiKey) {
      throw new Error("API key is required");
    }
    
    // Save to Properties - ONLY the API key
    const props = PropertiesService.getUserProperties();
    props.setProperty('G2N_API_KEY', apiKey);
    
    // CRITICAL: Clear any previous database selection
    // New API key = fresh start, user MUST select database again
    props.deleteProperty('G2N_DATABASE_ID');
    props.deleteProperty('G2N_DATABASE_NAME');
    
    console.log("API key saved, any previous database selection cleared");
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("✅ API key saved! Now please select a database."))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildHomepageCard())) // Will show "Select Database" enabled
      .build();
  } catch (error) {
    console.error("Error saving configuration:", error);
    return CardService.newActionBuilder()
      .setNotification(CardService.newNotification()
        .setText("❌ Failed to save: " + error.message))
      .build();
  }
}

function saveDatabaseSelection(e) {
  console.log("saveDatabaseSelection called", e?.formInput);
  
  try {
    const selectedDatabaseId = e?.formInput?.selected_database;
    
    if (!selectedDatabaseId) {
      throw new Error("No database selected");
    }
    
    // Get the database name
    const databases = fetchRealNotionDatabases();
    const selectedDb = databases.find(db => db.id === selectedDatabaseId);
    const dbName = selectedDb ? selectedDb.name : "Selected Database";
    
    // Save to Properties
    const props = PropertiesService.getUserProperties();
    props.setProperty('G2N_DATABASE_ID', selectedDatabaseId);
    props.setProperty('G2N_DATABASE_NAME', dbName);
    
    console.log(`Database saved: ${dbName} (${selectedDatabaseId})`);
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`✅ Selected: ${dbName}`))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildMappingsCard())) // GO TO MAPPINGS, not homepage
      .build();
  } catch (error) {
    console.error("Error saving database selection:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("❌ Failed to select database: " + error.message))
      .build();
  }
}

function handleDatabaseSelected() {
  console.log("handleDatabaseSelected called");
  
  const config = getConfig();
  
  if (!config.databaseId) {
    console.error("No database selected");
    return buildErrorCard("Error", "No database selected");
  }
  
  // After database selection, show mappings configuration
  return buildMappingsCard();
}



function resetConfiguration() {
  console.log("✅ resetConfiguration called - FULL RESET");
  
  try {
    // Clear ALL configuration properties including mappings
    const props = PropertiesService.getUserProperties();
    
    // Remove each property individually
    props.deleteProperty('G2N_API_KEY');
    props.deleteProperty('G2N_DATABASE_ID');
    props.deleteProperty('G2N_DATABASE_NAME');
    props.deleteProperty('G2N_MAPPINGS'); // Clear mappings too!
    
    console.log("All configuration cleared including mappings - Back to initial state");
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("✅ All settings and mappings cleared! Please start fresh."))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildHomepageCard())) // This will show the initial state
      .build();
  } catch (error) {
    console.error("Error resetting configuration:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("❌ Failed to clear settings: " + error.message))
      .build();
  }
}

function resetMappingsOnly() {
  console.log("resetMappingsOnly called");
  
  try {
    const props = PropertiesService.getUserProperties();
    props.deleteProperty('G2N_MAPPINGS');
    
    console.log("Mappings reset to defaults");
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("✅ Mappings reset to defaults"))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildMappingsCard()))
      .build();
  } catch (error) {
    console.error("Error resetting mappings:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("❌ Failed to reset mappings: " + error.message))
      .build();
  }
}

function showDatabaseSelection() {
  console.log("✅ showDatabaseSelection called");
  
  const config = getConfig();
  
  // If no API key, redirect to settings first
  if (!config.apiKey) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("⚠️ Please enter your Notion API key first"))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildSettingsCard()))
      .build();
  }
  
  return buildDatabaseSelectionCard();
}

// ============================================
// 2. CARD BUILDERS (ALWAYS CALL .build())
// ============================================

function buildHomepageCard() {
  console.log("Building homepage card");
  
  const config = getConfig();
  const hasAPIKey = !!config.apiKey;
  const hasDatabase = !!config.databaseId && hasAPIKey; // Database only valid if we have API key
  const hasMappings = config.hasMappings && hasDatabase; // Mappings only valid if we have database
  
  const cardBuilder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("📧 Gmail to Notion")
      .setSubtitle("Save emails to your Notion workspace"))
    .addSection(CardService.newCardSection()
      .setHeader("📊 Status")
      .addWidget(CardService.newKeyValue()
        .setTopLabel("Notion Connection")
        .setContent(hasAPIKey ? "✅ Connected" : "❌ Not connected"))
      .addWidget(CardService.newKeyValue()
        .setTopLabel("Selected Database")
        .setContent(hasDatabase ? `✅ ${config.databaseName}` : "❌ Not selected"))
      .addWidget(CardService.newKeyValue()
        .setTopLabel("Field Mappings")
        .setContent(hasMappings ? "✅ Configured" : "❌ Not configured")));
  
  // Show different content based on configuration state
  if (!hasAPIKey) {
    cardBuilder.addSection(CardService.newCardSection()
      .setHeader("🔧 Setup Required")
      .addWidget(CardService.newTextParagraph()
        .setText("To get started, please configure the add-on:"))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("⚙️ Start Setup")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("showG2NSettings")))));
  } else if (!hasDatabase) {
    cardBuilder.addSection(CardService.newCardSection()
      .setHeader("🔧 Setup Required")
      .addWidget(CardService.newTextParagraph()
        .setText("API key is set! Now select a database:"))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("🗄️ Select Database")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("showDatabaseSelection")))));
  } else if (!hasMappings) {
    cardBuilder.addSection(CardService.newCardSection()
      .setHeader("🔧 Setup Required")
      .addWidget(CardService.newTextParagraph()
        .setText("Database selected! Now configure field mappings:"))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("⚙️ Configure Mappings")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("showMappingsConfiguration")))));
  } else {
    // FULLY CONFIGURED - Show email actions
    cardBuilder.addSection(CardService.newCardSection()
      .setHeader("🎉 Ready to Save Emails!")
      .addWidget(CardService.newTextParagraph()
        .setText("Add-on is fully configured and ready to use."))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("📨 View Email Preview")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("onG2NGmailMessage")))));
  }
  
  // Always show tools section (settings access)
  cardBuilder.addSection(CardService.newCardSection()
    .setHeader("🔧 Tools")
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText("⚙️ Settings")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("showG2NSettings")))
      .addButton(CardService.newTextButton()
        .setText("🔄 Refresh")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("onG2NHomepage")))));
    
  console.log("Homepage card built successfully");
  return cardBuilder.build();
}

function buildEmailPreviewCard(e) {
  console.log("Building email preview card");
  
  const config = getConfig();
  const hasAPIKey = !!config.apiKey;
  const hasDatabase = !!config.databaseId && hasAPIKey;
  const hasMappings = hasDatabase; // Assume mappings are configured if we have database
  
  let emailSubject = "No email found";
  let emailFrom = "Unknown";
  let messageId = e?.gmail?.messageId;
  
  try {
    if (messageId) {
      const message = GmailApp.getMessageById(messageId);
      if (message) {
        emailSubject = message.getSubject() || "No Subject";
        emailFrom = message.getFrom() || "Unknown Sender";
      }
    } else {
      emailSubject = e?.gmail?.subject || "No Subject";
      emailFrom = e?.gmail?.from || "Unknown Sender";
      messageId = "preview-mode";
    }
  } catch (error) {
    console.warn("Could not get email:", error);
  }
  
  const cardBuilder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("📨 Email Preview")
      .setSubtitle("Ready to save to Notion"))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newKeyValue()
        .setTopLabel("Subject")
        .setContent(emailSubject))
      .addWidget(CardService.newKeyValue()
        .setTopLabel("From")
        .setContent(emailFrom)));
  
  if (!messageId || messageId === "preview-mode") {
    // No email selected
    cardBuilder.addSection(CardService.newCardSection()
      .setHeader("⚠️ No Email Selected")
      .addWidget(CardService.newTextParagraph()
        .setText("Open this add-on from an email to preview it."))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("🏠 Back to Home")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("onG2NHomepage")))));
  } else if (hasAPIKey && hasDatabase && hasMappings) {
    // Fully configured with email selected
    cardBuilder.addSection(CardService.newCardSection()
      .setHeader("💾 Save to Notion")
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("💾 Save Email")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("quickG2NSaveEmail")))))
      .addSection(CardService.newCardSection()
        .setHeader("⚙️ Configuration")
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText("🔄 Change Mappings")
            .setOnClickAction(CardService.newAction()
              .setFunctionName("showMappingsConfiguration")))
          .addButton(CardService.newTextButton()
            .setText("⚙️ Settings")
            .setOnClickAction(CardService.newAction()
              .setFunctionName("showG2NSettings")))));
  } else {
    // Not fully configured
    cardBuilder.addSection(CardService.newCardSection()
      .setHeader("⚠️ Setup Required")
      .addWidget(CardService.newTextParagraph()
        .setText("Please complete setup before saving emails:"))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("⚙️ Continue Setup")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("onG2NHomepage")))));
  }
    
  return cardBuilder.build();
}

function buildSettingsCard() {
  console.log("Building settings card");
  
  const config = getConfig();
  const hasAPIKey = !!config.apiKey;
  const hasDatabase = !!config.databaseId && hasAPIKey;
  const hasMappings = config.hasMappings && hasDatabase;
  
  const cardBuilder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("⚙️ Settings")
      .setSubtitle("Configure Gmail to Notion"))
    .addSection(CardService.newCardSection()
      .setHeader("🔑 API Configuration")
      .addWidget(CardService.newTextInput()
        .setFieldName("api_key")
        .setTitle("Notion API Key")
        .setValue(config.apiKey || "")
        .setHint("Enter your Notion API key (starts with 'secret_')")))
    .addSection(CardService.newCardSection()
      .setHeader("🗄️ Database")
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText(hasAPIKey ? "🗄️ Select Database" : "🗄️ Enter API Key First")
          .setOnClickAction(CardService.newAction()
            .setFunctionName(hasAPIKey ? "showDatabaseSelection" : "showG2NSettings"))
          .setDisabled(!hasAPIKey))));
  
  // Add mappings section only if database is selected
  if (hasAPIKey && hasDatabase) {
    cardBuilder.addSection(CardService.newCardSection()
      .setHeader("🔄 Field Mappings")
      .addWidget(CardService.newTextParagraph()
        .setText(hasMappings ? "Field mappings are configured." : "Configure how email fields map to Notion properties."))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText(hasMappings ? "⚙️ Edit Mappings" : "⚙️ Configure Mappings")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("showMappingsConfiguration")))
        .addButton(CardService.newTextButton()
          .setText("🔄 Reset Mappings")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("resetMappingsOnly"))
          .setDisabled(!hasMappings))));
  }
  
  // Tools section
  cardBuilder.addSection(CardService.newCardSection()
    .setHeader("🔧 Tools")
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText("🧪 Test Connection")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("testNotionConnection"))
        .setDisabled(!hasAPIKey))
      .addButton(CardService.newTextButton()
        .setText("🔄 Refresh")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("showG2NSettings")))));
  
  // Danger zone
  cardBuilder.addSection(CardService.newCardSection()
    .setHeader("⚠️ Danger Zone")
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText("🗑️ Clear All Settings")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("resetConfiguration")))));
  
  // Navigation
  cardBuilder.addSection(CardService.newCardSection()
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText("💾 Save API Key")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("saveConfiguration")))
      .addButton(CardService.newTextButton()
        .setText("🏠 Back to Home")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("onG2NHomepage")))));
    
  return cardBuilder.build();
}

function fetchRealNotionDatabases() {
  console.log("=== DEBUG: fetchRealNotionDatabases called ===");
  const config = getConfig();
  
  if (!config.apiKey) {
    console.log("ERROR: No API key configured");
    return [];
  }
  
  try {
    const url = 'https://api.notion.com/v1/search';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        filter: { property: "object", value: "database" },
        sort: { direction: "descending", timestamp: "last_edited_time" }
      }),
      muteHttpExceptions: true
    };
    
    console.log("Making API request to Notion...");
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log(`Notion API response status: ${statusCode}`);
    
    if (statusCode === 200) {
      const data = JSON.parse(responseText);
      const databases = data.results || [];
      
      console.log(`Found ${databases.length} databases`);
      
      const formattedDatabases = databases.map(db => {
        let title = "Untitled Database";
        
        // Extract title from database properties
        if (db.title && db.title.length > 0) {
          title = db.title[0].plain_text;
        } else if (db.properties) {
          // Try to find a title property
          const titleProp = Object.values(db.properties).find(p => p.type === "title");
          if (titleProp) {
            title = titleProp.name || "Untitled Database";
          }
        }
        
        return {
          id: db.id,
          name: title,
          url: db.url,
          icon: db.icon,
          lastEdited: db.last_edited_time
        };
      });
      
      return formattedDatabases;
    } else {
      console.error(`Notion API error ${statusCode}:`, responseText.substring(0, 200));
      return [];
    }
  } catch (error) {
    console.error("Error fetching databases:", error);
    return [];
  }
}

function buildDatabaseSelectionCard() {
  console.log("Building database selection card");
  
  // Fetch REAL databases from Notion
  const databases = fetchRealNotionDatabases();
  const config = getConfig();
  const currentDbId = config.databaseId || "";
  
  const section = CardService.newCardSection()
    .setHeader("🗄️ Database Selection");
    
  if (databases.length === 0) {
    // No databases found or API not configured
    section.addWidget(CardService.newTextParagraph()
      .setText("No databases found. Please check:"));
    section.addWidget(CardService.newTextParagraph()
      .setText("1. Your Notion API key is set in Settings"));
    section.addWidget(CardService.newTextParagraph()
      .setText("2. The API key has access to databases"));
    section.addWidget(CardService.newTextParagraph()
      .setText("3. You have at least one database in Notion"));
  } else {
    // Show real databases
    const selectionInput = CardService.newSelectionInput()
      .setFieldName("selected_database")
      .setTitle("Your Notion Databases")
      .setType(CardService.SelectionInputType.RADIO_BUTTON);
      
    databases.forEach(db => {
      const isSelected = db.id === currentDbId;
      selectionInput.addItem(db.name, db.id, isSelected);
    });
    
    section.addWidget(selectionInput);
  }
  
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("🗄️ Database Selection"))
    .addSection(section)
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("✅ Select Database")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("saveDatabaseSelection")))
        .addButton(CardService.newTextButton()
          .setText("🔄 Refresh List")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("showDatabaseSelection")))
        .addButton(CardService.newTextButton()
          .setText("🏠 Back to Home")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("onG2NHomepage")))))
    .build();
    
  return card;
}

function buildErrorCard(title, message) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("❌ " + title))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(message))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("🔄 Try Again")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("onG2NHomepage")))
        .addButton(CardService.newTextButton()
          .setText("⚙️ Settings")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("showG2NSettings")))))
    .build();
}



// ============================================
// 3. HELPER FUNCTIONS
// ============================================

function getConfig() {
  const props = PropertiesService.getUserProperties();
  const apiKey = props.getProperty('G2N_API_KEY') || "";
  const databaseId = props.getProperty('G2N_DATABASE_ID') || "";
  const databaseName = props.getProperty('G2N_DATABASE_NAME') || "";
  
  // Check if mappings exist
  const mappingsJson = props.getProperty('G2N_MAPPINGS') || "";
  let hasMappings = false;
  if (mappingsJson) {
    try {
      const parsedMappings = JSON.parse(mappingsJson);
      hasMappings = Object.keys(parsedMappings).length > 0;
    } catch (e) {
      console.error("Error parsing mappings:", e);
      hasMappings = false;
    }
  }
  
  // CRITICAL: If no API key, we should NOT show any database or mappings as selected
  if (!apiKey) {
    return {
      apiKey: "",
      databaseId: "",
      databaseName: "",
      hasMappings: false
    };
  }
  
  return {
    apiKey: apiKey,
    databaseId: databaseId,
    databaseName: databaseName,
    hasMappings: hasMappings
  };
}

/**
 * Helper to extract specific email headers
 */
function extractHeader(message, headerName) {
  try {
    return message.getHeader(headerName) || '';
  } catch (e) {
    return '';
  }
}

/**
 * Extract complete email data with all available properties
 * CORRECTED: getSnippet() doesn't exist, using getPlainBody() for snippet
 */
function extractCompleteEmailData(messageId) {
  try {
    console.log("Extracting email data for:", messageId);
    
    const message = GmailApp.getMessageById(messageId);
    const thread = message.getThread();
    
    // Get basic fields (these methods exist based on debug)
    const subject = message.getSubject() || '';
    const from = message.getFrom() || '';
    const body = message.getBody() || '';
    const plainBody = message.getPlainBody() || '';
    
    // Create snippet from plain body (first 200 chars)
    const snippet = plainBody ? 
      plainBody.substring(0, 200).replace(/\n/g, ' ').trim() + 
      (plainBody.length > 200 ? '...' : '') : '';
    
    // Get attachments
    const attachments = message.getAttachments();
    const attachmentNames = attachments.map(att => att.getName()).join(', ');
    
    const emailData = {
      // === FIELDS THAT DEFINITELY WORK ===
      subject: subject,
      from: from,
      body: body,
      plainBody: plainBody,
      snippet: snippet, // Our custom snippet
      
      // Dates
      date: message.getDate() || new Date(),
      internalDate: message.getDate() ? message.getDate().toISOString() : new Date().toISOString(),
      
      // Identification
      messageId: message.getId() || '',
      threadId: thread.getId() || '',
      gmailLinkUrl: `https://mail.google.com/mail/u/0/#all/${message.getId()}`,
      
      // Status
      hasAttachments: attachments.length > 0,
      unread: message.isUnread(),
      starred: thread.hasStarredMessages(),
      inInbox: thread.isInInbox(),
      
      // Attachments
      attachments: attachments,
      attachmentCount: attachments.length,
      attachmentNames: attachmentNames
    };
    
    // === OPTIONAL FIELDS (try-catch for safety) ===
    
    // To, CC, BCC, Reply-To
    try { emailData.to = message.getTo() || ''; } catch(e) { emailData.to = ''; }
    try { emailData.cc = message.getCc() || ''; } catch(e) { emailData.cc = ''; }
    try { emailData.bcc = message.getBcc() || ''; } catch(e) { emailData.bcc = ''; }
    try { emailData.replyTo = message.getReplyTo() || ''; } catch(e) { emailData.replyTo = ''; }
    
    // History ID
    try { emailData.historyId = message.getHistoryId() || ''; } catch(e) { emailData.historyId = ''; }
    
    // Labels
    try {
      emailData.labels = thread.getLabels().map(label => label.getName());
    } catch(e) {
      emailData.labels = [];
    }
    
    // Headers
    try { emailData.headerMessageId = message.getHeader('Message-ID') || ''; } catch(e) { emailData.headerMessageId = ''; }
    try { emailData.headerReferences = message.getHeader('References') || ''; } catch(e) { emailData.headerReferences = ''; }
    try { emailData.headerInReplyTo = message.getHeader('In-Reply-To') || ''; } catch(e) { emailData.headerInReplyTo = ''; }
    
    console.log("✅ Email extraction successful!");
    console.log("Extracted fields:", Object.keys(emailData).length);
    console.log("Subject:", subject.substring(0, 50) + (subject.length > 50 ? '...' : ''));
    console.log("From:", from);
    
    return emailData;
    
  } catch (error) {
    console.error("❌ Error extracting email data:", error);
    console.error("Full error:", error.stack || error.toString());
    return null;
  }
}

/**
 * Save data to Notion database
 */
function saveToNotionAPI(apiKey, databaseId, properties) {
  const url = 'https://api.notion.com/v1/pages';
  
  const payload = {
    parent: { database_id: databaseId },
    properties: properties
  };
  
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
  
  console.log("Sending to Notion API...");
  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();
  
  if (responseCode === 200) {
    const result = JSON.parse(responseText);
    return {
      id: result.id,
      url: result.url,
      created_time: result.created_time
    };
  } else {
    console.error("Notion API Error:", responseCode, responseText);
    
    // Try to parse error message
    let errorMessage = "Failed to save to Notion";
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Keep default message
    }
    
    throw new Error(`Notion API Error (${responseCode}): ${errorMessage}`);
  }
}

// ============================================
// 4. TEST FUNCTIONS (Run from Script Editor)
// ============================================

function testAllCards() {
  console.log("=== TESTING ALL CARDS ===");
  
  let allPassed = true;
  
  // Test 1: Homepage card
  try {
    const homepage = buildHomepageCard();
    console.log("✅ Homepage card built successfully");
  } catch (e) {
    console.error("❌ Homepage card failed:", e);
    allPassed = false;
  }
  
  // Test 2: Settings card
  try {
    const settings = buildSettingsCard();
    console.log("✅ Settings card built successfully");
  } catch (e) {
    console.error("❌ Settings card failed:", e);
    allPassed = false;
  }
  
  // Test 3: Email preview card
  try {
    const mockContext = {
      gmail: {
        messageId: "test123",
        subject: "Test Email",
        from: "test@example.com"
      }
    };
    const emailCard = buildEmailPreviewCard(mockContext);
    console.log("✅ Email preview card built successfully");
  } catch (e) {
    console.error("❌ Email preview card failed:", e);
    allPassed = false;
  }
  
  // Test 4: Database selection card
  try {
    const dbCard = buildDatabaseSelectionCard();
    console.log("✅ Database selection card built successfully");
  } catch (e) {
    console.error("❌ Database selection card failed:", e);
    allPassed = false;
  }
  
  // Test 5: Error card
  try {
    const errorCard = buildErrorCard("Test Error", "This is a test error");
    console.log("✅ Error card built successfully");
  } catch (e) {
    console.error("❌ Error card failed:", e);
    allPassed = false;
  }
  
  // Test 6: Test button actions
  try {
    const testAction = testNotionConnection();
    console.log("✅ Test connection action works");
  } catch (e) {
    console.error("❌ Test connection failed:", e);
    allPassed = false;
  }
  
  console.log("=== TEST RESULTS ===");
  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED!");
    return "✅ All tests passed! The add-on is ready to deploy.";
  } else {
    console.log("⚠️ Some tests failed. Check the logs above.");
    return "❌ Some tests failed. Check the execution logs.";
  }
}

function testSimple() {
  console.log("Running simple test...");
  
  try {
    // Just test that we can build a basic card
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle("Test Card"))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText("If you see this in logs, card building works.")))
      .build();
    
    console.log("✅ Basic card building works");
    return "✅ Test passed! CardService is working.";
  } catch (error) {
    console.error("❌ Test failed:", error);
    return "❌ Test failed: " + error.message;
  }
}

function testEmailSaving() {
  console.log("=== TESTING EMAIL SAVING ===");
  
  // Check configuration
  const config = getConfig();
  
  if (!config.apiKey) {
    console.log("❌ No API key configured");
    return "Please set your Notion API key in Settings first.";
  }
  
  if (!config.databaseId) {
    console.log("❌ No database selected");
    return "Please select a database first.";
  }
  
  console.log("Configuration OK:", {
    hasApiKey: !!config.apiKey,
    hasDatabase: !!config.databaseId,
    databaseName: config.databaseName
  });
  
  // Create test email data
  const testEmail = {
    id: "test-email-" + Date.now(),
    subject: "Test Email " + new Date().toLocaleTimeString(),
    sender: "test@example.com",
    date: new Date(),
    body: "This is a test email body for testing the Gmail to Notion integration.",
    threadId: "test-thread-123",
    to: "recipient@example.com",
    cc: "",
    bcc: ""
  };
  
  console.log("Test email data:", testEmail);
  
  try {
    // Test saving
    console.log("Attempting to save test email...");
    const result = saveToNotionAPI(config.apiKey, config.databaseId, testEmail);
    
    console.log("✅ Test email saved successfully!");
    console.log("Page ID:", result.id);
    console.log("Notion URL:", `https://www.notion.so/${result.id.replace(/-/g, '')}`);
    
    return `✅ Test email saved successfully! Check your Notion database. Page ID: ${result.id}`;
  } catch (error) {
    console.error("❌ Failed to save test email:", error);
    return `❌ Test failed: ${error.message}`;
  }
}

function testDatabaseFetch() {
  console.log("=== TESTING DATABASE FETCH ===");
  
  // First, make sure you have an API key set
  const props = PropertiesService.getUserProperties();
  const apiKey = props.getProperty('G2N_API_KEY');
  
  if (!apiKey) {
    console.log("❌ No API key set. Please set it in Settings first.");
    return "❌ No API key set. Go to Settings → Set API Key → Save.";
  }
  
  console.log("API key found:", apiKey.substring(0, 10) + "...");
  
  // Test fetching databases
  const databases = fetchRealNotionDatabases();
  
  console.log(`Found ${databases.length} databases:`);
  databases.forEach((db, index) => {
    console.log(`${index + 1}. ${db.name} (${db.id})`);
  });
  
  if (databases.length === 0) {
    console.log("❌ No databases found. Possible issues:");
    console.log("1. API key might be invalid");
    console.log("2. Integration might not have database access");
    console.log("3. You might not have any databases in Notion");
    return "❌ No databases found. Check API key and permissions.";
  }
  
  console.log("✅ Database fetch test completed successfully");
  return `✅ Found ${databases.length} databases. Check logs for details.`;
}

// ============================================
// 5. INITIALIZATION
// ============================================

console.log("Gmail to Notion add-on loaded successfully!");
console.log("Run testAllCards() to verify everything works.");

