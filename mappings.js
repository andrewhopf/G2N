/**
 * Field mappings for Gmail to Notion integration
 * CORRECTED VERSION with proper property filtering and relation support
 */

// ============================================
// MANDATORY: Core Functions
// ============================================

/**
 * Get saved mappings from user properties
 */
function getMappings() {
  var mappingsJson = PropertiesService.getUserProperties().getProperty("G2N_MAPPINGS") || "";
  if (mappingsJson) {
    try {
      return JSON.parse(mappingsJson);
    } catch (e) {
      console.error("Error parsing mappings:", e);
      // Return minimal default if parsing fails
      return {
        title: {
          notionPropertyName: "Name",
          type: "title",
          enabled: true,
          emailField: "subject",
          transformation: "none"
        }
      };
    }
  }
  // If no saved mappings, return empty object
  return {};
}

/**
 * Show mappings configuration card
 */
function showMappingsConfiguration() {
  try {
    return buildMappingsCard();
  } catch (e) {
    console.error("Error building mappings card:", e);
    return buildSchemaErrorCard(e.message);
  }
}

saveMappingsConfiguration

// ============================================
// MANDATORY: Card Builder Function
// ============================================

/**
 * Build the main mappings configuration card
 */
function buildMappingsCard() {
  var config = getConfig();
  
  if (!config.apiKey || !config.databaseId) {
    return buildConfigErrorCard();
  }
  
  var schemaResult = fetchNotionDatabaseSchema(config.databaseId, config.apiKey);
  if (!schemaResult || !schemaResult.success) {
    return buildSchemaErrorCard(schemaResult?.error || "Could not fetch database.");
  }
  
  var database = schemaResult.database;
  var savedMappings = getMappings();
  
  var cardBuilder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("📋 Map Email → Notion")
      .setSubtitle("Database: " + database.title));
  
  // Database info section
  cardBuilder.addSection(buildDatabaseInfoSection(database));
  
  // QUICK SETUP SECTION
  cardBuilder.addSection(CardService.newCardSection()
    .setHeader("⚡ Quick Setup")
    .addWidget(CardService.newTextParagraph()
      .setText("Quickly enable common email fields:"))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText("Enable Common Fields")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("enableCommonFields"))))
    .addWidget(CardService.newTextParagraph()
      .setText("<font color='#5F6368'><i>Enables: Email subject → Title, Sender → Email field, Body → Content, Gmail link → URL</i></font>")));
  
  // Quick tip section
  cardBuilder.addSection(CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText("<b>💡 Quick Tip:</b> Use '⚡ Quick Setup' to automatically enable:"))
    .addWidget(CardService.newTextParagraph()
      .setText("• Email subject → Task title"))
    .addWidget(CardService.newTextParagraph()
      .setText("• Sender email → Sender Email field"))
    .addWidget(CardService.newTextParagraph()
      .setText("• Email body → Email Body field"))
    .addWidget(CardService.newTextParagraph()
      .setText("• Gmail link → Gmail link field")));
  
  // Property mapping section (WITH CORRECT FILTERING)
  var mappableProperties = database.properties.filter(prop => 
    isPropertyMappable(prop.type)
  );
  
  // Sort properties: title first, then others alphabetically
  mappableProperties.sort((a, b) => {
    if (a.isTitle) return -1;
    if (b.isTitle) return 1;
    if (a.isRequired && !b.isRequired) return -1;
    if (!a.isRequired && b.isRequired) return 1;
    return a.name.localeCompare(b.name);
  });
  
  cardBuilder.addSection(buildPropertyMappingSection(mappableProperties, savedMappings));
  
  // Action section
  cardBuilder.addSection(buildActionSection());
  
  return cardBuilder.build();
}

// ============================================
// QUICK SETUP FUNCTION
// ============================================

/**
 * Enable common/useful fields for quick setup
 */
