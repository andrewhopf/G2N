// mappings.js - WITH QUICK SETUP FEATURE (CORRECTED NO DUPLICATES)
// Field mappings for Gmail to Notion integration

// MANDATORY: Core Functions
function getMappings() {
  const props = PropertiesService.getUserProperties();
  const savedMappingsJson = props.getProperty('G2N_MAPPINGS') || '';
  
  if (savedMappingsJson) {
    try {
      return JSON.parse(savedMappingsJson);
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

function showMappingsConfiguration() {
  try {
    return buildMappingsCard();
  } catch (error) {
    console.error("Error building mappings card:", error);
    return buildSchemaErrorCard(error.message);
  }
}


function saveMappingsConfiguration(e) {
  try {
    console.log("saveMappingsConfiguration called");
    const props = PropertiesService.getUserProperties();
    const formInputs = e.formInput || {};
    
    console.log("Form inputs keys:", Object.keys(formInputs));
    
    // Get schema using the correct function
    const config = getConfig();
    if (!config.apiKey || !config.databaseId) {
      throw new Error("No API key or database ID configured");
    }
    
    const notionSchema = fetchNotionDatabaseSchema(config.databaseId, config.apiKey);
    if (!notionSchema || !notionSchema.success) {
      throw new Error("Could not fetch database schema");
    }
    
    const schema = notionSchema.database;
    const updatedMappings = {};
    const supportedProperties = schema.properties.filter(p => p.supportedForMapping);
    
    console.log("Processing", supportedProperties.length, "supported properties");
    
    // Process each property
    supportedProperties.forEach(property => {
      const propertyId = property.id;
      const propertyType = property.type;
      
      console.log(`Processing property: ${property.name} (${propertyType})`);
      
      // 1. RELATION PROPERTIES
      if (propertyType === "relation") {
        const selectedDatabase = formInputs[`relation_database_${propertyId}`] || "";
        const relationType = formInputs[`relation_type_${propertyId}`] || "none";
        
        console.log(`  Relation config: db=${selectedDatabase.substring(0, 10)}..., type=${relationType}`);
        
        updatedMappings[propertyId] = {
          type: propertyType,
          notionPropertyName: property.name,
          enabled: relationType !== "none" && !!selectedDatabase,
          selectedDatabase: selectedDatabase,
          relationType: relationType,
          isStaticOption: true,
          isRelation: true
        };
      } 
      // 2. CHECKBOX PROPERTIES
      else if (propertyType === "checkbox") {
        const isChecked = formInputs[`checkbox_${propertyId}`] === true;
        updatedMappings[propertyId] = {
          type: propertyType,
          notionPropertyName: property.name,
          enabled: isChecked,
          checkboxValue: isChecked,
          isStaticOption: true
        };
      } 
      // 3. SELECT & STATUS PROPERTIES
      else if (propertyType === "select" || propertyType === "status") {
        const selectedOption = formInputs[`option_${propertyId}`] || "";
        updatedMappings[propertyId] = {
          type: propertyType,
          notionPropertyName: property.name,
          enabled: !!selectedOption,
          selectedOption: selectedOption,
          isStaticOption: true
        };
      } 
      // 4. MULTI_SELECT PROPERTIES
      else if (propertyType === "multi_select") {
        const selectedOptions = [];
        const rawOptions = formInputs[`options_${propertyId}`];
        
        if (Array.isArray(rawOptions)) {
          selectedOptions.push(...rawOptions);
        } else if (rawOptions) {
          selectedOptions.push(rawOptions);
        }
        
        updatedMappings[propertyId] = {
          type: propertyType,
          notionPropertyName: property.name,
          enabled: selectedOptions.length > 0,
          selectedOptions: selectedOptions,
          isStaticOption: true
        };
      } 
      // 5. PEOPLE PROPERTIES
      else if (propertyType === "people") {
        const isEnabled = property.isRequired || formInputs[`enabled_${propertyId}`] === true;
        updatedMappings[propertyId] = {
          type: propertyType,
          notionPropertyName: property.name,
          enabled: isEnabled,
          emailField: formInputs[`emailField_${propertyId}`] || "from",
          transformation: "extract_email",
          isStaticOption: false,
          isPeopleProperty: true
        };
      }
      // 6. AUTO-MANAGED PROPERTIES
      else if (["last_edited_time", "created_time", "created_by", 
               "last_edited_by", "formula", "rollup"].includes(propertyType)) {
        updatedMappings[propertyId] = {
          type: propertyType,
          notionPropertyName: property.name,
          enabled: false,
          isAutoManaged: true,
          isStaticOption: false
        };
      }
      // 7. REGULAR PROPERTIES
      else {
        updatedMappings[propertyId] = {
          type: propertyType,
          notionPropertyName: property.name,
          enabled: property.isRequired || formInputs[`enabled_${propertyId}`] === true,
          emailField: formInputs[`emailField_${propertyId}`] || getRecommendedEmailField(propertyType) || "subject",
          transformation: formInputs[`transformation_${propertyId}`] || "none",
          isStaticOption: false
        };
      }
    });
    
    // Save to properties
    props.setProperty('G2N_MAPPINGS', JSON.stringify(updatedMappings));
    
    console.log("Mappings saved successfully");
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("✅ Mappings saved successfully!"))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildHomepageCard()))
      .build();
      
  } catch (error) {
    console.error("Error saving mappings:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("❌ Failed to save mappings: " + error.message))
      .build();
  }
}



// MANDATORY: Card Builder Function
function buildMappingsCard() {
  const config = getConfig();
  
  if (!config.apiKey || !config.databaseId) {
    return buildConfigErrorCard();
  }
  
  const notionSchema = fetchNotionDatabaseSchema(config.databaseId, config.apiKey);
  
  if (!notionSchema || !notionSchema.success) {
    return buildSchemaErrorCard(notionSchema?.error || "Could not fetch database.");
  }
  
  const database = notionSchema.database;
  const currentMappings = getMappings();
  
  const cardBuilder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("📋 Map Email → Notion")
      .setSubtitle(`Database: ${database.title}`));
  
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
  
  cardBuilder.addSection(buildPropertyMappingSection(database.properties, currentMappings));
  cardBuilder.addSection(buildActionSection());
  
  return cardBuilder.build();
}