function enableCommonFields() {
  console.log("=== ENABLING COMMON FIELDS ===");
  
  try {
    var userProps = PropertiesService.getUserProperties();
    var mappingsJson = userProps.getProperty("G2N_MAPPINGS");
    
    if (!mappingsJson) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText("⚠️ Please configure mappings first"))
        .build();
    }
    
    var mappings = JSON.parse(mappingsJson);
    let enabledCount = 0;
    
    console.log("Processing", Object.keys(mappings).length, "mappings...");
    
    // Enable common fields
    Object.values(mappings).forEach(mapping => {
      var propertyName = mapping.notionPropertyName.toLowerCase();
      var propertyType = mapping.type;
      
      // Check if this is a common field type
      var isCommonField = (
        // Title field (usually the main task/email title)
        propertyType === "title" ||
        // Sender/From fields
        propertyName.includes("sender") || 
        propertyName.includes("from") ||
        // Email address fields
        propertyType === "email" || 
        propertyName.includes("email") ||
        // Content/body fields
        propertyName.includes("body") || 
        propertyName.includes("content") ||
        // Link/URL fields (especially Gmail links)
        propertyName.includes("link") || 
        propertyName.includes("url") || 
        propertyName.includes("gmail") ||
        // Date fields
        propertyName.includes("date") || 
        propertyType === "date"
      );
      
      if (isCommonField && !mapping.enabled && !mapping.isStaticOption) {
        // Only enable if it's NOT a static value property
        mapping.enabled = true;
        enabledCount++;
        
        // Set appropriate defaults based on field type
        switch (propertyType) {
          case "title":
            mapping.emailField = mapping.emailField || "subject";
            mapping.transformation = mapping.transformation || "none";
            console.log("✓ Enabled title: " + mapping.notionPropertyName);
            break;
            
          case "email":
            mapping.emailField = mapping.emailField || "from";
            mapping.transformation = mapping.transformation || "extract_email";
            console.log("✓ Enabled email: " + mapping.notionPropertyName);
            break;
            
          case "rich_text":
            if (propertyName.includes("body") || propertyName.includes("content")) {
              mapping.emailField = mapping.emailField || "plainBody";
              mapping.transformation = mapping.transformation || "html_to_text";
              console.log("✓ Enabled content: " + mapping.notionPropertyName);
            }
            break;
            
          case "url":
            if (propertyName.includes("gmail") || propertyName.includes("link")) {
              mapping.emailField = mapping.emailField || "gmailLinkUrl";
              mapping.transformation = mapping.transformation || "none";
              console.log("✓ Enabled link: " + mapping.notionPropertyName);
            }
            break;
            
          case "date":
            mapping.emailField = mapping.emailField || "date";
            mapping.transformation = mapping.transformation || "parse_date";
            console.log("✓ Enabled date: " + mapping.notionPropertyName);
            break;
        }
      }
    });
    
    // Save updated mappings
    userProps.setProperty("G2N_MAPPINGS", JSON.stringify(mappings));
    console.log(`✅ Enabled ${enabledCount} common fields`);
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`✅ Enabled ${enabledCount} common fields`))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildMappingsCard()))
      .build();
    
  } catch (e) {
    console.error("Error enabling common fields:", e);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("❌ Failed to enable common fields: " + e.message))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildMappingsCard()))
      .build();
  }
}

// ============================================
// UI BUILDING FUNCTIONS (CORRECTED)
// ============================================

/**
 * Build database info section
 */
function buildDatabaseInfoSection(database) {
  var mappableProps = database.properties.filter(prop => 
    isPropertyMappable(prop.type)
  ).length;
  var autoManagedProps = database.properties.length - mappableProps;
  
  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText("<b>✅ Database Loaded Successfully</b>"))
    .addWidget(CardService.newTextParagraph()
      .setText("<b>Title:</b> " + (database.title || "Untitled")))
    .addWidget(CardService.newTextParagraph()
      .setText("<b>Total Properties:</b> " + database.properties.length))
    .addWidget(CardService.newTextParagraph()
      .setText("<b>Mappable Properties:</b> " + mappableProps))
    .addWidget(CardService.newTextParagraph()
      .setText("<b>Auto-managed (Notion):</b> " + autoManagedProps));
  
  if (database.url) {
    section.addWidget(CardService.newTextButton()
      .setText("🔗 Open in Notion")
      .setOpenLink(CardService.newOpenLink().setUrl(database.url)));
  }
  
  return section;
}

/**
 * Build property mapping section with handler integration
 * ENHANCED: Filters Gmail field dropdowns based on property type compatibility
 */