/**
 * Enable common/useful fields for quick setup
 * Called from the "⚡ Quick Setup" button in the UI
 */
function enableCommonFields() {
  console.log("=== ENABLING COMMON FIELDS ===");
  
  try {
    const props = PropertiesService.getUserProperties();
    const mappingsJson = props.getProperty('G2N_MAPPINGS');
    
    if (!mappingsJson) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText("⚠️ Please configure mappings first"))
        .build();
    }
    
    const mappings = JSON.parse(mappingsJson);
    let updatedCount = 0;
    
    console.log("Processing", Object.keys(mappings).length, "mappings...");
    
    // Enable common fields
    Object.values(mappings).forEach(mapping => {
      const propName = mapping.notionPropertyName.toLowerCase();
      const propType = mapping.type;
      
      // Check if this is a common/useful field
      const shouldEnable = 
        // Title field (usually the main task/email title)
        propType === 'title' ||
        
        // Sender/From fields
        (propName.includes('sender') || propName.includes('from')) ||
        
        // Email address fields
        (propType === 'email' || propName.includes('email')) ||
        
        // Content/body fields
        (propName.includes('body') || propName.includes('content')) ||
        
        // Link/URL fields (especially Gmail links)
        (propName.includes('link') || propName.includes('url') || propName.includes('gmail')) ||
        
        // Date fields
        (propName.includes('date') || propType === 'date');
      
      if (shouldEnable && !mapping.enabled) {
        mapping.enabled = true;
        updatedCount++;
        
        // Set appropriate defaults based on field type
        switch (propType) {
          case 'title':
            mapping.emailField = mapping.emailField || 'subject';
            mapping.transformation = mapping.transformation || 'none';
            console.log(`✓ Enabled title: ${mapping.notionPropertyName}`);
            break;
            
          case 'email':
            mapping.emailField = mapping.emailField || 'from';
            mapping.transformation = mapping.transformation || 'extract_email';
            console.log(`✓ Enabled email: ${mapping.notionPropertyName}`);
            break;
            
          case 'rich_text':
            if (propName.includes('body') || propName.includes('content')) {
              mapping.emailField = mapping.emailField || 'plainBody';
              mapping.transformation = mapping.transformation || 'html_to_text';
              console.log(`✓ Enabled content: ${mapping.notionPropertyName}`);
            }
            break;
            
          case 'url':
            if (propName.includes('gmail') || propName.includes('link')) {
              mapping.emailField = mapping.emailField || 'gmailLinkUrl';
              mapping.transformation = mapping.transformation || 'none';
              console.log(`✓ Enabled link: ${mapping.notionPropertyName}`);
            }
            break;
            
          case 'date':
            mapping.emailField = mapping.emailField || 'date';
            mapping.transformation = mapping.transformation || 'parse_date';
            console.log(`✓ Enabled date: ${mapping.notionPropertyName}`);
            break;
        }
      }
    });
    
    // Save updated mappings
    props.setProperty('G2N_MAPPINGS', JSON.stringify(mappings));
    
    console.log(`✅ Enabled ${updatedCount} common fields`);
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`✅ Enabled ${updatedCount} common fields`))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildMappingsCard())) // Refresh to show enabled checkboxes
      .build();
      
  } catch (error) {
    console.error("Error enabling common fields:", error);
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`❌ Failed to enable common fields: ${error.message}`))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildMappingsCard()))
      .build();
  }
}