function buildPropertyMappingSection(properties, savedMappings) {
  console.log("=== DEBUG: Starting buildPropertyMappingSection with validation ===");
  console.log("Total properties received:", properties.length);
  
  let section = CardService.newCardSection()
    .setHeader("Property Mappings")
    .addWidget(CardService.newTextParagraph()
      .setText("<b>Configure how email data maps to your Notion properties:</b>"));
  
  // Get all available Gmail fields once
  const allGmailFields = getAvailableGmailFields();
  
  // Process each property in order
  properties.forEach((property, index) => {
    const propId = property.id;
    const propType = property.type;
    
    console.log(`\n=== Processing property ${index + 1}: ${property.name} (${propType}) ===`);
    
    // Get saved mapping or create default
    const handler = getPropertyHandler(propType);
    let mapping = savedMappings[propId];
    
    if (!mapping && handler && handler.processConfiguration) {
      const defaultFormInputs = {};
      mapping = handler.processConfiguration(property, defaultFormInputs);
    } else if (!mapping) {
      mapping = {
        enabled: property.isTitle || false,
        emailField: getRecommendedEmailField(propType) || "subject",
        transformation: "none",
        isStaticOption: false,
        isRequired: property.isRequired || false
      };
    }
    
    // Skip auto-managed properties unless required
    if (["formula", "rollup", "created_time", "created_by", "last_edited_time", "last_edited_by"].includes(propType) && !property.isRequired) {
      console.log(">>> Skipping auto-managed property");
      return;
    }
    
    // Use handler to build UI if available
    if (handler && handler.buildUI) {
      console.log(">>> Using handler for:", propType);
      
      try {
        const widgets = handler.buildUI(property, mapping);
        
        if (Array.isArray(widgets)) {
          // Process each widget, filtering Gmail field dropdowns
          widgets.forEach(widget => {
            if (!widget) return;
            
            // Check if this is a Gmail field selection dropdown
            if (widget.getFieldName && widget.getFieldName().startsWith('emailField_')) {
              // Create filtered dropdown
              const filteredDropdown = createFilteredGmailFieldDropdown(
                widget.getFieldName(), 
                propType, 
                mapping.emailField
              );
              section.addWidget(filteredDropdown);
            } else {
              section.addWidget(widget);
            }
          });
        } else {
          section.addWidget(widgets);
        }
      } catch (error) {
        console.error(`Error building UI for ${property.name}:`, error);
        addFallbackUI(section, property, propType, error.message);
      }
    } else {
      // Fallback for properties without a handler
      console.log(">>> No handler found for:", propType);
      addFallbackUI(section, property, propType, "No handler available");
    }
    
    // Add divider between properties
    if (index < properties.length - 1) {
      section.addWidget(CardService.newDivider());
    }
  });
  
  console.log("=== DEBUG: Finished buildPropertyMappingSection ===");
  return section;
}

/**
 * Helper: Create filtered Gmail field dropdown based on property type compatibility
 */
function createFilteredGmailFieldDropdown(fieldName, propertyType, currentValue) {
  const allGmailFields = getAvailableGmailFields();
  const filteredSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName(fieldName)
    .setTitle("Email Source");
  
  // Add default option
  filteredSelect.addItem("-- Select Gmail field --", "", !currentValue);
  
  // Filter and add compatible fields
  let hasCompatibleFields = false;
  allGmailFields.forEach(gmailField => {
    const allowedTypes = getAllowedPropertyTypesForGmailField(gmailField.value);
    if (allowedTypes.includes(propertyType)) {
      filteredSelect.addItem(gmailField.label, gmailField.value, currentValue === gmailField.value);
      hasCompatibleFields = true;
    }
  });
  
  // If no compatible fields, show message instead
  if (!hasCompatibleFields) {
    return CardService.newTextParagraph()
      .setText(`<font color="#FF6B6B">⚠️ No compatible Gmail fields for ${propertyType} properties</font>`);
  }
  
  return filteredSelect;
}

/**
 * Helper: Add fallback UI when handler fails
 */
function addFallbackUI(section, property, propertyType, errorMessage) {
  section.addWidget(CardService.newTextParagraph()
    .setText(`<b>${property.name}</b> <font color="#666">(${getPropertyTypeDisplayName(propertyType)})</font>`));
  
  if (property.isRequired) {
    section.addWidget(CardService.newTextParagraph()
      .setText("<font color='#d93025'>⚠️ Required field</font>"));
  }
  
  section.addWidget(CardService.newTextParagraph()
    .setText(`<font color='#FF6B6B'>⚠️ ${errorMessage}</font>`));
}

/**
 * Build action section with save/reset buttons
 */
function buildActionSection() {
  return CardService.newCardSection()
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText("💾 Save Mappings")
        .setBackgroundColor("#0F9D58")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction()
          .setFunctionName("saveMappingsConfiguration")))
      .addButton(CardService.newTextButton()
        .setText("↺ Reset All")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("resetMappingsOnly")))
      .addButton(CardService.newTextButton()
        .setText("⚙️ Settings")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("showSettingsConfiguration")))
      .addButton(CardService.newTextButton()
        .setText("🏠 Home")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("onG2NHomepage"))));
}

// ============================================
// ERROR CARD FUNCTIONS
// ============================================

function buildConfigErrorCard() {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("⚠️ Configuration Required"))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText("Please set your Notion API Key and Database ID in Settings first."))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("⚙️ Go to Settings")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("showSettingsConfiguration")))))
    .build();
}

function buildSchemaErrorCard(errorMessage) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("⚠️ Cannot Load Database"))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText("Could not load your Notion database. Error: " + errorMessage))
      .addWidget(CardService.newTextParagraph()
        .setText("Please check:"))
      .addWidget(CardService.newTextParagraph()
        .setText("1. ✅ API key is correct"))
      .addWidget(CardService.newTextParagraph()
        .setText("2. ✅ Database ID is correct"))
      .addWidget(CardService.newTextParagraph()
        .setText("3. ✅ Database is shared with your integration")))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("🔄 Try Again")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("showMappingsConfiguration")))
        .addButton(CardService.newTextButton()
          .setText("⚙️ Check Settings")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("showSettingsConfiguration")))))
    .build();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get available Gmail fields for mapping
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
    { label: "#️⃣ Attachment Count", value: "attachmentCount" }
  ];
}
/**
 * Save mappings configuration from form inputs
 */
function saveMappingsConfiguration(formInput) {
  console.log("saveMappingsConfiguration called");
  
  try {
    const userProps = PropertiesService.getUserProperties();
    const inputs = formInput.formInput || {};
    console.log("Form inputs keys:", Object.keys(inputs));
    
    // Get schema using the correct function
    const config = getConfig();
    if (!config.apiKey || !config.databaseId) {
      throw new Error("No API key or database ID configured");
    }
    
    const schema = fetchNotionDatabaseSchema(config.databaseId, config.apiKey);
    if (!schema || !schema.success) {
      throw new Error("Could not fetch database schema");
    }
    
    const database = schema.database;
    const mappableProperties = database.properties.filter(prop => isPropertyMappable(prop.type));
    const newMappings = {};
    const validationErrors = [];
    
    console.log("Processing", mappableProperties.length, "mappable properties");
    
    // Process each property with CORRECT TYPE HANDLING and VALIDATION
    mappableProperties.forEach(property => {
      const propId = property.id;
      const propType = property.type;
      
      console.log(`Processing property: ${property.name} (${propType})`);
      
      // Get handler for this property type
      const handler = getPropertyHandler(propType);
      
      // Use handler to process configuration if available
      if (handler && handler.processConfiguration) {
        const mapping = handler.processConfiguration(property, inputs);
        newMappings[propId] = mapping;
        console.log(`  ✓ Processed with handler (${propType})`);
      } else {
        // Fallback for properties without a handler
        const isEnabled = property.isRequired || inputs[`enabled_${propId}`] === "true";
        const selectedEmailField = inputs[`emailField_${propId}`] || getRecommendedEmailField(propType) || "subject";
        
        newMappings[propId] = {
          type: propType,
          notionPropertyName: property.name,
          enabled: isEnabled,
          emailField: selectedEmailField,
          transformation: inputs[`transformation_${propId}`] || "none",
          isStaticOption: false,
          isRequired: property.isRequired || false
        };
        console.log(`  ✓ Processed with fallback (${propType})`);
      }
      
      // VALIDATION: Check if this is a standard mappable property
      // Skip validation for static-value properties (handled by their handlers)
      if (!['relation', 'checkbox', 'select', 'status', 'multi_select', 'people'].includes(propType)) {
        const mapping = newMappings[propId];
        
        if (mapping.enabled && mapping.emailField) {
          const allowedTypes = getAllowedPropertyTypesForGmailField(mapping.emailField);
          
          if (!allowedTypes.includes(propType)) {
            validationErrors.push(
              `"${property.name}" (${propType}) cannot map to Gmail field "${mapping.emailField}". ` +
              `Allowed types: ${allowedTypes.join(', ')}`
            );
            console.error(`Validation error: ${validationErrors[validationErrors.length - 1]}`);
          }
        }
      }
    });
    
    // If there are validation errors, show them to the user
    if (validationErrors.length > 0) {
      const errorMessage = "❌ Mapping validation errors:\n" + validationErrors.join("\n");
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText(errorMessage))
        .setNavigation(CardService.newNavigation().updateCard(buildMappingsCard()))
        .build();
    }
    
    // Save to properties
    userProps.setProperty("G2N_MAPPINGS", JSON.stringify(newMappings));
    console.log("Mappings saved successfully");
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("✅ Mappings saved successfully!"))
      .setNavigation(CardService.newNavigation().updateCard(buildHomepageCard()))
      .build();
      
  } catch (error) {
    console.error("Error saving mappings:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("❌ Failed to save mappings: " + error.message))
      .build();
  }
}
/**
 * Get allowed Notion property types for a Gmail field
 * @param {string} gmailField - The Gmail field name
 * @returns {Array} Array of allowed Notion property types
 */