// Helper Functions
function buildDatabaseInfoSection(database) {
  const supportedCount = database.properties.filter(p => p.supportedForMapping).length;
  const unsupportedCount = database.properties.length - supportedCount;
  
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph()
      .setText(`<b>✅ Database Loaded Successfully</b>`))
    .addWidget(CardService.newTextParagraph()
      .setText(`<b>Title:</b> ${database.title || "Untitled"}`))
    .addWidget(CardService.newTextParagraph()
      .setText(`<b>Total Properties:</b> ${database.properties.length}`))
    .addWidget(CardService.newTextParagraph()
      .setText(`<b>Mappable Properties:</b> ${supportedCount}`))
    .addWidget(CardService.newTextParagraph()
      .setText(`<b>Auto-managed (Notion):</b> ${unsupportedCount}`));
  
  if (database.url) {
    section.addWidget(CardService.newTextButton()
      .setText("🔗 Open in Notion")
      .setOpenLink(CardService.newOpenLink()
        .setUrl(database.url)));
  }
  
  return section;
}

/* FILE: mappings.js - CORRECTED buildPropertyMappingSection with relation support */

function buildPropertyMappingSection(notionProperties, currentMappings) {
  console.log("=== DEBUG: Starting buildPropertyMappingSection ===");
  console.log("Total properties received:", notionProperties.length);
  
  const section = CardService.newCardSection()
    .setHeader("Property Mappings")
    .addWidget(CardService.newTextParagraph()
      .setText("<b>Configure how email data maps to your Notion properties:</b>"));
  
  // Log all properties and their types
  notionProperties.forEach((prop, idx) => {
    console.log(`Property ${idx + 1}: ${prop.name} (${prop.type}) - Supported: ${prop.supportedForMapping || false}`);
  });
  
  const supportedProperties = notionProperties.filter(p => p.supportedForMapping);
  console.log("Supported properties count:", supportedProperties.length);
  console.log("Supported property types:", supportedProperties.map(p => p.type));
  
  supportedProperties.forEach((property, index) => {
    const propertyId = property.id;
    const propertyType = property.type;
    
    console.log(`\n=== Processing property ${index + 1}: ${property.name} (${propertyType}) ===`);
    console.log("Property ID:", propertyId);
    
    // Get saved mapping or create default
    const savedMapping = currentMappings[propertyId] || {
      enabled: property.isTitle,
      emailField: getRecommendedEmailField(property.type) || "subject",
      transformation: "none",
      selectedOption: property.type === "select" || property.type === "status" ? "" : null,
      selectedOptions: property.type === "multi_select" ? [] : null,
      checkboxValue: property.type === "checkbox" ? false : null,
      // For relation properties
      selectedDatabase: "",
      relationType: "none"
    };
    
    console.log("Saved mapping exists:", !!currentMappings[propertyId]);
    console.log("Current saved mapping:", savedMapping);
    
    // Property header
    section.addWidget(CardService.newTextParagraph()
      .setText(`<b>${property.name}</b> <font color="#666">(${property.type})</font>`));
    
    if (property.isRequired) {
      section.addWidget(CardService.newTextParagraph()
        .setText("<font color='#d93025'>⚠️ Required field</font>"));
    }
    
    // ============================================
    // SPECIAL HANDLING FOR PROPERTY TYPES
    // ============================================
    
    // 1. RELATION PROPERTIES (Special handling - CORRECTED)
    if (propertyType === "relation") {
      console.log(">>> THIS IS A RELATION PROPERTY - Building UI");
      
      section.addWidget(CardService.newTextParagraph()
        .setText("<i>Relation properties link to pages in another database.</i>"));
      
      try {
        // Get available databases for relation
        console.log("Fetching databases for relation dropdown...");
        const databases = fetchRealNotionDatabases() || [];
        const config = getConfig();
        
        console.log("Number of databases fetched:", databases.length);
        console.log("Current database ID:", config.databaseId);
        
        if (databases.length === 0) {
          console.log("WARNING: No databases returned from fetchRealNotionDatabases()");
          section.addWidget(CardService.newTextParagraph()
            .setText("<font color='#FF6B6B'>⚠️ No databases found. Please check your API key permissions.</font>"));
        } else {
          // Database selection dropdown
          const dbInput = CardService.newSelectionInput()
            .setFieldName(`relation_database_${propertyId}`)
            .setTitle("Related Database")
            .setType(CardService.SelectionInputType.DROPDOWN);
          
          // Add empty option
          dbInput.addItem("(Select a database to link to)", "", !savedMapping.selectedDatabase);
          
          // Add available databases (excluding the current one)
          let addedCount = 0;
          databases.forEach(db => {
            console.log(`Database option: ${db.name} (${db.id})`);
            if (db.id !== config.databaseId) {
              dbInput.addItem(db.name, db.id, savedMapping.selectedDatabase === db.id);
              addedCount++;
            } else {
              console.log(`  Skipping current database: ${db.name}`);
            }
          });
          
          console.log(`Added ${addedCount} databases to dropdown`);
          
          if (addedCount > 0) {
            section.addWidget(dbInput);
            
            // Relation type selection (show even if no database selected yet)
            const typeInput = CardService.newSelectionInput()
              .setFieldName(`relation_type_${propertyId}`)
              .setTitle("How to link")
              .setType(CardService.SelectionInputType.RADIO_BUTTON);
            
            typeInput.addItem("Don't link (skip)", "none", 
              !savedMapping.relationType || savedMapping.relationType === "none");
            typeInput.addItem("Link to existing page", "link_existing", 
              savedMapping.relationType === "link_existing");
            typeInput.addItem("Create new linked page", "create_new", 
              savedMapping.relationType === "create_new");
            
            section.addWidget(typeInput);
          } else {
            section.addWidget(CardService.newTextParagraph()
              .setText("<font color='#FF6B6B'>⚠️ No other databases available to link to.</font>"));
          }
        }
      } catch (error) {
        console.error("Error building relation UI:", error);
        section.addWidget(CardService.newTextParagraph()
          .setText(`<font color='#FF6B6B'>⚠️ Error loading databases: ${error.message}</font>`));
      }
    }
    // 2. CHECKBOX PROPERTIES
    else if (propertyType === "checkbox") {
      console.log(">>> Building checkbox UI");
      section.addWidget(CardService.newTextParagraph()
        .setText("<i>Set checkbox value:</i>"));
      
      const checkboxInput = CardService.newSelectionInput()
        .setFieldName(`checkbox_${propertyId}`)
        .setTitle("Checkbox Value")
        .setType(CardService.SelectionInputType.CHECK_BOX);
      
      checkboxInput.addItem("Always check this box", "true", 
        savedMapping.checkboxValue === true);
      
      section.addWidget(checkboxInput);
      
    } 
    // 3. SELECT & STATUS PROPERTIES
    else if (propertyType === "select" || propertyType === "status") {
      console.log(">>> Building select/status UI");
      section.addWidget(CardService.newTextParagraph()
        .setText("<i>Select a value to always use:</i>"));
      
      const optionsInput = CardService.newSelectionInput()
        .setFieldName(`option_${propertyId}`)
        .setTitle("Select Option")
        .setType(CardService.SelectionInputType.RADIO_BUTTON);
      
      // Add "None" option
      optionsInput.addItem("(Don't set a value)", "", savedMapping.selectedOption === "");
      
      // Add actual Notion options
      const options = property.config.options || [];
      console.log(`  Number of options: ${options.length}`);
      options.forEach(option => {
        optionsInput.addItem(option.name, option.name, 
          savedMapping.selectedOption === option.name);
      });
      
      section.addWidget(optionsInput);
      
    } 
    // 4. MULTI_SELECT PROPERTIES
    else if (propertyType === "multi_select") {
      console.log(">>> Building multi-select UI");
      section.addWidget(CardService.newTextParagraph()
        .setText("<i>Select values to always include:</i>"));
      
      const optionsInput = CardService.newSelectionInput()
        .setFieldName(`options_${propertyId}`)
        .setTitle("Select Options")
        .setType(CardService.SelectionInputType.CHECK_BOX);
      
      const selectedOptions = savedMapping.selectedOptions || [];
      const options = property.config.options || [];
      
      options.forEach(option => {
        optionsInput.addItem(option.name, option.name, 
          selectedOptions.includes(option.name));
      });
      
      section.addWidget(optionsInput);
      
    } 
    // 5. PEOPLE PROPERTIES (Special handling)
    else if (propertyType === "people") {
      console.log(">>> Building people UI");
      section.addWidget(CardService.newTextParagraph()
        .setText("<i>People properties require Notion User IDs. Map to email field, then we'll try to match to Notion users.</i>"));
      
      // Enabled toggle
      if (!property.isRequired) {
        section.addWidget(CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.CHECK_BOX)
          .setFieldName(`enabled_${propertyId}`)
          .addItem(`Map this property`, "true", savedMapping.enabled));
      }
      
      // Email field for people (usually "from" field)
      const emailFieldInput = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName(`emailField_${propertyId}`)
        .setTitle("Email Source (will try to match to Notion user)");
      
      const gmailFields = getAvailableGmailFields();
      gmailFields.forEach(field => {
        emailFieldInput.addItem(field.label, field.value, 
          savedMapping.emailField === field.value);
      });
      
      section.addWidget(emailFieldInput);
      
    }
    // 6. AUTO-MANAGED PROPERTIES (created_time, last_edited_time, etc.)
    else if (["last_edited_time", "created_time", "created_by", 
             "last_edited_by", "formula", "rollup"].includes(propertyType)) {
      console.log(">>> Building auto-managed UI");
      section.addWidget(CardService.newTextParagraph()
        .setText("<i>⚠️ Auto-managed by Notion - cannot be mapped</i>"));
      section.addWidget(CardService.newTextParagraph()
        .setText('<font color="#5F6368">This property is automatically managed by Notion and will be set when the page is created or updated.</font>'));
    }
    // 7. REGULAR PROPERTIES (title, rich_text, date, email, url, number, etc.)
    else {
      console.log(">>> Building regular property UI");
      
      // Enabled toggle (skip for required title fields)
      if (!property.isRequired && propertyType !== "title") {
        section.addWidget(CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.CHECK_BOX)
          .setFieldName(`enabled_${propertyId}`)
          .addItem(`Map this property`, "true", savedMapping.enabled));
      }
      
      // Email field selection
      const emailFieldInput = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName(`emailField_${propertyId}`)
        .setTitle("Email Source");
      
      const gmailFields = getAvailableGmailFields();
      gmailFields.forEach(field => {
        emailFieldInput.addItem(field.label, field.value, 
          savedMapping.emailField === field.value);
      });
      
      section.addWidget(emailFieldInput);
      
      // Transformation options (skip for people, checkbox, select types)
      if (propertyType !== "people" && propertyType !== "checkbox" && 
          propertyType !== "select" && propertyType !== "multi_select" && 
          propertyType !== "status" && propertyType !== "relation") {
        const transformations = getTransformationOptions(propertyType);
        if (transformations.length > 1) {
          const transformationInput = CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.DROPDOWN)
            .setFieldName(`transformation_${propertyId}`)
            .setTitle("Data Processing");
          
          transformations.forEach(trans => {
            transformationInput.addItem(trans.label, trans.value, 
              savedMapping.transformation === trans.value);
          });
          
          section.addWidget(transformationInput);
        }
      }
    }
    
    // Add divider between properties
    if (index < supportedProperties.length - 1) {
      section.addWidget(CardService.newDivider());
    }
  });
  
  console.log("=== DEBUG: Finished buildPropertyMappingSection ===");
  return section;
}