function getAllowedPropertyTypesForGmailField(gmailField) {
  const fieldConstraints = {
    // Email identification
    'subject': ['title', 'rich_text', 'url'],
    'from': ['email', 'rich_text'],
    'to': ['email', 'rich_text'],
    'cc': ['email', 'rich_text'],
    'bcc': ['email', 'rich_text'],
    'replyTo': ['email', 'rich_text'],
    
    // Content
    'body': ['rich_text'],
    'plainBody': ['rich_text'],
    'snippet': ['rich_text'],
    
    // Dates
    'date': ['date', 'rich_text'],
    'internalDate': ['date', 'rich_text', 'number'],
    
    // Identification
    'messageId': ['rich_text', 'url'],
    'threadId': ['rich_text', 'url'],
    'gmailLinkUrl': ['url', 'rich_text'],
    'historyId': ['rich_text', 'number'],
    
    // Status
    'labels': ['multi_select', 'select', 'rich_text'],
    'starred': ['checkbox', 'rich_text'],
    'inInbox': ['checkbox', 'rich_text'],
    'hasAttachments': ['checkbox', 'rich_text'], // Removed 'number'
    'unread': ['checkbox', 'rich_text'],
    
    // Attachments
    'attachments': ['files', 'rich_text'],
    'attachmentCount': ['number', 'rich_text', 'checkbox'],
    'attachmentNames': ['rich_text']
  };
  
  return fieldConstraints[gmailField] || ['rich_text']; // Default to rich_text
}

// ============================================
// TEST FUNCTION
// ============================================

function testMappingsIntegration() {
  console.log("=== TESTING MAPPINGS INTEGRATION ===");
  
  var tests = [
    { test: "showMappingsConfiguration exists", func: () => typeof showMappingsConfiguration === "function" },
    { test: "getMappings returns object", func: () => { var m = getMappings(); return m && typeof m === "object"; } },
    { test: "enableCommonFields exists", func: () => typeof enableCommonFields === "function" }
  ];
  
  let results = [];
  tests.forEach(test => {
    try {
      results.push({ test: test.test, passed: test.func() });
    } catch (e) {
      results.push({ test: test.test, passed: false, error: e.message });
    }
  });
  
  var passedCount = results.filter(r => r.passed).length;
  return passedCount === tests.length ? 
    `✅ Perfect: ${passedCount}/${tests.length}` : 
    `⚠️ Issues: ${passedCount}/${tests.length}`;
}