function buildActionSection() {
  return CardService.newCardSection()
    .addWidget(CardService.newButtonSet()
      // Main actions
      .addButton(CardService.newTextButton()
        .setText("💾 Save Mappings")
        .setBackgroundColor("#0F9D58")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(CardService.newAction()
          .setFunctionName("saveMappingsConfiguration")))
      
      // Reset button
      .addButton(CardService.newTextButton()
        .setText("↺ Reset All")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("resetMappingsOnly")))
      
      // Navigation
      .addButton(CardService.newTextButton()
        .setText("⚙️ Settings")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("showSettingsConfiguration")))
      .addButton(CardService.newTextButton()
        .setText("🏠 Home")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("onG2NHomepage"))));
}

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
        .setText(`Could not load your Notion database. Error: ${errorMessage}`))
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

function getTransformationOptions(propertyType) {
  const transformations = {
    "title": [
      { label: "Use as-is", value: "none" },
      { label: "Remove 'Re:'/'Fwd:'", value: "remove_prefixes" },
      { label: "Truncate (100 chars)", value: "truncate_100" }
    ],
    "rich_text": [
      { label: "HTML to plain text", value: "html_to_text" },
      { label: "First 500 chars", value: "truncate_500" },
      { label: "Extract links", value: "extract_links" }
    ],
    "email": [
      { label: "Extract email address", value: "extract_email" },
      { label: "Keep full format", value: "keep_full" }
    ],
    "date": [
      { label: "Parse date", value: "parse_date" },
      { label: "ISO format", value: "iso_date" }
    ],
    "url": [
      { label: "Use as-is", value: "none" },
      { label: "Make clickable link", value: "make_clickable" }
    ],
    "number": [
      { label: "Count items", value: "count_items" },
      { label: "Extract number", value: "extract_number" }
    ]
  };
  
  return transformations[propertyType] || [{ label: "No processing", value: "none" }];
}

// Test function
function testMappingsIntegration() {
  console.log("=== TESTING MAPPINGS INTEGRATION ===");
  
  const tests = [
    { test: "showMappingsConfiguration exists", func: () => typeof showMappingsConfiguration === 'function' },
    { test: "getMappings returns object", func: () => { const m = getMappings(); return m && typeof m === 'object'; }},
    { test: "enableCommonFields exists", func: () => typeof enableCommonFields === 'function' }
  ];
  
  const results = [];
  tests.forEach(t => {
    try {
      results.push({ test: t.test, passed: t.func() });
    } catch (e) {
      results.push({ test: t.test, passed: false, error: e.message });
    }
  });
  
  const passed = results.filter(t => t.passed).length;
  return passed === tests.length ? `✅ Perfect: ${passed}/${tests.length}` : `⚠️ Issues: ${passed}/${tests.length}`;
}