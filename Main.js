// Main.gs
// =============================================================================
// MAIN ENTRY POINTS AND ORCHESTRATION
// Updated with unified save system and simplified user experience
// Enhanced integration with centralized Constants.gs
// =============================================================================

// =============================================================================
// MAIN ENTRY POINTS (Required by appsscript.json)
// =============================================================================

/**
 * MAIN HOMEPAGE FUNCTION - Gmail Add-on Entry Point
 * This is the ONLY homepage function that should exist
 */

// =============================================================================
// GLOBAL SERVICE INSTANCES
// =============================================================================

// Global UIService instance
let globalUIService = null;

/**
 * Get or create global UIService instance
 */
function getUIService() {
  if (!globalUIService) {
    try {
      globalUIService = new UIService();
      console.log('✅ Global UIService instance created');
    } catch (error) {
      console.error('❌ Failed to create UIService:', error);
      throw error;
    }
  }
  return globalUIService;
}

/**
 * Reset global UIService (for testing)
 */
function resetUIService() {
  globalUIService = null;
  console.log('🔄 Global UIService reset');
}



function onG2NHomepage(e) {
  const constants = getAppConstants();
  const uiConstants = constants.UI;
  
  try {
    // Safe way to get message ID without optional chaining
    const messageId = (e && e.messageMetadata && e.messageMetadata.messageId) ? e.messageMetadata.messageId : 'no-message';
    const eventStr = e ? JSON.stringify(e).substring(0, 200) : 'no-event';
    
    g2nInfo(constants.LOGGING.SOURCES.MAIN, 'Building G2N homepage', { 
      messageId: messageId,
      event: eventStr
    });
    
    // Check if we need to show setup wizard for new users
    const config = getEnhancedG2NConfig();
    const needsSetup = !config.NOTION_API_KEY || !config.DATABASES.gmail.id;
    
    if (needsSetup) {
      console.log(constants.UI.ICONS.INFO + ' New user detected - showing setup wizard');
      return buildSetupWizardCard();
    }
    
    // Build simplified homepage for configured users
    return buildSimplifiedHomepageCard();
    
  } catch (error) {
    g2nError(constants.LOGGING.SOURCES.MAIN, 'Homepage failed critically', { 
      error: error.message, 
      stack: error.stack,
      event: e ? JSON.stringify(e).substring(0, 200) : 'no-event'
    });
    
    // Emergency fallback - simplest possible card
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(constants.UI.ICONS.EMAIL + ' Gmail to Notion'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText(constants.UI.MESSAGES.CONFIG_REQUIRED))
        .addWidget(CardService.newTextButton()
          .setText(constants.UI.ICONS.CONFIG + ' Configure')
          .setOnClickAction(CardService.newAction()
            .setFunctionName(constants.FUNCTION_NAMES.SHOW_SETTINGS))))
      .build();
  }
}

/**
 * Build simplified homepage card with clear actions
*/
function buildSimplifiedHomepageCard() {
  const constants = getAppConstants();
  
  try {
    console.log(constants.UI.ICONS.HOME + ' Building simplified homepage card...');
    
    const config = getEnhancedG2NConfig();
    const hasMappings = config.PROPERTY_MAPPINGS && config.PROPERTY_MAPPINGS.mappings && config.PROPERTY_MAPPINGS.mappings[config.DATABASES.gmail.id] && 
                       Object.keys(config.PROPERTY_MAPPINGS.mappings[config.DATABASES.gmail.id]).length > 0;
    
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(constants.UI.ICONS.EMAIL + ' Gmail to Notion')
        .setSubtitle(constants.UI.MESSAGES.HOMEPAGE.SUBTITLE.replace('{database}', config.DATABASES.gmail.name || 'Not configured')));
    
    // Current Database Section
    const databaseSection = CardService.newCardSection()
      .setHeader(constants.UI.ICONS.DATABASE + ' Current Database');
    
    databaseSection.addWidget(CardService.newKeyValue()
      .setTopLabel("Selected Database")
      .setContent(config.DATABASES.gmail.name || 'Not selected')
      .setIconUrl("https://www.gstatic.com/images/icons/material/system/1x/storage_black_24dp.png"));
    
    if (hasMappings) {
      const mappingCount = Object.keys(config.PROPERTY_MAPPINGS.mappings[config.DATABASES.gmail.id]).length;
      databaseSection.addWidget(CardService.newKeyValue()
        .setTopLabel("Property Mappings")
        .setContent(mappingCount + ' mappings configured')
        .setIconUrl("https://www.gstatic.com/images/icons/material/system/1x/tune_black_24dp.png"));
    }
    
    card.addSection(databaseSection);
    
    // Quick Actions Section - SIMPLIFIED
    const quickActionsSection = CardService.newCardSection()
      .setHeader(constants.UI.ICONS.SUCCESS_ALT + ' Quick Actions')
      .addWidget(CardService.newTextParagraph()
        .setText(constants.UI.MESSAGES.HOMEPAGE.SAVE_INSTRUCTIONS));
    
    // Single Save Button
    quickActionsSection.addWidget(CardService.newTextButton()
      .setText(constants.UI.ICONS.SAVE + ' Save to Notion')
      .setOnClickAction(CardService.newAction()
        .setFunctionName(constants.FUNCTION_NAMES.QUICK_SAVE_EMAIL)));
    
    // Property Mapping Configuration
    quickActionsSection.addWidget(CardService.newTextButton()
      .setText(constants.UI.ICONS.MAPPING + ' Configure Property Mappings')
      .setOnClickAction(CardService.newAction()
        .setFunctionName(constants.FUNCTION_NAMES.SHOW_ADVANCED_MAPPING)));
    
    card.addSection(quickActionsSection);
    
    // Configuration Section
    const configSection = CardService.newCardSection()
      .setHeader(constants.UI.ICONS.CONFIG + ' Configuration')
      .addWidget(CardService.newTextButton()
        .setText(constants.UI.ICONS.CONFIG + ' Settings')
        .setOnClickAction(CardService.newAction()
          .setFunctionName(constants.FUNCTION_NAMES.SHOW_SETTINGS)))
      .addWidget(CardService.newTextButton()
        .setText(constants.UI.ICONS.TEST + ' Test Connection')
        .setOnClickAction(CardService.newAction()
          .setFunctionName(constants.FUNCTION_NAMES.ENHANCED_TEST_CONNECTION)));
          // In your buildSimplifiedHomepageCard function, add this:
configSection.addWidget(CardService.newTextButton() // added AJH debug
  .setText('🔍 Debug Database')
  .setOnClickAction(CardService.newAction()
    .setFunctionName('debugDatabaseStructure')));
    
    card.addSection(configSection);
    
    console.log(constants.UI.ICONS.SUCCESS + ' Simplified homepage card built successfully');
    return card.build();
    
  } catch (error) {
    console.error(constants.UI.ICONS.ERROR + ' Failed to build homepage card:', error);
    // Fallback card
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(constants.UI.ICONS.EMAIL + ' Gmail to Notion'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Save emails to Notion with one click.'))
        .addWidget(CardService.newTextButton()
          .setText(constants.UI.ICONS.SAVE + ' Save to Notion')
          .setOnClickAction(CardService.newAction()
            .setFunctionName(constants.FUNCTION_NAMES.QUICK_SAVE_EMAIL))))
      .build();
  }
}


/**
 * Build simplified homepage card with context info

function buildSimplifiedHomepageCard(e) {
  const constants = getAppConstants();
  
  try {
    console.log('🏠 Building homepage with context:', {
      hasEvent: !!e,
      messageId: e?.gmail?.messageId
    });
    
    const config = getEnhancedG2NConfig();
    const hasMappings = config.PROPERTY_MAPPINGS && config.PROPERTY_MAPPINGS.mappings && config.PROPERTY_MAPPINGS.mappings[config.DATABASES.gmail.id] && 
                       Object.keys(config.PROPERTY_MAPPINGS.mappings[config.DATABASES.gmail.id]).length > 0;
    
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(constants.UI.ICONS.EMAIL + ' Gmail to Notion')
        .setSubtitle(constants.UI.MESSAGES.HOMEPAGE.SUBTITLE.replace('{database}', config.DATABASES.gmail.name || 'Not configured')));
    
    // Context Info Section
    const contextSection = CardService.newCardSection()
      .setHeader('🔍 Context Information');
    
    if (e && e.gmail && e.gmail.messageId) {
      contextSection.addWidget(CardService.newTextParagraph()
        .setText('✅ **Email Context Available**'));
      contextSection.addWidget(CardService.newTextParagraph()
        .setText('You can save this email to Notion.'));
    } else {
      contextSection.addWidget(CardService.newTextParagraph()
        .setText('⚠️ **No Email Context**'));
      contextSection.addWidget(CardService.newTextParagraph()
        .setText('Open an email and click the add-on from there to save it.'));
    }
    
    card.addSection(contextSection);
    
    // Current Database Section
    const databaseSection = CardService.newCardSection()
      .setHeader(constants.UI.ICONS.DATABASE + ' Current Database');
    
    databaseSection.addWidget(CardService.newKeyValue()
      .setTopLabel("Selected Database")
      .setContent(config.DATABASES.gmail.name || 'Not selected')
      .setIconUrl("https://www.gstatic.com/images/icons/material/system/1x/storage_black_24dp.png"));
    
    if (hasMappings) {
      const mappingCount = Object.keys(config.PROPERTY_MAPPINGS.mappings[config.DATABASES.gmail.id]).length;
      databaseSection.addWidget(CardService.newKeyValue()
        .setTopLabel("Property Mappings")
        .setContent(mappingCount + ' mappings configured')
        .setIconUrl("https://www.gstatic.com/images/icons/material/system/1x/tune_black_24dp.png"));
    }
    
    databaseSection.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(constants.UI.BUTTONS.CHANGE_DATABASE)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(constants.FUNCTION_NAMES.SHOW_DATABASE_SELECTION))));
    
    card.addSection(databaseSection);
    
    // Quick Actions Section
    const quickActionsSection = CardService.newCardSection()
      .setHeader(constants.UI.ICONS.SUCCESS_ALT + ' Quick Actions')
      .addWidget(CardService.newTextParagraph()
        .setText(constants.UI.MESSAGES.HOMEPAGE.SAVE_INSTRUCTIONS));
    
    // Save button - only enable if we have context
    const saveButton = CardService.newTextButton()
      .setText(constants.UI.ICONS.SAVE + ' Save to Notion')
      .setOnClickAction(CardService.newAction()
        .setFunctionName(constants.FUNCTION_NAMES.QUICK_SAVE_EMAIL));
    
    // If we have context, pass the message ID
    if (e && e.gmail && e.gmail.messageId) {
      saveButton.setOnClickAction(CardService.newAction()
        .setFunctionName(constants.FUNCTION_NAMES.QUICK_SAVE_EMAIL)
        .setParameters({
          messageId: e.gmail.messageId,
          threadId: e.gmail.threadId || ''
        }));
    }
    
    quickActionsSection.addWidget(saveButton);
    
    // Property Mapping Configuration
    quickActionsSection.addWidget(CardService.newTextButton()
      .setText(constants.UI.ICONS.MAPPING + ' Configure Property Mappings')
      .setOnClickAction(CardService.newAction()
        .setFunctionName(constants.FUNCTION_NAMES.SHOW_ADVANCED_MAPPING)));
    
    card.addSection(quickActionsSection);
    
    // Configuration Section
    const configSection = CardService.newCardSection()
      .setHeader(constants.UI.ICONS.CONFIG + ' Configuration')
      .addWidget(CardService.newTextButton()
        .setText(constants.UI.ICONS.CONFIG + ' Settings')
        .setOnClickAction(CardService.newAction()
          .setFunctionName(constants.FUNCTION_NAMES.SHOW_SETTINGS)))
      .addWidget(CardService.newTextButton()
        .setText(constants.UI.ICONS.TEST + ' Test Connection')
        .setOnClickAction(CardService.newAction()
          .setFunctionName(constants.FUNCTION_NAMES.ENHANCED_TEST_CONNECTION)));
    
    card.addSection(configSection);
    
    console.log('✅ Homepage card built with context info');
    return card.build();
    
  } catch (error) {
    console.error('💥 Failed to build homepage card:', error);
    // Fallback card
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(constants.UI.ICONS.EMAIL + ' Gmail to Notion'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Save emails to Notion with one click.'))
        .addWidget(CardService.newTextButton()
          .setText(constants.UI.ICONS.SAVE + ' Save to Notion')
          .setOnClickAction(CardService.newAction()
            .setFunctionName(constants.FUNCTION_NAMES.QUICK_SAVE_EMAIL))))
      .build();
  }
}

 */
// =============================================================================
// ADVANCED MAPPING FUNCTIONS - ADDED TO MAIN.GS
// =============================================================================

// In Main.gs or UIService.gs - Update showG2NAdvancedMapping function:

/**
 * Show advanced property mapping interface with saved selections
 */
function showG2NAdvancedMapping(e) {
  console.log('⚙️ Showing advanced property mapping...');
  
  try {
    const config = getEnhancedG2NConfig();
    
    if (!config.DATABASES.gmail.id) {
      console.error('❌ No database selected');
      return buildErrorCard(
        '🗄️ Database Required',
        'Please select a database first before configuring property mappings.'
      );
    }
    
    const databaseId = config.DATABASES.gmail.id;
    const databaseName = config.DATABASES.gmail.name || 'Selected Database';
    
    console.log(`🗄️ Database: ${databaseName} (${databaseId.substring(0, 8)}...)`);
    
    // 1. Get database properties from Notion
    const notionService = new NotionService();
    const database = notionService.verifyG2NDatabaseAccess(databaseId);
    const properties = database.properties || {};
    
    console.log(`📊 Found ${Object.keys(properties).length} database properties`);
    
    // 2. Load saved mappings for this database
    const savedMappings = loadG2NPropertyMappings(databaseId);
    console.log(`📋 Loaded ${Object.keys(savedMappings).filter(k => k !== '_metadata').length} saved mappings`);
    
    // 3. Create the card
    const card = CardService.newCardBuilder();
    
    // Header
    card.setHeader(CardService.newCardHeader()
      .setTitle('⚙️ Advanced Property Mapping')
      .setSubtitle(`Database: ${databaseName}`));
    
    // Instructions section
    const instructionsSection = CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('Map email fields to Notion database properties. Your selections will be saved for future use.'));
    card.addSection(instructionsSection);
    
    // Get email field definitions
    const constants = getAppConstants();
    const emailFields = constants.PROPERTY_MAPPINGS.EMAIL_FIELDS || [];
    
    // Create mapping sections for each email field
    emailFields.forEach(field => {
      const section = CardService.newCardSection()
        .setHeader(`📧 ${field.label || field.value}`);
      
      // Get current saved mapping for this field
      let savedSelection = '-- Don\'t Map --';
      if (savedMappings[field.value]) {
        savedSelection = savedMappings[field.value].notionProperty;
        console.log(`📝 Field "${field.value}" saved as: ${savedSelection}`);
      }
      
      // Create dropdown with database properties
      const selectionInput = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setTitle('Map to:')
        .setFieldName(`mapping_${field.value}`)
        .addItem('-- Don\'t Map --', '-- Don\'t Map --', savedSelection === '-- Don\'t Map --');
      
      // Add database properties as options
      Object.keys(properties).forEach(propName => {
        const prop = properties[propName];
        const isSelected = savedSelection === propName;
        selectionInput.addItem(
          `${propName} (${prop.type})`, 
          propName, 
          isSelected
        );
        if (isSelected) {
          console.log(`✅ Preselecting: ${propName} for ${field.value}`);
        }
      });
      
      section.addWidget(selectionInput);
      card.addSection(section);
    });
    
    // Action buttons section
    const actionsSection = CardService.newCardSection();
    
    // Save button
    actionsSection.addWidget(CardService.newTextButton()
      .setText('💾 Save Mappings')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('saveAdvancedMapping')));
    
    // Auto-detect button
    actionsSection.addWidget(CardService.newTextButton()
      .setText('🔄 Auto-Detect')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('autoDetectMapping')));
    
    // Back button
    actionsSection.addWidget(CardService.newTextButton()
      .setText('← Back to Email')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('onG2NGmailMessage')));
    
    card.addSection(actionsSection);
    
    console.log('✅ Advanced mapping card built successfully');
    return card.build();
    
  } catch (error) {
    console.error('❌ Failed to show advanced mapping:', error);
    return buildErrorCard(
      '❌ Mapping Configuration Failed',
      `Failed to load property mapping interface: ${error.message}\n\nPlease make sure:\n1. You have selected a database\n2. The database is accessible to your Notion integration\n3. You have an active internet connection`
    );
  }
}

/**
 * Auto-detect property mappings based on property names
 */
function autoDetectMapping(e) {
  console.log('🔄 Auto-detecting property mappings...');
  
  try {
    const config = getEnhancedG2NConfig();
    
    if (!config.DATABASES.gmail.id) {
      throw new Error('No database selected');
    }
    
    const databaseId = config.DATABASES.gmail.id;
    
    // Get database properties
    const notionService = new NotionService();
    const database = notionService.verifyG2NDatabaseAccess(databaseId);
    const properties = database.properties || {};
    
    // Create auto-detected mappings
    const autoMappings = {};
    const constants = getAppConstants();
    const emailFields = constants.PROPERTY_MAPPINGS.EMAIL_FIELDS || [];
    
    emailFields.forEach(field => {
      const fieldValue = field.value || field.id;
      let matchedProperty = null;
      
      // Try to match based on property names
      Object.keys(properties).forEach(propName => {
        const prop = properties[propName];
        const lowerPropName = propName.toLowerCase();
        const lowerFieldValue = fieldValue.toLowerCase();
        
        // Common matching patterns
        if (lowerFieldValue === 'subject' || lowerFieldValue === 'title') {
          if (lowerPropName.includes('subject') || lowerPropName.includes('title') || lowerPropName.includes('name')) {
            matchedProperty = propName;
          }
        } else if (lowerFieldValue === 'sender' || lowerFieldValue === 'from') {
          if (lowerPropName.includes('from') || lowerPropName.includes('sender') || lowerPropName.includes('author')) {
            matchedProperty = propName;
          }
        } else if (lowerFieldValue === 'datesent' || lowerFieldValue === 'date') {
          if (lowerPropName.includes('date') || lowerPropName.includes('sent') || lowerPropName.includes('created')) {
            matchedProperty = propName;
          }
        } else if (lowerFieldValue === 'body' || lowerFieldValue === 'content') {
          if (lowerPropName.includes('body') || lowerPropName.includes('content') || lowerPropName.includes('description')) {
            matchedProperty = propName;
          }
        } else if (lowerFieldValue === 'gmaillink' || lowerFieldValue === 'link') {
          if (lowerPropName.includes('link') || lowerPropName.includes('url')) {
            matchedProperty = propName;
          }
        }
      });
      
      if (matchedProperty) {
        autoMappings[fieldValue] = {
          emailField: fieldValue,
          notionProperty: matchedProperty,
          notionType: properties[matchedProperty].type,
          autoDetected: true,
          detectedAt: new Date().toISOString()
        };
        console.log(`✅ Auto-detected: ${fieldValue} → ${matchedProperty}`);
      }
    });
    
    // Save auto-detected mappings
    if (Object.keys(autoMappings).length > 0) {
      const saveResult = saveG2NPropertyMappings(databaseId, autoMappings);
      
      if (!saveResult.success) {
        throw new Error(`Failed to save auto-detected mappings: ${saveResult.error}`);
      }
      
      console.log(`✅ Saved ${Object.keys(autoMappings).length} auto-detected mappings`);
      
      return buildConfirmationCard(
        '🔄 Auto-Detection Complete',
        `Successfully detected and saved ${Object.keys(autoMappings).length} property mappings:\n\n${Object.keys(autoMappings).map(field => `• ${field} → ${autoMappings[field].notionProperty}`).join('\n')}`,
        [
          {
            text: '⚙️ Review Mappings',
            functionName: 'showG2NAdvancedMapping'
          },
          {
            text: '💾 Save Email Now',
            functionName: 'quickG2NSaveEmail',
            parameters: { useSavedMappings: true }
          },
          {
            text: '← Back to Email',
            functionName: 'onG2NGmailMessage'
          }
        ]
      );
    } else {
      console.warn('⚠️ No properties could be auto-detected');
      return buildErrorCard(
        '🔄 Auto-Detection Failed',
        'Could not automatically detect property mappings.\n\nPlease manually configure the mappings.'
      );
    }
    
  } catch (error) {
    console.error('❌ Auto-detection failed:', error);
    return buildErrorCard(
      '❌ Auto-Detection Failed',
      `Failed to auto-detect property mappings: ${error.message}`
    );
  }
}

/**
 * Save advanced property mappings - CORRECTED VERSION
 */
function saveAdvancedMapping(e) {
  try {
    console.log('💾 Saving advanced mappings...');
    
    // SAFELY extract parameters
    const databaseId = (e && e.parameters && e.parameters.databaseId) || '';
    const useSavedMappings = (e && e.parameters && e.parameters.useSavedMappings === 'true'); // Convert string to boolean
    
    // Validate required parameters
    if (!databaseId) {
      throw new Error('Database ID is required');
    }
    
    // Get form data safely
    const formInputs = (e && e.formInput) || {};
    
    console.log('📋 Form inputs received:', Object.keys(formInputs));
    console.log('🔧 Parameters:', { databaseId, useSavedMappings });
    
    // Initialize PropertyMapper
    const propertyMapper = new PropertyMapper();
    
    // Process mappings from form inputs
    const mappings = {};
    const constants = getAppConstants();
    const emailFields = (constants && constants.EMAIL_FIELDS && constants.EMAIL_FIELDS.DEFINITIONS) || [];
    
    // Extract mapping values
    emailFields.forEach(field => {
      if (field && field.id) {
        const fieldId = field.id;
        const mappingKey = `mapping_${fieldId}`;
        const newPropTypeKey = `new_prop_type_${fieldId}`;
        const newPropNameKey = `new_prop_name_${fieldId}`;
        
        const mappingValue = formInputs[mappingKey];
        
        if (mappingValue === 'CREATE_NEW') {
          // Handle new property creation
          const newPropType = formInputs[newPropTypeKey] || 'rich_text';
          const newPropName = formInputs[newPropNameKey] || field.name;
          
          if (newPropName && newPropName.trim()) {
            try {
              // Create the new property in Notion
              const notionService = new NotionService();
              const createdProp = notionService.createPropertyInDatabase(databaseId, newPropName.trim(), newPropType);
              
              if (createdProp && createdProp.success) {
                mappings[fieldId] = newPropName.trim();
                console.log(`✅ Created new property: ${newPropName} (${newPropType})`);
              } else {
                console.warn(`⚠️ Failed to create property: ${newPropName}`);
              }
            } catch (createError) {
              console.error(`❌ Error creating property ${newPropName}:`, createError);
              // Continue without this mapping
            }
          }
        } else if (mappingValue && mappingValue.trim()) {
          // Use existing property mapping
          mappings[fieldId] = mappingValue.trim();
        }
        // If mappingValue is empty, don't map this field
      }
    });
    
    console.log('📝 Final mappings to save:', mappings);
    
    // Save the mappings
    const saveResult = propertyMapper.saveMappings(databaseId, mappings);
    
    if (!saveResult.success) {
      throw new Error(`Failed to save mappings: ${saveResult.error || 'Unknown error'}`);
    }
    
    // Return success response
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Property mappings saved successfully!')
        .setType(CardService.NotificationType.INFO))
      .setStateChanged(true)
      .build();
    
  } catch (error) {
    console.error('❌ Error saving advanced mappings:', error);
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`❌ Failed to save property mappings: ${error.message}`)
        .setType(CardService.NotificationType.ERROR))
      .build();
  }
}

/**
 * Auto-detect property mappings based on property names
 */
function autoDetectMapping(e) {
  console.log('🔄 Auto-detecting property mappings...');
  
  try {
    const config = getEnhancedG2NConfig();
    
    if (!config.DATABASES.gmail.id) {
      throw new Error('No database selected');
    }
    
    const databaseId = config.DATABASES.gmail.id;
    
    // Get database properties
    const notionService = new NotionService();
    const database = notionService.verifyG2NDatabaseAccess(databaseId);
    const properties = database.properties || {};
    
    // Create auto-detected mappings
    const autoMappings = {};
    const constants = getAppConstants();
    const emailFields = constants.PROPERTY_MAPPINGS.EMAIL_FIELDS || [];
    
    emailFields.forEach(field => {
      const fieldValue = field.value || field.id;
      let matchedProperty = null;
      
      // Try to match based on property names
      Object.keys(properties).forEach(propName => {
        const prop = properties[propName];
        const lowerPropName = propName.toLowerCase();
        const lowerFieldValue = fieldValue.toLowerCase();
        
        // Common matching patterns
        if (lowerFieldValue === 'subject' || lowerFieldValue === 'title') {
          if (lowerPropName.includes('subject') || lowerPropName.includes('title') || lowerPropName.includes('name')) {
            matchedProperty = propName;
          }
        } else if (lowerFieldValue === 'sender' || lowerFieldValue === 'from') {
          if (lowerPropName.includes('from') || lowerPropName.includes('sender') || lowerPropName.includes('author')) {
            matchedProperty = propName;
          }
        } else if (lowerFieldValue === 'datesent' || lowerFieldValue === 'date') {
          if (lowerPropName.includes('date') || lowerPropName.includes('sent') || lowerPropName.includes('created')) {
            matchedProperty = propName;
          }
        } else if (lowerFieldValue === 'body' || lowerFieldValue === 'content') {
          if (lowerPropName.includes('body') || lowerPropName.includes('content') || lowerPropName.includes('description')) {
            matchedProperty = propName;
          }
        } else if (lowerFieldValue === 'gmaillink' || lowerFieldValue === 'link') {
          if (lowerPropName.includes('link') || lowerPropName.includes('url')) {
            matchedProperty = propName;
          }
        }
      });
      
      if (matchedProperty) {
        autoMappings[fieldValue] = {
          emailField: fieldValue,
          notionProperty: matchedProperty,
          notionType: properties[matchedProperty].type,
          autoDetected: true,
          detectedAt: new Date().toISOString()
        };
        console.log(`✅ Auto-detected: ${fieldValue} → ${matchedProperty}`);
      }
    });
    
    // Save auto-detected mappings
    if (Object.keys(autoMappings).length > 0) {
      const saveResult = saveG2NPropertyMappings(databaseId, autoMappings);
      
      if (!saveResult.success) {
        throw new Error(`Failed to save auto-detected mappings: ${saveResult.error}`);
      }
      
      console.log(`✅ Saved ${Object.keys(autoMappings).length} auto-detected mappings`);
      
      return buildConfirmationCard(
        '🔄 Auto-Detection Complete',
        `Successfully detected and saved ${Object.keys(autoMappings).length} property mappings:\n\n${Object.keys(autoMappings).map(field => `• ${field} → ${autoMappings[field].notionProperty}`).join('\n')}`,
        [
          {
            text: '⚙️ Review Mappings',
            functionName: 'showG2NAdvancedMapping'
          },
          {
            text: '💾 Save Email Now',
            functionName: 'quickG2NSaveEmail',
            parameters: { useSavedMappings: true }
          },
          {
            text: '← Back to Email',
            functionName: 'onG2NGmailMessage'
          }
        ]
      );
    } else {
      console.warn('⚠️ No properties could be auto-detected');
      return buildErrorCard(
        '🔄 Auto-Detection Failed',
        'Could not automatically detect property mappings.\n\nPlease manually configure the mappings.'
      );
    }
    
  } catch (error) {
    console.error('❌ Auto-detection failed:', error);
    return buildErrorCard(
      '❌ Auto-Detection Failed',
      `Failed to auto-detect property mappings: ${error.message}`
    );
  }
}

/**
 * Handle database selection
 */
function onG2NDatabaseSelected(e) {
  try {
    console.log('🎯 Database selected...');
    
    const databaseId = e.parameters.databaseId;
    
    if (!databaseId) {
      throw new Error('No database ID provided');
    }
    
    // Update config with selected database
    const config = getEnhancedG2NConfig();
    config.DATABASES.gmail.id = databaseId;
    
    // Try to get database name
    try {
      const notionService = new NotionService();
      const database = notionService.verifyG2NDatabaseAccess(databaseId);
      config.DATABASES.gmail.name = database.title[0].plain_text;
      console.log('✅ Database name updated: ' + config.DATABASES.gmail.name);
    } catch (error) {
      console.warn('⚠️ Could not fetch database name: ' + error.message);
      config.DATABASES.gmail.name = 'Selected Database';
    }
    
    // Save updated config
    saveG2NConfigToStorage(config);
    
    console.log('✅ Database updated in config: ' + databaseId);
    
    // Return to homepage
    return onG2NHomepage(e);
    
  } catch (error) {
    console.error('❌ Database selection failed: ' + error);
    const uiService = new UIService();
    return uiService.buildErrorCard(
      'Database Selection Error',
      error.message
    );
  }
}

/**
 * Quick save email function - ENHANCED CONTEXT HANDLING
 */
function quickG2NSaveEmail(e) {
  try {
    console.log('💾 Quick saving email with enhanced context handling...', {
      hasEvent: !!e,
      messageId: e?.gmail?.messageId || e?.parameters?.messageId,
      source: e?.gmail ? 'gmail_context' : (e?.parameters ? 'parameters' : 'none')
    });
    
    const config = getEnhancedG2NConfig();
    
    if (!config.DATABASES.gmail.id) {
      throw new Error('No database selected. Please configure a database first.');
    }
    
    // Enhanced context validation - pass the event object
    const emailData = getCurrentEmailData(e);
    
    if (!emailData) {
      throw new Error('Could not retrieve email data');
    }
    
    console.log('✅ Email context validated:', {
      subject: emailData.subject,
      sender: emailData.sender,
      hasBody: !!emailData.body
    });
    
    // Use unified save system - PASS THE EVENT OBJECT
    const result = unifiedSaveToNotion(e);
    
    return result;
    
  } catch (error) {
    console.error('❌ Quick save failed:', error);
    
    // Provide user-friendly error message
    const errorMessage = error.message.includes('No email message selected') || 
                        error.message.includes('No email context') ?
      '❌ ' + error.message + '\n\nPlease open an email in Gmail and click the Gmail to Notion add-on from there.' :
      '❌ Save failed: ' + error.message;
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(errorMessage))
      .build();
  }
}

/**
 * Enhanced test connection
 */
function enhancedTestG2NNotionConnection() {
  try {
    console.log('🔗 Testing Notion connection...');
    
    const notionService = new NotionService();
    const result = notionService.testConnection();
    
    if (result.success) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText('✅ Notion connection successful!'))
        .build();
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('❌ Connection test failed: ' + error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Connection failed: ' + error.message))
      .build();
  }
}

/**
 * Map email data to Notion properties using saved mappings
 */
function mapEmailToNotionProperties(emailData, mappings, databaseId) {
  const constants = getAppConstants();
  
  console.log('🗺️ Mapping email data to Notion properties...');
  console.log('Email data fields:', Object.keys(emailData));
  console.log('Available mappings:', Object.keys(mappings));
  
  const properties = {};
  
  try {
    // Apply each mapping
    Object.keys(mappings).forEach(notionProperty => {
      const mapping = mappings[notionProperty];
      const emailField = mapping.emailField;
      const notionType = mapping.notionType;
      
      console.log(`🔧 Mapping: ${emailField} -> ${notionProperty} (${notionType})`);
      
      if (emailData[emailField] !== undefined && emailData[emailField] !== null) {
        const value = emailData[emailField];
        
        switch (notionType) {
          case 'title':
            properties[notionProperty] = {
              title: [
                {
                  text: {
                    content: String(value || 'No Subject')
                  }
                }
              ]
            };
            break;
            
          case 'rich_text':
            properties[notionProperty] = {
              rich_text: [
                {
                  text: {
                    content: String(value || '').substring(0, 2000) // Notion limit
                  }
                }
              ]
            };
            break;
            
          case 'email':
            properties[notionProperty] = {
              email: String(value || '')
            };
            break;
            
          case 'date':
            let dateValue;
            try {
              if (value instanceof Date) {
                dateValue = value.toISOString();
              } else if (typeof value === 'string') {
                dateValue = new Date(value).toISOString();
              } else {
                dateValue = new Date().toISOString();
              }
            } catch (dateError) {
              dateValue = new Date().toISOString();
            }
            
            properties[notionProperty] = {
              date: {
                start: dateValue
              }
            };
            break;
            
          case 'url':
            properties[notionProperty] = {
              url: String(value || '')
            };
            break;
            
          default:
            console.warn(`⚠️ Unsupported property type: ${notionType} for ${notionProperty}`);
            // Fallback to rich_text
            properties[notionProperty] = {
              rich_text: [
                {
                  text: {
                    content: String(value || '')
                  }
                }
              ]
            };
        }
        
        console.log(`✅ Mapped ${emailField} to ${notionProperty}`);
      } else {
        console.warn(`⚠️ Email field not found: ${emailField}`);
      }
    });
    
    console.log('🎯 Final properties to save:', Object.keys(properties));
    return properties;
    
  } catch (error) {
    console.error('💥 Error mapping properties:', error);
    throw new Error('Failed to map email data to Notion properties: ' + error.message);
  }
}

// =============================================================================
// EMAIL DATA FUNCTIONS - ADD TO Main.gs
// =============================================================================

/**
 * Select database and auto-configure with Gmail defaults
 */
function selectAndConfigureG2NDatabase(e) {
  try {
    const databaseId = e.parameters.databaseId;
    const databaseName = e.parameters.databaseName;
    
    console.log('⚙️ Selecting and configuring database:', databaseName);
    
    // Auto-configure with Gmail defaults
    const result = autoConfigureGmailDatabase(databaseId, databaseName);
    
    if (result.success) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText('✅ Database configured with Gmail defaults!'))
        .setNavigation(CardService.newNavigation()
          .popToRoot()
          .updateCard(onG2NHomepage()))
        .build();
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('Database selection failed:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Failed to configure database: ' + error.message))
      .build();
  }
}

/**
 * Get current email data for saving to Notion - ULTRA ROBUST VERSION
 
function getCurrentEmailData(e) {
  try {
    console.log('📧 getCurrentEmailData called with:', {
      hasEvent: !!e,
      messageId: e?.gmail?.messageId,
      hasParameters: !!(e?.parameters)
    });
    
    // Try multiple methods to get email data
    let emailData = null;
    
    // Method 1: Use GmailService class directly
    try {
      const gmailService = new GmailService();
      emailData = gmailService.getSelectedEmailWithRecovery(e);
      console.log('✅ Method 1 (GmailService class) succeeded');
    } catch (error1) {
      console.warn('❌ Method 1 failed:', error1.message);
      
      // Method 2: Use global function
      try {
        emailData = getSelectedEmailWithRecovery(e);
        console.log('✅ Method 2 (global function) succeeded');
      } catch (error2) {
        console.warn('❌ Method 2 failed:', error2.message);
        
        // Method 3: Use EmailService class as fallback
        try {
          const emailService = new EmailService();
          emailData = emailService.getSelectedEmailWithRecovery(e);
          console.log('✅ Method 3 (EmailService class) succeeded');
        } catch (error3) {
          console.error('❌ All methods failed:', error3.message);
          throw new Error('Cannot retrieve email data: ' + error3.message);
        }
      }
    }
    
    if (!emailData) {
      throw new Error('No email data retrieved');
    }
    
    console.log('✅ Email data retrieved successfully');
    return emailData;
    
  } catch (error) {
    console.error('❌ getCurrentEmailData completely failed:', error);
    throw error;
  }
}
*/

// In Main.gs - Replace getCurrentEmailData with this fixed version
/**
 * Get current email data for saving to Notion - FIXED VERSION
 */
function getCurrentEmailData(e) {
  console.log('📧 getCurrentEmailData called');
  
  try {
    // Check if we have Gmail context
    if (!e.gmail || !e.gmail.messageId) {
      console.error('❌ No Gmail context found in event');
      console.log('Event structure:', Object.keys(e));
      
      // Try to get active Gmail message
      const gmailService = new GmailService();
      const activeMessage = gmailService.getActiveMessage();
      
      if (activeMessage) {
        console.log('✅ Got active message via GmailService');
        return activeMessage;
      }
      
      throw new Error('No Gmail message available. Please open an email and try again.');
    }
    
    const messageId = e.gmail.messageId;
    console.log('📧 Message ID:', messageId);
    
    // Use GmailService to get the email
    const gmailService = new GmailService();
    const emailData = gmailService.getGmailMessage(messageId);
    
    if (!emailData || !emailData.id) {
      console.error('❌ GmailService returned invalid data');
      throw new Error('Failed to retrieve email data from Gmail');
    }
    
    console.log('✅ Email data retrieved successfully:', {
      id: emailData.id,
      subject: emailData.subject || '(No subject)',
      from: emailData.sender || '(Unknown sender)',
      hasBody: !!emailData.body,
      attachments: emailData.attachments ? emailData.attachments.length : 0
    });
    
    return emailData;
    
  } catch (error) {
    console.error('❌ getCurrentEmailData failed:', error);
    
    // Don't use fallback data - inform the user
    throw new Error(`Failed to get email data: ${error.message}\n\nPlease make sure you have an email open and try again.`);
  }
}
/**
 * Get GmailService instance - FIXED VERSION
 */
function getGmailService() {
  try {
    // Use the actual GmailService class from GmailService.gs
    return new GmailService();
  } catch (error) {
    console.error('❌ GmailService initialization failed:', error);
    throw new Error('GmailService not available: ' + error.message);
  }
}

/**
 * UNIFIED Save to Notion - Uses mappings if available, otherwise smart defaults - FIXED
 */
function unifiedSaveToNotion(e) {
  const constants = getAppConstants();
  const startTime = g2nStartTimer();
  let hadError = false;
  
  g2nFunctionEntry('unifiedSaveToNotion', {
    hasEvent: !!e,
    messageId: e?.gmail?.messageId || e?.parameters?.messageId
  });
  
  try {
    g2nInfo(constants.LOGGING.SOURCES.MAIN, constants.UI.ICONS.SAVE + ' Unified Save to Notion...');
    
    // Get current config and mappings
    const config = getEnhancedG2NConfig();
    const databaseId = config.DATABASES.gmail.id;
    const mappings = config.PROPERTY_MAPPINGS && config.PROPERTY_MAPPINGS.mappings && config.PROPERTY_MAPPINGS.mappings[databaseId];
    
    // Get email data - PASS THE EVENT OBJECT
    const emailData = getCurrentEmailData(e);
    
    if (!emailData) {
      throw new Error('Could not retrieve email data');
    }
    
    let notionProperties;
    let saveMethod;
    
    // Check if mappings exist and are valid
    if (mappings && Object.keys(mappings).length > 0) {
      g2nInfo(constants.LOGGING.SOURCES.MAIN, 'Using saved property mappings', {
        mappingCount: Object.keys(mappings).length,
        database: config.DATABASES.gmail.name
      });
      
      notionProperties = mapEmailToNotionProperties(emailData, mappings, databaseId);
      saveMethod = 'with_mappings';
      
    } else {
      // Use smart defaults if no mappings
      g2nInfo(constants.LOGGING.SOURCES.MAIN, 'No mappings found, using smart defaults');
      notionProperties = getSmartDefaultProperties(emailData);
      saveMethod = 'with_defaults';
    }
    
    g2nInfo(constants.LOGGING.SOURCES.MAIN, 'Properties for save', {
      method: saveMethod,
      properties: Object.keys(notionProperties),
      propertyCount: Object.keys(notionProperties).length
    });
    
    // Create the Notion page
    const notionService = new NotionService();
    const result = notionService.createPageInDatabase(databaseId, notionProperties);
    
    g2nInfo(constants.LOGGING.SOURCES.MAIN, 'Email saved successfully', {
      pageId: result.id,
      url: result.url,
      method: saveMethod,
      propertiesUsed: Object.keys(notionProperties)
    });
    
    // Show appropriate success message
    const notificationText = saveMethod === 'with_mappings' 
      ? constants.UI.ICONS.SUCCESS + ' ' + constants.UI.MESSAGES.SAVE_SUCCESS 
      : constants.UI.ICONS.SUCCESS + ' Email saved with default mapping!';
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(notificationText))
      .build();
      
  } catch (error) {
    hadError = true;
    g2nError(constants.LOGGING.SOURCES.MAIN, 'Error in unified save', { 
      error: error.message
    });
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(constants.UI.ICONS.ERROR + ' ' + constants.UI.MESSAGES.SAVE_FAILED + ': ' + error.message))
      .build();
  } finally {
    g2nFunctionExit('unifiedSaveToNotion', { success: !hadError }, startTime);
  }
}

/**
 * Refresh database info
 */
function refreshDatabaseInfo() {
  try {
    console.log('🔄 Refreshing database info...');
    
    const notionService = new NotionService();
    notionService.clearDatabaseCache();
    
    const config = getEnhancedG2NConfig();
    
    if (config.DATABASES.gmail.id) {
      try {
        const database = notionService.verifyG2NDatabaseAccess(config.DATABASES.gmail.id);
        config.DATABASES.gmail.name = database.title[0].plain_text;
        console.log('✅ Refreshed Gmail database name: ' + config.DATABASES.gmail.name);
      } catch (error) {
        console.warn('⚠️ Could not refresh Gmail database: ' + error.message);
      }
    }
    
    if (config.DATABASES.resources.id) {
      try {
        const database = notionService.verifyG2NDatabaseAccess(config.DATABASES.resources.id);
        config.DATABASES.resources.name = database.title[0].plain_text;
        console.log('✅ Refreshed Resources database name: ' + config.DATABASES.resources.name);
      } catch (error) {
        console.warn('⚠️ Could not refresh Resources database: ' + error.message);
      }
    }
    
    saveG2NConfigToStorage(config);
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Database info refreshed!'))
      .setNavigation(CardService.newNavigation()
        .updateCard(showG2NSettings()))
      .build();
    
  } catch (error) {
    console.error('❌ Refresh failed: ' + error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Refresh failed: ' + error.message))
      .build();
  }
}

/**
 * Enhanced database selection with persistence - FIXED VERSION
 */
function selectG2NDatabase(e) {
  const startTime = g2nStartTimer();
  let hadError = false;
  
  g2nFunctionEntry('selectG2NDatabase', {
    databaseId: e.parameters.databaseId,
    databaseName: e.parameters.databaseName,
    databaseType: e.parameters.databaseType || 'gmail'
  });
  
  try {
    const databaseId = e.parameters.databaseId;
    const suggestedName = e.parameters.databaseName;
    const databaseType = e.parameters.databaseType || 'gmail';
    
    if (!databaseId) {
      throw new Error('Database ID is required');
    }
    
    console.log('🎯 Setting database with verification:', { databaseId, suggestedName, databaseType });
    
    // Get the ACTUAL database name from Notion API
    let actualName = suggestedName;
    try {
      const notionService = new NotionService();
      const database = notionService.verifyG2NDatabaseAccess(databaseId);
      actualName = database.title[0]?.plain_text || suggestedName || 'Unknown Database';
      console.log('🔍 Verified database name:', { suggestedName, actualName });
    } catch (error) {
      console.warn('⚠️ Could not verify database name, using suggested name:', error.message);
      actualName = suggestedName || 'Unknown Database';
    }
    
    // Get current config
    const config = getEnhancedG2NConfig();
    
    // Update the config with VERIFIED name
    if (databaseType === 'gmail') {
      config.DATABASES.gmail.id = databaseId;
      config.DATABASES.gmail.name = actualName;
      config.DATABASES.gmail.lastVerified = new Date().toISOString();
      
      console.log('✅ Updated Gmail database with verified name:', {
        id: config.DATABASES.gmail.id,
        name: config.DATABASES.gmail.name
      });
    }
    
    // CRITICAL: Force save to BOTH cache AND Script Properties
    const saveResult = saveG2NConfigToStorage(config);
    
    if (!saveResult.success) {
      throw new Error(`Failed to save database selection: ${saveResult.error}`);
    }
    
    // Clear cache to ensure fresh data
    clearG2NCache();
    
    g2nInfo('DatabaseSelection', 'Database selection completed with persistence', {
      databaseId: databaseId,
      actualName: actualName,
      savedToScriptProperties: saveResult.scriptPropertiesSaved
    });
    
    // Return to homepage with forced refresh
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`✅ Database set to: ${actualName}`))
      .setNavigation(CardService.newNavigation()
        .popToRoot()
        .updateCard(onG2NHomepage()))
      .build();
    
  } catch (error) {
    hadError = true;
    g2nError('DatabaseSelection', 'Database selection failed', {
      error: error.message,
      parameters: e.parameters
    });
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`❌ Failed to set database: ${error.message}`))
      .build();
  } finally {
    g2nFunctionExit('selectG2NDatabase', { success: !hadError }, startTime);
  }
}

/**
 * Handle change database request
 */
function onChangeDatabaseRequest() {
  try {
    console.log('🔄 Changing database...');
    return showG2NDatabaseSelection();
  } catch (error) {
    console.error('❌ Database change failed: ' + error);
    const uiService = new UIService();
    return uiService.buildErrorCard(
      'Navigation Error',
      error.message
    );
  }
}

/**
 * Save property mappings AND update database selection - FIXED VERSION
 */
function saveG2NPropertyMappingsAction(e) {
  const startTime = g2nStartTimer();
  let hadError = false;
  
  g2nFunctionEntry('saveG2NPropertyMappingsAction', {
    hasFormInputs: !!(e && e.formInput),
    parameters: e.parameters
  });
  
  try {
    const constants = getAppConstants();
    const formInputs = e.formInput;
    const databaseId = e.parameters.databaseId;
    
    if (!databaseId) {
      throw new Error('Database ID is required');
    }
    
    if (!formInputs || Object.keys(formInputs).length === 0) {
      throw new Error('No property mapping selections received');
    }
    
    console.log('🎯 SAVING MAPPINGS FOR DATABASE:', databaseId);
    
    // CRITICAL FIX: Also update the main database selection
    const config = getEnhancedG2NConfig();
    if (config.DATABASES.gmail.id !== databaseId) {
      console.log('🔄 UPDATING MAIN DATABASE SELECTION:', {
        from: config.DATABASES.gmail.id,
        to: databaseId
      });
      
      // Get the actual database name
      const notionService = new NotionService();
      const database = notionService.verifyG2NDatabaseAccess(databaseId);
      const actualName = database.title[0]?.plain_text || 'Unknown Database';
      
      // Update main selection
      config.DATABASES.gmail.id = databaseId;
      config.DATABASES.gmail.name = actualName;
      config.DATABASES.gmail.lastVerified = new Date().toISOString();
      
      // Save the updated config
      saveG2NConfigToStorage(config);
      console.log('✅ UPDATED MAIN DATABASE TO:', actualName);
    }
    
    // Get database properties
    const database = notionService.verifyG2NDatabaseAccess(databaseId);
    const databaseProperties = database.properties || {};
    
    // Save property mappings
    const propertyMapper = new PropertyMapper();
    const saveResult = propertyMapper.savePropertyMappings(databaseId, formInputs, databaseProperties);
    
    if (!saveResult.success) {
      throw new Error(saveResult.error);
    }
    
    g2nInfo('PropertyMappings', 'Property mappings saved successfully', {
      databaseId: databaseId,
      databaseName: config.DATABASES.gmail.name,
      mappingCount: Object.keys(formInputs).length
    });
    
    // Return success response
    const cardService = CardService;
    return cardService.newActionResponseBuilder()
      .setNotification(cardService.newNotification()
        .setText(`✅ Property mappings saved for ${config.DATABASES.gmail.name}!`))
      .setNavigation(cardService.newNavigation()
        .popToRoot()
        .updateCard(onG2NHomepage()))
      .build();
      
  } catch (error) {
    hadError = true;
    g2nError('PropertyMappings', 'Failed to save property mappings', {
      error: error.message,
      parameters: e.parameters,
      duration: new Date().getTime() - startTime
    });
    
    const constants = getAppConstants();
    const cardService = CardService;
    return cardService.newActionResponseBuilder()
      .setNotification(cardService.newNotification()
        .setText(`${constants.UI.ICONS.ERROR} Failed to save mappings: ${error.message}`))
      .build();
  } finally {
    g2nFunctionExit('saveG2NPropertyMappingsAction', { success: !hadError }, startTime);
  }
}


// =============================================================================
// UNIFIED SAVE SYSTEM - REPLACES ALL SAVE FUNCTIONS
// =============================================================================

/**
 * UNIFIED Save to Notion - Uses mappings if available, otherwise smart defaults
 */
// In Main.gs or wherever unifiedSaveToNotion is defined:
/**
 * Unified save function that uses saved property mappings
 */
function unifiedSaveToNotion(e, useSavedMappings = true) {
  console.log('💾 Unified save to Notion...');
  
  try {
    // 1. Get email data
    const emailData = getCurrentEmailData(e);
    
    if (!emailData || emailData.isFallback) {
      console.warn('⚠️ Using fallback email data');
    }
    
    // 2. Get configuration
    const config = getEnhancedG2NConfig();
    
    if (!config.DATABASES.gmail.id) {
      throw new Error('No database selected. Please select a database first.');
    }
    
    const databaseId = config.DATABASES.gmail.id;
    
    // 3. Get property mappings
    let propertyMappings = {};
    if (useSavedMappings) {
      propertyMappings = getOrCreatePropertyMappings(databaseId, emailData);
      console.log(`📋 Using ${Object.keys(propertyMappings).length} saved property mappings`);
    } else {
      // Use default mappings
      propertyMappings = createDefaultMappings(databaseId, emailData);
    }
    
    // 4. Create Notion page
    const notionService = new NotionService();
    const saveResult = notionService.createNotionPageFromEmail(
      databaseId,
      emailData,
      propertyMappings
    );
    
    if (!saveResult.success) {
      throw new Error(`Failed to save to Notion: ${saveResult.error}`);
    }
    
    console.log('✅ Successfully saved email to Notion:', saveResult.pageId);
    
    // 5. Return success response
    return buildSuccessCard(
      '✅ Email Saved to Notion',
      `Successfully saved "${emailData.subject}" to Notion.`,
      [
        {
          text: '🔗 Open in Notion',
          url: `https://www.notion.so/${saveResult.pageId.replace(/-/g, '')}`
        },
        {
          text: '📧 Save Another Email',
          functionName: 'onG2NGmailMessage'
        }
      ]
    );
    
  } catch (error) {
    console.error('❌ Failed to save email:', error);
    return buildErrorCard(
      '❌ Save Failed',
      `Failed to save email: ${error.message}`
    );
  }
}

/**
 * Quick save email using saved property mappings
 */
function quickG2NSaveEmail(e, parameters = {}) {
  console.log('💾 Quick save email...');
  
  try {
    // Get email data
    const emailData = getCurrentEmailData(e);
    
    if (!emailData) {
      throw new Error('Could not retrieve email data');
    }
    
    console.log(`📧 Email subject: ${emailData.subject || '(No subject)'}`);
    
    // Get configuration
    const config = getEnhancedG2NConfig();
    
    if (!config.DATABASES.gmail.id) {
      throw new Error('No database selected. Please select a database first.');
    }
    
    const databaseId = config.DATABASES.gmail.id;
    const databaseName = config.DATABASES.gmail.name || 'Selected Database';
    
    console.log(`🗄️ Saving to database: ${databaseName} (${databaseId.substring(0, 8)}...)`);
    
    // Get or create property mappings
    const propertyMappings = getOrCreatePropertyMappings(databaseId, emailData);
    
    if (Object.keys(propertyMappings).filter(k => k !== '_metadata').length === 0) {
      console.warn('⚠️ No property mappings found, using default mappings');
      // Use default mappings
      const constants = getAppConstants();
      propertyMappings.subject = {
        notionProperty: 'Name',
        notionType: 'title',
        emailField: 'subject',
        isDefault: true
      };
    }
    
    console.log(`📋 Using ${Object.keys(propertyMappings).filter(k => k !== '_metadata').length} property mappings`);
    
    // Save to Notion
    const notionService = new NotionService();
    const saveResult = notionService.createNotionPageFromEmail(
      databaseId,
      emailData,
      propertyMappings
    );
    
    if (!saveResult.success) {
      throw new Error(`Failed to save to Notion: ${saveResult.error || 'Unknown error'}`);
    }
    
    console.log('✅ Successfully saved email to Notion:', {
      pageId: saveResult.pageId,
      url: saveResult.url,
      title: saveResult.title
    });
    
    // Build success response
    return buildConfirmationCard(
      '✅ Email Saved Successfully',
      `"${emailData.subject || 'Email'}" has been saved to **${databaseName}**.\n\nYour property mappings have been preserved for future saves.`,
      [
        {
          text: '🔗 Open in Notion',
          url: saveResult.url || `https://www.notion.so/${saveResult.pageId?.replace(/-/g, '')}`
        },
        {
          text: '⚙️ Configure Mappings',
          functionName: 'showG2NAdvancedMapping'
        },
        {
          text: '📧 Save Another',
          functionName: 'onG2NGmailMessage'
        }
      ]
    );
    
  } catch (error) {
    console.error('❌ Quick save failed:', error);
    return buildErrorCard(
      '❌ Save Failed',
      `Failed to save email: ${error.message}\n\nPlease check:\n1. You have an email open\n2. Property mappings are configured\n3. Notion database is accessible`
    );
  }
}
/**
 * Smart default properties that auto-detect available database properties
 */
function getSmartDefaultProperties(emailData) {
  const constants = getAppConstants();
  
  try {
    g2nInfo(constants.LOGGING.SOURCES.MAIN, 'Creating smart default properties with auto-detection');
    
    const config = getEnhancedG2NConfig();
    const databaseId = config.DATABASES.gmail.id;
    
    // Get actual database properties
    const notionService = new NotionService();
    const database = notionService.verifyG2NDatabaseAccess(databaseId);
    const databaseProperties = database.properties || {};
    
    console.log('🔍 Available database properties:', Object.keys(databaseProperties));
    
    const properties = {};
    
    // AUTO-DETECT BEST PROPERTIES
    
    // 1. Find title property (most important)
    const titleProperty = findBestPropertyForField(databaseProperties, 'title', ['name', 'title', 'subject', 'email']);
    if (titleProperty) {
      properties[titleProperty] = {
        title: [
          {
            text: {
              content: emailData.subject || 'No Subject'
            }
          }
        ]
      };
      console.log('✅ Using title property:', titleProperty);
    } else {
      // Fallback: use first title property found
      const firstTitleProp = Object.keys(databaseProperties).find(prop => 
        databaseProperties[prop].type === 'title'
      );
      if (firstTitleProp) {
        properties[firstTitleProp] = {
          title: [
            {
              text: {
                content: emailData.subject || 'No Subject'
              }
            }
          ]
        };
        console.log('✅ Using first title property:', firstTitleProp);
      }
    }
    
    // 2. Find description/body property
    const descProperty = findBestPropertyForField(databaseProperties, 'rich_text', 
      ['description', 'body', 'content', 'email body', 'message']);
    if (descProperty && emailData.body) {
      properties[descProperty] = {
        rich_text: [
          {
            text: {
              content: emailData.body.substring(0, 2000) // Limit length
            }
          }
        ]
      };
      console.log('✅ Using description property:', descProperty);
    }
    
    // 3. Find sender/from property
    const senderProperty = findBestPropertyForField(databaseProperties, ['rich_text', 'email'], 
      ['from', 'sender', 'email', 'author']);
    if (senderProperty && emailData.from) {
      if (databaseProperties[senderProperty].type === 'email') {
        properties[senderProperty] = {
          email: emailData.from
        };
      } else {
        properties[senderProperty] = {
          rich_text: [
            {
              text: {
                content: emailData.from
              }
            }
          ]
        };
      }
      console.log('✅ Using sender property:', senderProperty);
    }
    
    // 4. Find date property
    const dateProperty = findBestPropertyForField(databaseProperties, 'date', 
      ['date', 'created', 'sent', 'received']);
    if (dateProperty && emailData.dateSent) {
      properties[dateProperty] = {
        date: {
          start: emailData.dateSent.toISOString()
        }
      };
      console.log('✅ Using date property:', dateProperty);
    }
    
    // If no properties were mapped, create at least the title
    if (Object.keys(properties).length === 0) {
      const firstProp = Object.keys(databaseProperties)[0];
      if (firstProp) {
        const propType = databaseProperties[firstProp].type;
        if (propType === 'title') {
          properties[firstProp] = {
            title: [
              {
                text: {
                  content: emailData.subject || 'Email from Gmail'
                }
              }
            ]
          };
        } else {
          properties[firstProp] = {
            rich_text: [
              {
                text: {
                  content: emailData.subject || 'Email from Gmail'
                }
              }
            ]
          };
        }
        console.log('⚠️ Using fallback property:', firstProp);
      }
    }
    
    console.log('🎯 Final auto-detected properties:', Object.keys(properties));
    return properties;
    
  } catch (error) {
    g2nError(constants.LOGGING.SOURCES.MAIN, 'Error in smart property detection', { error: error.message });
    
    // Ultra fallback - just use subject as title
    return {
      'Name': {
        title: [
          {
            text: {
              content: emailData.subject || 'Email from Gmail'
            }
          }
        ]
      }
    };
  }
}
/**
 * Helper: Find the best property for a field based on name and type
 */
function findBestPropertyForField(databaseProperties, allowedTypes, keywords) {
  const props = Object.keys(databaseProperties);
  const allowedTypesArray = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
  
  // Convert keywords to lowercase for matching
  const lowerKeywords = keywords.map(k => k.toLowerCase());
  
  // First pass: exact keyword matches
  for (const propName of props) {
    const prop = databaseProperties[propName];
    const propNameLower = propName.toLowerCase();
    
    if (!allowedTypesArray.includes(prop.type)) continue;
    
    for (const keyword of lowerKeywords) {
      if (propNameLower === keyword || propNameLower.includes(keyword)) {
        console.log(`🎯 Exact match: ${propName} for keywords ${keywords}`);
        return propName;
      }
    }
  }
  
  // Second pass: partial matches
  for (const propName of props) {
    const prop = databaseProperties[propName];
    const propNameLower = propName.toLowerCase();
    
    if (!allowedTypesArray.includes(prop.type)) continue;
    
    for (const keyword of lowerKeywords) {
      if (propNameLower.includes(keyword)) {
        console.log(`🎯 Partial match: ${propName} for keywords ${keywords}`);
        return propName;
      }
    }
  }
  
  // Third pass: first property of allowed type
  for (const propName of props) {
    const prop = databaseProperties[propName];
    if (allowedTypesArray.includes(prop.type)) {
      console.log(`🎯 First available: ${propName} for types ${allowedTypes}`);
      return propName;
    }
  }
  
  console.log(`❌ No property found for types ${allowedTypes} with keywords ${keywords}`);
  return null;
}

// =============================================================================
// ACTION HANDLERS AND NAVIGATION
// =============================================================================

/**
 * Safe function router with validation
 */
function safeFunctionCall(functionName, e) {
  const constants = getAppConstants();
  
  try {
    const validFunctions = Object.values(constants.FUNCTION_NAMES);
    
    // Check if this is a valid function
    if (validFunctions.includes(functionName) && typeof this[functionName] === 'function') {
      g2nInfo(constants.LOGGING.SOURCES.MAIN, 'Calling valid function: ' + functionName);
      return this[functionName](e);
    } else {
      // Invalid function - log and redirect to homepage
      g2nWarn(constants.LOGGING.SOURCES.MAIN, 'Invalid function call intercepted: ' + functionName);
      return onG2NHomepage(e);
    }
    
  } catch (error) {
    g2nError(constants.LOGGING.SOURCES.MAIN, 'Function call failed: ' + functionName, { error: error.message });
    return onG2NHomepage(e);
  }
}

/**
 * BULLETPROOF Universal Action Handler - FIXED VERSION
 */
function onG2NUniversalAction(e) {
  const constants = getAppConstants();
  
  try {
    console.log(constants.UI.ICONS.SECURITY + ' Universal action received:', {
      universalAction: (e && e.universalAction) || 'none',
      hasMessage: !!(e && e.messageMetadata && e.messageMetadata.messageId)
    });

    // CRITICAL: Intercept any universalAction that looks like a Notion URL or email content
    if (e && e.universalAction) {
      const action = String(e.universalAction);
      
      // If it contains a Notion URL or looks like email content, treat as message context
      if (action.includes('notion.so') || action.includes('Notion Page:') || action.length > 50) {
        console.log(constants.UI.ICONS.SECURITY + ' Intercepted email content/Notion URL - showing email preview');
        
        // If we have a message context, show the email preview
        if (e && e.messageMetadata && e.messageMetadata.messageId) {
          const uiService = new UIService();
          return uiService.buildMessageContextCard(e.messageMetadata.messageId);
        }
        
        // Otherwise show homepage
        return onG2NHomepage(e);
      }
    }

    // Default behavior: show email preview if we have message context
    if (e && e.messageMetadata && e.messageMetadata.messageId) {
      const uiService = new UIService();
      return uiService.buildMessageContextCard(e.messageMetadata.messageId);
    }
    
    // Final fallback
    return onG2NHomepage(e);
    
  } catch (error) {
    console.error('Universal action failed:', error);
    return onG2NHomepage(e);
  }
}

/**
 * Main email preview - WITH DEBUGGING

function onG2NGmailMessage(e) {
  const constants = getAppConstants();
  
  try {
    console.log(constants.UI.ICONS.EMAIL + ' ACTUAL ADD-ON CONTEXT RECEIVED');
    
    // First, debug the actual context we receive
    const debugResult = debugActualAddOnContext(e);
    
    if (!debugResult.success) {
      console.error('❌ Add-on context issue:', debugResult.error);
    }
    
    // Continue with normal flow
    const config = getEnhancedG2NConfig();
    console.log(constants.UI.ICONS.DATABASE + ' Using database: ' + config.DATABASES.gmail.name);
    
    return buildPreviewCard(e);
    
  } catch (error) {
    console.error(constants.UI.ICONS.ERROR + ' Email preview failed:', error);
    const uiService = new UIService();
    return uiService.buildErrorCard('Preview Error', error.message);
  }
}
 */
/**
 * Main email preview - WITH PROPER DEBUG CONTEXT TEMP?
 */
// =============================================================================
// CONTEXT DEBUG  CONTEXT DEBUG - AJH
// =============================================================================
function onG2NGmailMessage(e) {
  const constants = getAppConstants();
  
  try {
    console.log('📧 ACTUAL GMAIL ADD-ON CONTEXT RECEIVED:', {
      hasEvent: !!e,
      eventType: e ? Object.keys(e) : 'none',
      hasGmail: !!(e?.gmail),
      gmailKeys: e?.gmail ? Object.keys(e.gmail) : 'none',
      messageId: e?.gmail?.messageId,
      threadId: e?.gmail?.threadId,
      hasParameters: !!(e?.parameters),
      parameterKeys: e?.parameters ? Object.keys(e.parameters) : 'none'
    });
    
    // If we don't have Gmail context, show an error card
    if (!e || !e.gmail || !e.gmail.messageId) {
      console.error('❌ NO GMAIL CONTEXT IN ADD-ON');
      return buildNoContextErrorCard(e);
    }
    
    console.log('✅ Gmail context validated - message ID:', e.gmail.messageId);
    
    // Test if we can actually get the email data
    try {
      const gmailService = new GmailService();
      const emailData = gmailService.getSelectedEmailWithRecovery(e);
      console.log('✅ Email data retrieval successful:', {
        subject: emailData.subject,
        sender: emailData.sender
      });
    } catch (emailError) {
      console.error('❌ Email data retrieval failed:', emailError);
      return buildErrorCard('Email Access Error', emailError.message);
    }
    
    // Continue with normal flow
    const config = getEnhancedG2NConfig();
    console.log('🗄️ Using database: ' + config.DATABASES.gmail.name);
    
    return buildPreviewCard(e);
    
  } catch (error) {
    console.error('💥 Email preview failed:', error);
    return buildErrorCard('Preview Error', error.message);
  }
}

/**
 * Build error card for missing context
 */
function buildNoContextErrorCard(e) {
  console.log('🛠️ Building no-context error card');
  
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('❌ Gmail Context Missing'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('The add-on cannot access the current email context.'))
      .addWidget(CardService.newTextParagraph()
        .setText('This usually happens when:'))
      .addWidget(CardService.newTextParagraph()
        .setText('• The add-on is opened from the Gmail sidebar (not from within an email)'))
      .addWidget(CardService.newTextParagraph()
        .setText('• There are Gmail permission issues'))
      .addWidget(CardService.newTextParagraph()
        .setText('• The email is no longer accessible'))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('🔄 Reload Add-on')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onG2NGmailMessage')))
        .addButton(CardService.newTextButton()
          .setText('⚙️ Settings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showG2NSettings')))))
    .build();
}

/**
 * Simple error card builder
 */
function buildErrorCard(title, message) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('❌ ' + title))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(message))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('🔄 Try Again')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onG2NGmailMessage')))
        .addButton(CardService.newTextButton()
          .setText('🏠 Home')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onG2NHomepage')))))
    .build();
}
// =============================================================================
// CONTEXT DEBUG CONTEXT DEBUG - AJH
// =============================================================================
/**
 * Builds the main preview card - FIXED VERSION
 */
function buildPreviewCard(e) {
  console.log('📧 Building preview card with event...');
  
  try {
    let targetDatabaseId = (e && e.parameters && e.parameters.databaseId) ? e.parameters.databaseId : null;
    
    if (targetDatabaseId) {
      console.log('🎯 Using database from parameters: ' + targetDatabaseId);
      // This function doesn't exist - remove or implement it
      // updateConfigWithDatabase(targetDatabaseId);
    }

    // Get email data USING THE EVENT
    let email = null;
    try {
      const gmailService = getGmailService();
      email = gmailService.getSelectedEmailWithRecovery(e); // Pass the event
    } catch (emailError) {
      console.error('❌ Failed to fetch email: ' + emailError);
      // Create fallback email data directly
      email = {
        subject: (e && e.gmail && e.gmail.subject) ? e.gmail.subject : 'No Subject',
        sender: (e && e.gmail && e.gmail.from) ? e.gmail.from : 'Unknown Sender',
        dateSent: new Date(),
        body: 'Content unavailable',
        id: (e && e.gmail && e.gmail.messageId) ? e.gmail.messageId : 'unknown',
        threadId: (e && e.gmail && e.gmail.threadId) ? e.gmail.threadId : 'unknown'
      };
    }
    
    if (!email) {
      // Build auth error card directly
      return CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
          .setTitle('🔐 Authentication Required'))
        .addSection(CardService.newCardSection()
          .addWidget(CardService.newTextParagraph()
            .setText('Unable to access your Gmail account. Please check permissions.'))
          .addWidget(CardService.newButtonSet()
            .addButton(CardService.newTextButton()
              .setText('🔄 Reload')
              .setOnClickAction(CardService.newAction()
                .setFunctionName('onG2NGmailMessage')))
            .addButton(CardService.newTextButton()
              .setText('⚙️ Settings')
              .setOnClickAction(CardService.newAction()
                .setFunctionName('showG2NSettings')))))
        .build();
    }

    // Get fresh configuration
    const config = getEnhancedG2NConfig();
    
    console.log('🎯 FINAL DATABASE IN CONFIG:', {
      id: config.DATABASES.gmail.id,
      name: config.DATABASES.gmail.name,
      fromParameters: !!targetDatabaseId
    });

    // Get databases
    let databases = [];
    try {
      const notionService = new NotionService();
      databases = notionService.fetchG2NDatabasesWithCache();
      console.log('✅ Found ' + databases.length + ' databases');
    } catch (dbError) {
      console.error('❌ Failed to fetch databases: ' + dbError);
      // Get configured databases as fallback
      databases = [];
      if (config.DATABASES.gmail.id) {
        databases.push({ 
          name: config.DATABASES.gmail.name || 'Gmail Database', 
          id: config.DATABASES.gmail.id 
        });
      }
      if (config.DATABASES.resources.id) {
        databases.push({ 
          name: config.DATABASES.resources.name || 'Resources Database', 
          id: config.DATABASES.resources.id 
        });
      }
    }
    
    if (databases.length === 0) {
      // Build database error card directly
      return CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
          .setTitle('🗄️ Database Access Required'))
        .addSection(CardService.newCardSection()
          .addWidget(CardService.newTextParagraph()
            .setText('No databases available. Please check your Notion configuration.'))
          .addWidget(CardService.newButtonSet()
            .addButton(CardService.newTextButton()
              .setText('⚙️ Configure Settings')
              .setOnClickAction(CardService.newAction()
                .setFunctionName('showG2NSettings')))
            .addButton(CardService.newTextButton()
              .setText('🗄️ Select Database')
              .setOnClickAction(CardService.newAction()
                .setFunctionName('showG2NDatabaseSelection')))))
        .build();
    }
    
    // Build the card
    const card = CardService.newCardBuilder();
    
    // Add email preview section (simplified)
    const emailSection = CardService.newCardSection()
      .setHeader('📧 Email Preview');
    
    emailSection.addWidget(CardService.newTextParagraph()
      .setText('**Subject:** ' + (email.subject || 'No Subject')));
    
    emailSection.addWidget(CardService.newTextParagraph()
      .setText('**From:** ' + (email.sender || 'Unknown Sender')));
    
    if (email.body && email.body.length > 0) {
      const preview = email.body.length > 200 ? email.body.substring(0, 200) + '...' : email.body;
      emailSection.addWidget(CardService.newTextParagraph()
        .setText('**Preview:** ' + preview));
    }
    
    card.addSection(emailSection);
    
    // Add database selection section (simplified)
    const dbSection = CardService.newCardSection()
      .setHeader('🗄️ Current Database');
    
    dbSection.addWidget(CardService.newTextParagraph()
      .setText('**Database:** ' + config.DATABASES.gmail.name));
    
    dbSection.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('Change Database')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('showG2NDatabaseSelection'))));
    
    card.addSection(dbSection);
    
    // Add save options section
    const saveSection = CardService.newCardSection()
      .setHeader('💾 Save Options');
    
    saveSection.addWidget(CardService.newTextButton()
      .setText('💾 Save to Notion')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('quickG2NSaveEmail')));
    
    saveSection.addWidget(CardService.newTextButton()
      .setText('⚙️ Advanced Settings')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('showG2NSettings')));
    
    card.addSection(saveSection);
    
    console.log('✅ Preview card built with database: ' + config.DATABASES.gmail.name);
    return card.build();
    
  } catch (error) {
    console.error('💥 Error building preview card: ' + error);
    
    // Simple error card
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('❌ Preview Error'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Failed to load email preview: ' + error.message))
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText('🔄 Try Again')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('onG2NGmailMessage')))
          .addButton(CardService.newTextButton()
            .setText('🏠 Home')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('onG2NHomepage')))))
      .build();
  }
}
/**
 * Entry point for Gmail contextual interface - REQUIRED
 */
function onGmailMessage(e) {
  const constants = getAppConstants();
  const startTime = g2nStartTimer();
  let hadError = false;
  let errorObj = null;
  
  g2nFunctionEntry('onGmailMessage', {
    hasEvent: !!e,
    messageId: (e && e.gmail && e.gmail.messageId) ? e.gmail.messageId : null,
    accessToken: !!(e && e.gmail && e.gmail.accessToken)
  });
  
  try {
    const functionNames = constants.FUNCTION_NAMES || {};
    
    // Safe function call
    const targetFunction = functionNames.ON_GMAIL_MESSAGE;
    if (targetFunction && typeof this[targetFunction] === 'function') {
      const result = this[targetFunction](e);
      g2nPerf(constants.LOGGING.SOURCES.MAIN, 'Gmail message processed', startTime, {
        messageId: (e && e.gmail && e.gmail.messageId) ? e.gmail.messageId : null,
        success: !!result
      });
      return result;
    } else {
      throw new Error('Function ' + targetFunction + ' not found');
    }
    
  } catch (error) {
    hadError = true;
    g2nError(constants.LOGGING.SOURCES.MAIN, 'Gmail message processing failed', {
      error: error.message,
      messageId: (e && e.gmail && e.gmail.messageId) ? e.gmail.messageId : null,
      duration: new Date().getTime() - startTime
    });
    
    // Return error response
    return buildG2NErrorResponse(constants.UI.ICONS.ERROR + ' ' + constants.UI.MESSAGES.SAVE_FAILED + ': ' + error.message);
  } finally {
    g2nFunctionExit('onGmailMessage', { success: !hadError }, startTime);
  }
}

/**
 * Entry point for universal actions - REQUIRED
 */
function onUniversalAction(e) {
  const constants = getAppConstants();
  const startTime = g2nStartTimer();
  let hadError = false;
  let errorObj = null;
  
  g2nFunctionEntry('onUniversalAction', {
    hasEvent: !!e,
    universalAction: (e && e.universalAction) ? e.universalAction : null
  });
  
  try {
    const functionNames = constants.FUNCTION_NAMES || {};
    
    // Safe function call
    const targetFunction = functionNames.ON_UNIVERSAL_ACTION;
    if (targetFunction && typeof this[targetFunction] === 'function') {
      const result = this[targetFunction](e);
      g2nPerf(constants.LOGGING.SOURCES.MAIN, 'Universal action processed', startTime, {
        action: (e && e.universalAction) ? e.universalAction : null,
        success: !!result
      });
      return result;
    } else {
      throw new Error('Function ' + targetFunction + ' not found');
    }
    
  } catch (error) {
    hadError = true;
    g2nError(constants.LOGGING.SOURCES.MAIN, 'Universal action failed', {
      error: error.message,
      action: (e && e.universalAction) ? e.universalAction : null,
      duration: new Date().getTime() - startTime
    });
    
    return buildG2NErrorResponse(constants.UI.ICONS.ERROR + ' Action failed: ' + error.message);
  } finally {
    g2nFunctionExit('onUniversalAction', { success: !hadError }, startTime);
  }
}

// =============================================================================
// COMPLETE ONBOARDING FLOW (API Key First)
// =============================================================================

/**
 * Show setup wizard for new users
 */
function showG2NSetupWizard() {
  const constants = getAppConstants();
  
  try {
    const config = getEnhancedG2NConfig();
    const isConfigured = config.DATABASES.gmail.id && config.DATABASES.resources.id;
    
    if (isConfigured) {
      // Already configured, show status
      const uiService = new UIService();
      return uiService.buildSetupStatusCard();
    } else {
      // Show setup wizard
      return buildSetupWizardCard();
    }
    
  } catch (error) {
    console.error('Setup wizard error:', error);
    return buildErrorCard('Setup Error', error.message);
  }
}

/**
 * Build setup wizard card for new users
 */
function buildSetupWizardCard() {
  const constants = getAppConstants();
  
  try {
    console.log(constants.UI.ICONS.SUCCESS_ALT + ' Building setup wizard card for new user...');
    
    const config = getEnhancedG2NConfig();
    const hasApiKey = !!config.NOTION_API_KEY;
    const hasDatabases = !!config.DATABASES.gmail.id;
    
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(constants.UI.ICONS.SUCCESS_ALT + ' Gmail to Notion Setup')
        .setSubtitle('Let\'s get everything configured automatically'));
    
    // Status section
    const statusSection = CardService.newCardSection()
      .setHeader(constants.UI.ICONS.INFO + ' Current Status');
    
    statusSection.addWidget(CardService.newTextParagraph()
      .setText('API Key: ' + (hasApiKey ? constants.UI.ICONS.SUCCESS + ' Configured' : constants.UI.ICONS.ERROR + ' Required')));
    
    statusSection.addWidget(CardService.newTextParagraph()
      .setText('Databases: ' + (hasDatabases ? constants.UI.ICONS.SUCCESS + ' Ready' : constants.UI.ICONS.ERROR + ' Not setup')));
    
    card.addSection(statusSection);
    
    // Instructions section
    const instructionsSection = CardService.newCardSection()
      .setHeader(constants.UI.ICONS.SUCCESS_ALT + ' Quick Setup');
    
    if (!hasApiKey) {
      instructionsSection.addWidget(CardService.newTextParagraph()
        .setText('We\'ll guide you through:'))
        .addWidget(CardService.newTextParagraph()
        .setText('1. ' + constants.UI.ICONS.CONFIG + ' Getting your Notion API key'))
        .addWidget(CardService.newTextParagraph()
        .setText('2. ' + constants.UI.ICONS.DATABASE + ' Creating your databases'))
        .addWidget(CardService.newTextParagraph()
        .setText('3. ' + constants.UI.ICONS.MAPPING + ' Auto-configuring everything'));
    } else if (!hasDatabases) {
      instructionsSection.addWidget(CardService.newTextParagraph()
        .setText('Great! API key is set up.'))
        .addWidget(CardService.newTextParagraph()
        .setText('Now let\'s create your databases automatically.'));
    } else {
      instructionsSection.addWidget(CardService.newTextParagraph()
        .setText(constants.UI.ICONS.SUCCESS + ' Setup complete! You can start saving emails.'));
    }
    
    card.addSection(instructionsSection);
    
    // Action section
    const actionSection = CardService.newCardSection();
    
    if (!hasApiKey) {
      actionSection.addWidget(CardService.newTextButton()
        .setText(constants.UI.ICONS.CONFIG + ' Start Setup - Enter API Key')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('showApiKeyOnboarding')));
    } else if (!hasDatabases) {
      actionSection.addWidget(CardService.newTextButton()
        .setText(constants.UI.ICONS.SUCCESS_ALT + ' Create Databases Automatically')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('runAutoSetup')));
    } else {
      actionSection.addWidget(CardService.newTextButton()
        .setText(constants.UI.ICONS.SUCCESS + ' Start Saving Emails')
        .setOnClickAction(CardService.newAction()
          .setFunctionName(constants.FUNCTION_NAMES.ON_HOMEPAGE)));
    }
    
    // Additional options
    if (!hasApiKey) {
      actionSection.addWidget(CardService.newTextButton()
        .setText(constants.UI.ICONS.CONFIG + ' Manual Setup')
        .setOnClickAction(CardService.newAction()
          .setFunctionName(constants.FUNCTION_NAMES.SHOW_SETTINGS)));
    }
    
    card.addSection(actionSection);
    
    console.log(constants.UI.ICONS.SUCCESS + ' Setup wizard card built successfully');
    return card.build();
    
  } catch (error) {
    console.error(constants.UI.ICONS.ERROR + ' Failed to build setup wizard card:', error);
    // Fallback to simple setup card
    return buildSimpleSetupCard();
  }
}

function buildG2NAdvancedMappingCard(e) {
  const startTime = g2nStartTimer();
  let hadError = false;  // ✅ Define error flag
  let errorObj = null;   // ✅ Store actual error
  
  g2nFunctionEntry('buildG2NAdvancedMappingCard', {
    hasEvent: !!e,
    messageId: e?.gmail?.messageId
  });
  
  try {
    const constants = getAppConstants();
    const config = getEnhancedG2NConfig();
    
    if (!config.DATABASES.gmail.id) {
      throw new Error('No Gmail database configured. Please configure settings first.');
    }
    
    // Get database properties
    const notionService = new NotionService();
    const database = notionService.verifyG2NDatabaseAccess(config.DATABASES.gmail.id);
    const databaseProperties = database.properties || {};
    
    if (Object.keys(databaseProperties).length === 0) {
      throw new Error('No properties found in the selected database.');
    }
    
    // Build the advanced mapping card using PropertyMapper directly
    const propertyMapper = new PropertyMapper();
    return propertyMapper.createMappingInterface(config.DATABASES.gmail.id, {});
    
  } catch (error) {
    hadError = true;
    errorObj = error;  // ✅ Store the error
    
    g2nError('Main', 'Failed to build advanced mapping card', {
      error: error.message,
      duration: new Date().getTime() - startTime
    });
    
    const constants = getAppConstants();
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(`${constants.UI.ICONS.ERROR} Advanced Mapping Error`))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText(`Failed to load advanced mapping: ${error.message}`))
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText('⚙️ Configure Settings')
            .setOnClickAction(CardService.newAction()
              .setFunctionName(constants.FUNCTION_NAMES.SHOW_SETTINGS)))
          .addButton(CardService.newTextButton()
            .setText('↩️ Back')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('returnG2NToSimpleView')))))
      .build();
  } finally {
    g2nFunctionExit('buildG2NAdvancedMappingCard', { success: !hadError }, startTime);
  }
}
// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
// In Main.gs - Add the missing helper functions and fix saveAdvancedMapping
// Helper function to get property type
function getPropertyType(databaseId, propertyName) {
  try {
    console.log(`🔍 Getting property type for: ${propertyName} in database: ${databaseId}`);
    
    // Check if NotionService is available
    if (typeof NotionService === 'undefined') {
      console.warn('NotionService not available, using default type');
      return 'rich_text';
    }
    
    const notionService = new NotionService();
    const database = notionService.verifyG2NDatabaseAccess(databaseId);
    
    if (!database || !database.properties) {
      console.warn('Database properties not available');
      return 'rich_text';
    }
    
    const property = database.properties[propertyName];
    
    if (!property) {
      console.warn(`Property "${propertyName}" not found in database`);
      
      // Try to find property by case-insensitive match
      const lowerPropName = propertyName.toLowerCase();
      for (const propKey in database.properties) {
        if (propKey.toLowerCase() === lowerPropName) {
          console.log(`Found case-insensitive match: ${propKey}`);
          return database.properties[propKey].type || 'rich_text';
        }
      }
      
      return 'rich_text';
    }
    
    console.log(`✅ Property type for ${propertyName}: ${property.type}`);
    return property.type || 'rich_text';
    
  } catch (error) {
    console.warn(`Could not determine property type for ${propertyName}:`, error);
    return 'rich_text';
  }
}
// Add these helper functions at the top or wherever appropriate in Main.gs
function buildConfirmationCard(title, message, buttons) {
  const cardBuilder = CardService.newCardBuilder();
  
  // Add header
  cardBuilder.setHeader(CardService.newCardHeader().setTitle(title));
  
  // Add section with message
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(message));
  cardBuilder.addSection(section);
  
  // Add button section
  const buttonSection = CardService.newCardSection();
  
  buttons.forEach(button => {
    if (button.url) {
      // External URL button
      buttonSection.addWidget(
        CardService.newTextButton()
          .setText(button.text)
          .setOpenLink(CardService.newOpenLink()
            .setUrl(button.url))
      );
    } else if (button.functionName) {
      // Action button
      const action = CardService.newAction()
        .setFunctionName(button.functionName);
      
      if (button.parameters) {
        action.setParameters(button.parameters);
      }
      
      buttonSection.addWidget(
        CardService.newTextButton()
          .setText(button.text)
          .setOnClickAction(action)
      );
    }
  });
  
  cardBuilder.addSection(buttonSection);
  
  return cardBuilder.build();
}

function buildSuccessCard(title, message, buttons) {
  return buildConfirmationCard(title, message, buttons);
}

function buildErrorCard(title, message) {
  const cardBuilder = CardService.newCardBuilder();
  
  cardBuilder.setHeader(CardService.newCardHeader().setTitle(title));
  
  const section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(message))
    .addWidget(CardService.newTextButton()
      .setText('← Back')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('onG2NGmailMessage')));
  
  cardBuilder.addSection(section);
  
  return cardBuilder.build();
}

/**
 * Refresh database names from Notion API
 */
function refreshDatabaseNames() {
  const constants = getAppConstants();
  
  try {
    console.log('🔄 Refreshing database names from Notion API...');
    
    const config = getEnhancedG2NConfig();
    
    // Check if NotionService is available
    if (typeof NotionService === 'undefined') {
      console.warn('⚠️ NotionService not available - skipping database name refresh');
      return { success: false, reason: 'NotionService not defined' };
    }
    
    const notionService = new NotionService();
    
    // Refresh Gmail database name
    if (config.DATABASES.gmail.id) {
      try {
        const gmailDbInfo = notionService.getDatabase(config.DATABASES.gmail.id);
        if (gmailDbInfo && gmailDbInfo.title && gmailDbInfo.title[0] && gmailDbInfo.title[0].plain_text) {
          config.DATABASES.gmail.name = gmailDbInfo.title[0].plain_text;
          console.log('✅ Gmail database name refreshed: ' + config.DATABASES.gmail.name);
        }
      } catch (error) {
        console.warn('⚠️ Could not refresh Gmail database name: ' + error.message);
      }
    }
    
    // Refresh Resources database name  
    if (config.DATABASES.resources.id) {
      try {
        const resourcesDbInfo = notionService.getDatabase(config.DATABASES.resources.id);
        if (resourcesDbInfo && resourcesDbInfo.title && resourcesDbInfo.title[0] && resourcesDbInfo.title[0].plain_text) {
          config.DATABASES.resources.name = resourcesDbInfo.title[0].plain_text;
          console.log('✅ Resources database name refreshed: ' + config.DATABASES.resources.name);
        }
      } catch (error) {
        console.warn('⚠️ Could not refresh Resources database name: ' + error.message);
      }
    }
    
    // Save updated config
    saveG2NConfigToStorage(config);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error refreshing database names: ' + error);
    return { success: false, error: error.message };
  }
}

/**
 * SIMPLE REFRESH - Use this if NotionService isn't available yet
 */
function refreshDatabaseNamesSimple() {
  const constants = getAppConstants();
  
  try {
    console.log('🔄 Simple database name refresh...');
    
    const config = getEnhancedG2NConfig();
    
    // Set default names if not set
    if (config.DATABASES.gmail.id && !config.DATABASES.gmail.name) {
      config.DATABASES.gmail.name = 'Gmail Emails';
      console.log('✅ Set default Gmail database name');
    }
    
    if (config.DATABASES.resources.id && !config.DATABASES.resources.name) {
      config.DATABASES.resources.name = 'Email Resources'; 
      console.log('✅ Set default Resources database name');
    }
    
    // Save updated config
    saveG2NConfigToStorage(config);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error in simple database name refresh: ' + error);
    return { success: false, error: error.message };
  }
}

/**
 * Test constants as part of main initialization
 */
function testG2NConstantsInMain() {
  const constants = getAppConstants();
  
  try {
    const health = testG2NConstantsQuick();
    
    if (!health.healthy) {
      g2nError(constants.LOGGING.SOURCES.MAIN, 'Constants health check failed', health);
      // Optionally run full test for details
      const fullTest = testG2NConstantsComprehensive();
      return fullTest;
    }
    
    g2nInfo(constants.LOGGING.SOURCES.MAIN, 'Constants health check passed', health);
    return health;
    
  } catch (error) {
    g2nError(constants.LOGGING.SOURCES.MAIN, 'Constants test failed', { error: error.message });
    return { healthy: false, error: error.message };
  }
}

// =============================================================================
// INITIALIZATION WITH CONSTANTS CHECK - FIXED VERSION
// =============================================================================

/**
 * Initialize with constants health check - FIXED VERSION
 */
function initializeG2NWithConstantsCheck() {
  const constants = getAppConstants();
  
  try {
    console.log(constants.UI.ICONS.INFO + ' Initializing G2N with constants check...');
    
    // Test constants health - use safe check
    let constantsHealth;
    try {
      constantsHealth = testG2NConstantsQuick();
    } catch (error) {
      console.warn('⚠️ Constants test failed, proceeding anyway:', error.message);
      constantsHealth = { healthy: false, error: error.message };
    }
    
    if (!constantsHealth.healthy) {
      console.warn('⚠️ Proceeding with constants issues:', constantsHealth);
    }
    
    // Use simple refresh since NotionService might not be available yet
    refreshDatabaseNamesSimple();
    
    console.log(constants.UI.ICONS.SUCCESS + ' Initialization with constants check completed');
    
  } catch (error) {
    console.error(constants.UI.ICONS.ERROR + ' Initialization with constants check failed: ' + error);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build simple setup card as fallback
 */
function buildSimpleSetupCard() {
  const constants = getAppConstants();
  
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle(constants.UI.ICONS.SUCCESS_ALT + ' Gmail to Notion Setup'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('Please configure your Notion integration to get started.'))
      .addWidget(CardService.newTextButton()
        .setText(constants.UI.ICONS.CONFIG + ' Configure Settings')
        .setOnClickAction(CardService.newAction()
          .setFunctionName(constants.FUNCTION_NAMES.SHOW_SETTINGS))))
    .build();
}

/**
 * Build error card
 */
function buildErrorCard(title, message) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('❌ ' + title))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(message)))
    .build();
}

// =============================================================================
// INITIALIZATION CALL
// =============================================================================

// Replace the existing initialization call
initializeG2NWithConstantsCheck();

// =============================================================================
// CONTEXT DEBUG - AJH
// =============================================================================

/**
 * Debug function to log actual add-on context
 */
function debugActualAddOnContext(e) {
  console.log('🔍 DEBUG: Actual Add-on Context Received', {
    hasEvent: !!e,
    eventType: e ? Object.keys(e) : 'none',
    hasGmail: !!(e?.gmail),
    gmailKeys: e?.gmail ? Object.keys(e.gmail) : 'none',
    messageId: e?.gmail?.messageId,
    hasParameters: !!(e?.parameters),
    parameterKeys: e?.parameters ? Object.keys(e.parameters) : 'none'
  });
  
  // If we have a message ID, test the full flow
  if (e?.gmail?.messageId || e?.parameters?.messageId) {
    const messageId = e.gmail?.messageId || e.parameters?.messageId;
    console.log('📧 Testing full flow with message ID:', messageId);
    
    try {
      const gmailService = new GmailService();
      const emailData = gmailService.getSelectedEmailWithRecovery(e);
      console.log('✅ Full flow test successful:', {
        subject: emailData.subject,
        sender: emailData.sender
      });
      
      return {
        success: true,
        context: 'VALID',
        emailData: {
          subject: emailData.subject,
          sender: emailData.sender
        }
      };
    } catch (error) {
      console.error('❌ Full flow test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  return {
    success: false,
    error: 'No message ID found in context',
    context: e || 'empty'
  };
}

/**
 * Simple test add-on card to verify context
 */
function buildSimpleTestCard(e) {
  console.log('🧪 Building simple test card with context:', {
    hasEvent: !!e,
    messageId: e?.gmail?.messageId
  });
  
  const card = CardService.newCardBuilder();
  
  // Header
  card.setHeader(CardService.newCardHeader()
    .setTitle('🧪 G2N Test Card')
    .setSubtitle('Testing Add-on Context'));
  
  // Context info section
  const contextSection = CardService.newCardSection()
    .setHeader('🔍 Context Information');
  
  if (e?.gmail?.messageId) {
    contextSection.addWidget(CardService.newTextParagraph()
      .setText('✅ Gmail Context Available'));
    contextSection.addWidget(CardService.newTextParagraph()
      .setText('Message ID: ' + e.gmail.messageId));
  } else {
    contextSection.addWidget(CardService.newTextParagraph()
      .setText('❌ No Gmail Context'));
  }
  
  card.addSection(contextSection);
  
  // Test actions section
  const actionsSection = CardService.newCardSection()
    .setHeader('🛠️ Test Actions');
  
  // Test button with current context
  const testAction = CardService.newAction()
    .setFunctionName('quickG2NSaveEmail');
  
  // Pass the message ID if available
  if (e?.gmail?.messageId) {
    testAction.setParameters({
      messageId: e.gmail.messageId,
      threadId: e.gmail.threadId || ''
    });
  }
  
  actionsSection.addWidget(CardService.newTextButton()
    .setText('💾 Test Save (With Context)')
    .setOnClickAction(testAction));
  
  actionsSection.addWidget(CardService.newTextButton()
    .setText('💾 Test Save (No Context)')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('quickG2NSaveEmail')));
  
  card.addSection(actionsSection);
  
  return card.build();
}

/**
 * Safe NotionService availability check
 */
function isNotionServiceAvailable() {
  try {
    if (typeof NotionService === 'undefined') {
      console.error('❌ NotionService class is not defined');
      return false;
    }
    
    // Test instantiation
    const notionService = new NotionService();
    if (!notionService) {
      console.error('❌ NotionService instantiation failed');
      return false;
    }
    
    console.log('✅ NotionService is available');
    return true;
    
  } catch (error) {
    console.error('❌ NotionService check failed:', error);
    return false;
  }
}

/**
 * Refresh databases with proper error handling
 */
function refreshG2NDatabases() {
  try {
    console.log('🔄 Refreshing databases list...');
    
    if (!isNotionServiceAvailable()) {
      throw new Error('Notion service is not available. Please check your configuration.');
    }
    
    const notionService = new NotionService();
    
    // Clear cache and force refresh
    notionService.clearDatabaseCache();
    const databases = notionService.fetchG2NDatabasesWithCache();
    
    console.log(`✅ Refreshed ${databases.length} databases`);
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`✅ Found ${databases.length} databases`))
      .setNavigation(CardService.newNavigation()
        .updateCard(showG2NDatabaseSelection()))
      .build();
    
  } catch (error) {
    console.error('❌ Refresh failed:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`❌ Refresh failed: ${error.message}`))
      .build();
  }
}

/**
 * Get configured databases as fallback when NotionService fails
 */
function getConfiguredDatabasesAsFallback() {
  try {
    console.log('🔄 Getting configured databases as fallback...');
    const databases = [];
    const config = getEnhancedG2NConfig();
    
    // Check if we have configured database IDs
    if (config.DATABASES.gmail.id) {
      databases.push({ 
        name: config.DATABASES.gmail.name || 'Gmail Database', 
        id: config.DATABASES.gmail.id 
      });
      console.log('✅ Added configured Gmail database');
    }
    
    if (config.DATABASES.resources.id) {
      databases.push({ 
        name: config.DATABASES.resources.name || 'Resources Database', 
        id: config.DATABASES.resources.id 
      });
      console.log('✅ Added configured Resources database');
    }
    
    if (databases.length === 0) {
      console.log('⚠️ No configured databases found');
    }
    
    return databases;
    
  } catch (error) {
    console.error('Error getting configured databases:', error);
    return [];
  }
}

/**
 * Safe database fetching with fallback
 */
function safeFetchDatabases() {
  try {
    if (!isNotionServiceAvailable()) {
      console.warn('⚠️ NotionService not available, using fallback');
      return getConfiguredDatabasesAsFallback();
    }
    
    const notionService = new NotionService();
    return notionService.fetchG2NDatabasesWithCache();
    
  } catch (error) {
    console.error('❌ Database fetch failed:', error);
    return getConfiguredDatabasesAsFallback();
  }
}

/**
 * Comprehensive constants test function
 */
function testG2NConstantsComprehensive() {
  return testG2NConstantsQuick(); // Simple implementation for now
}

/**
 * Debug current database structure
 */
function debugDatabaseStructure() {
  try {
    const config = getEnhancedG2NConfig();
    const databaseId = config.DATABASES.gmail.id;
    
    console.log('🔍 Debugging database structure for:', databaseId);
    
    const notionService = new NotionService();
    const database = notionService.verifyG2NDatabaseAccess(databaseId);
    const properties = database.properties || {};
    
    console.log('📊 Database Properties:');
    Object.keys(properties).forEach(propName => {
      const prop = properties[propName];
      console.log(`  - ${propName}: ${prop.type}`);
    });
    
    // Build a card showing the properties
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('🔍 Database Structure'))
      .addSection(CardService.newCardSection()
        .setHeader(`Properties in "${config.DATABASES.gmail.name}"`));
    
    Object.keys(properties).forEach(propName => {
      const prop = properties[propName];
      card.addSection(CardService.newCardSection()
        .addWidget(CardService.newKeyValue()
          .setTopLabel(propName)
          .setContent(prop.type)));
    });
    
    card.addSection(CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('⚙️ Configure Mappings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showG2NAdvancedMapping')))
        .addButton(CardService.newTextButton()
          .setText('💾 Test Save')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('quickG2NSaveEmail')))));
    
    return card.build();
    
  } catch (error) {
    console.error('Database debug failed:', error);
    return CardService.newCardBuilder()
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Error: ' + error.message)))
      .build();
  }
}

// =============================================================================
// CONTEXT DEBUG - AJH
// =============================================================================

/**
 * Test configuration persistence
 */
function testConfigPersistence() {
  try {
    console.log('🧪 Testing configuration persistence...');
    
    // Get current config
    const config = getEnhancedG2NConfig();
    console.log('📊 Current config:', {
      gmailDbId: config.DATABASES.gmail.id,
      gmailDbName: config.DATABASES.gmail.name,
      hasApiKey: !!config.NOTION_API_KEY
    });
    
    // Test Script Properties directly
    const scriptProperties = PropertiesService.getScriptProperties();
    const props = scriptProperties.getProperties();
    console.log('📋 Script Properties:', Object.keys(props));
    
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('🧪 Persistence Test'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Current Gmail Database:'))
        .addWidget(CardService.newTextParagraph()
          .setText(`**${config.DATABASES.gmail.name}**`))
        .addWidget(CardService.newTextParagraph()
          .setText(`ID: ${config.DATABASES.gmail.id || 'Not set'}`))
        .addWidget(CardService.newTextParagraph()
          .setText(`Script Properties: ${Object.keys(props).length} items`)))
      .build();
      
  } catch (error) {
    console.error('Persistence test failed:', error);
    return CardService.newCardBuilder()
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Test failed: ' + error.message)))
      .build();
  }
}
/**
 * Debug constants loading
 */
function debugConstants() {
  console.log('🔍 Debugging constants...');
  
  try {
    // Try to get constants
    const constants = getAppConstants();
    
    if (!constants) {
      console.error('❌ getAppConstants() returned undefined');
      return;
    }
    
    console.log('✅ Constants loaded:', {
      hasUI: !!constants.UI,
      hasErrorHandling: !!constants.ERROR_HANDLING,
      hasCardTitles: !!constants.ERROR_HANDLING?.CARD_TITLES,
      allKeys: Object.keys(constants)
    });
    
    if (constants.ERROR_HANDLING && constants.ERROR_HANDLING.CARD_TITLES) {
      console.log('📋 Card titles:', constants.ERROR_HANDLING.CARD_TITLES);
    }
    
  } catch (error) {
    console.error('💥 Error loading constants:', error);
  }
}

// Call this function temporarily to debug
debugConstants();

/**
 * Safe constants getter with fallback
 */
function getAppConstants() {
  try {
    // First try to get from global APP_CONSTANTS
    if (typeof APP_CONSTANTS !== 'undefined' && APP_CONSTANTS) {
      console.log('✅ Using global APP_CONSTANTS');
      return APP_CONSTANTS;
    }
    
    // Try to use getG2NConstants if it exists
    if (typeof getG2NConstants === 'function') {
      console.log('✅ Using getG2NConstants() function');
      return getG2NConstants();
    }
    
    // Try to access constants directly from Constants class
    if (typeof Constants !== 'undefined') {
      console.log('✅ Using Constants class');
      return Constants.getConstants();
    }
    
    console.error('❌ No constants source found');
    
    // Return minimal fallback constants
    return {
      UI: {
        ICONS: {
          EMAIL: '📧',
          DATABASE: '🗄️',
          CONFIG: '⚙️',
          SAVE: '💾',
          ERROR: '❌',
          SUCCESS: '✅',
          INFO: 'ℹ️',
          SUCCESS_ALT: '🎯',
          MAPPING: '🔧',
          TEST: '🔗',
          HOME: '🏠',
          SECURITY: '🔐'
        },
        MESSAGES: {
          CONFIG_REQUIRED: 'Configuration required. Please set up your Notion integration.',
          HOMEPAGE: {
            SUBTITLE: 'Save emails to {database}',
            SAVE_INSTRUCTIONS: 'Click below to save this email to Notion'
          },
          SAVE_SUCCESS: 'Email saved successfully!',
          SAVE_FAILED: 'Failed to save email',
          SETTINGS_SAVED_SUCCESS: 'Settings saved successfully!'
        },
        BUTTONS: {
          CHANGE_DATABASE: 'Change Database',
          CONFIGURE_SETTINGS: 'Configure Settings',
          TEST_CONNECTION: 'Test Connection',
          QUICK_SAVE: 'Quick Save',
          ADVANCED_SAVE: 'Advanced Save',
          BACK_TO_EMAIL: 'Back to Email',
          BACK_TO_HOME: 'Back to Home',
          SAVE_API_KEY: 'Save API Key',
          REFRESH_DATABASE_INFO: 'Refresh Info',
          CONFIGURE_MAPPINGS: 'Configure Mappings',
          SAVE_MAPPINGS: 'Save Mappings',
          AUTO_DETECT: 'Auto-detect',
          RETRY: 'Retry',
          RELOAD: 'Reload',
          OPEN_NOTION_INTEGRATIONS: 'Open Notion Integrations'
        }
      },
      ERROR_HANDLING: {
        CARD_TITLES: {
          HOMEPAGE: 'Homepage Error',
          SETTINGS: 'Settings Error',
          DATABASE: 'Database Error',
          PREVIEW: 'Preview Error',
          MAPPING: 'Mapping Error',
          AUTH: 'Authentication Error'
        },
        SUGGESTIONS: {
          DEFAULT: 'Please check your configuration and try again.'
        }
      },
      FUNCTION_NAMES: {
        SHOW_SETTINGS: 'showG2NSettings',
        SHOW_DATABASE_SELECTION: 'showG2NDatabaseSelection',
        QUICK_SAVE_EMAIL: 'quickG2NSaveEmail',
        SHOW_ADVANCED_MAPPING: 'showG2NAdvancedMapping',
        ENHANCED_TEST_CONNECTION: 'enhancedTestG2NNotionConnection',
        ON_HOMEPAGE: 'onG2NHomepage',
        ON_GMAIL_MESSAGE: 'onG2NGmailMessage',
        ON_UNIVERSAL_ACTION: 'onG2NUniversalAction',
        ON_DATABASE_SELECTED: 'onG2NDatabaseSelected',
        SAVE_ADVANCED_MAPPING: 'saveAdvancedMapping',
        AUTO_DETECT_MAPPING: 'autoDetectMapping',
        REFRESH_DATABASE_INFO: 'refreshDatabaseInfo',
        TEST_NOTION_CONNECTION: 'enhancedTestG2NNotionConnection',
        SHOW_NOTION_INTEGRATIONS_HELP: 'showNotionIntegrationsHelp',
        SAVE_CONFIG: 'saveG2NConfigSettings'
      },
      LOGGING: {
        SOURCES: {
          MAIN: 'Main',
          CONFIG: 'Config',
          DATABASE: 'Database',
          PROPERTY_MAPPINGS: 'PropertyMappings'
        }
      },
      APP: {
        NAME: 'Gmail to Notion',
        VERSION: '1.0'
      },
      DATABASES: {
        DEFAULT_NAMES: {
          GMAIL: 'Gmail Database',
          RESOURCES: 'Resources Database'
        }
      },
      PATTERNS: {
        DATABASE_ID: /^[a-f0-9]{32}$/
      }
    };
    
  } catch (error) {
    console.error('❌ Error in getAppConstants:', error);
    // Return minimal constants
    return {
      UI: {
        ICONS: {
          ERROR: '❌',
          INFO: 'ℹ️',
          EMAIL: '📧'
        }
      },
      ERROR_HANDLING: {
        CARD_TITLES: {
          DEFAULT: 'Error'
        }
      }
    };
  }
}

/**
 * Test constants loading
 */
function testConstantsLoading() {
  console.log('🧪 Testing constants loading...');
  
  const constants = getAppConstants();
  console.log('Constants loaded:', {
    isObject: typeof constants === 'object',
    hasUI: !!constants.UI,
    hasErrorHandling: !!constants.ERROR_HANDLING,
    cardTitles: constants.ERROR_HANDLING?.CARD_TITLES
  });
  
  if (constants.UI) {
    console.log('UI keys:', Object.keys(constants.UI));
  }
  
  if (constants.ERROR_HANDLING) {
    console.log('Error handling keys:', Object.keys(constants.ERROR_HANDLING));
  }
  
  return constants;
}

// Run the test
testConstantsLoading();

/**
 * Trace the actual error location
 */
function tracePreviewError() {
  console.log('🔍 Tracing preview error...');
  
  try {
    // Simulate what happens when the add-on is opened
    console.log('1. Testing onG2NHomepage...');
    const homepageCard = onG2NHomepage({});
    console.log('✅ onG2NHomepage succeeded');
    
    console.log('2. Testing showG2NSettings...');
    const settingsCard = showG2NSettings();
    console.log('✅ showG2NSettings succeeded');
    
    console.log('3. Testing showG2NDatabaseSelection...');
    const dbCard = showG2NDatabaseSelection();
    console.log('✅ showG2NDatabaseSelection succeeded');
    
    console.log('4. Testing buildPreviewCard...');
    
    // SAFE CHECK: Only create UIService if it exists
    let uiService;
    if (typeof UIService !== 'undefined') {
      uiService = new UIService();
      const previewCard = uiService.buildPreviewCard({});
      console.log('✅ buildPreviewCard succeeded');
    } else {
      console.log('⚠️ UIService not available, skipping buildPreviewCard test');
    }
    
    return {
      success: true,
      tests: ['homepage', 'settings', 'database', 'preview']
    };
    
  } catch (error) {
    console.error('❌ Trace failed at step:', error);
    console.error('Stack trace:', error.stack);
    
    // Check if it's the CARD_TITLES error
    if (error.message.includes('CARD_TITLES')) {
      console.error('🎯 This is the CARD_TITLES error!');
      console.error('Error location:', error.stack.split('\n')[0]);
    }
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

tracePreviewError();

/**
 * Test the actual add-on flow
 */
function testActualAddOnFlow() {
  console.log('🚀 Testing actual add-on flow...');
  
  try {
    // Test 1: Homepage (what users see first)
    console.log('\n1. Testing homepage...');
    const homepage = onG2NHomepage({});
    console.log('✅ Homepage works');
    
    // Test 2: Settings
    console.log('\n2. Testing settings...');
    const settings = showG2NSettings();
    console.log('✅ Settings works');
    
    // Test 3: Database selection
    console.log('\n3. Testing database selection...');
    const dbSelection = showG2NDatabaseSelection();
    console.log('✅ Database selection works');
    
    console.log('\n🎯 All core functions work!');
    return {
      success: true,
      message: 'Add-on core functions are working'
    };
    
  } catch (error) {
    console.error('❌ Add-on test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

testActualAddOnFlow();


// Add a function to verify mappings are working
function testPropertyMappingPersistence() {
  console.log('🧪 Testing property mapping persistence...');
  
  try {
    const config = getEnhancedG2NConfig();
    
    if (!config.DATABASES.gmail.id) {
      console.log('ℹ️ No database configured yet');
      return { 
        success: false, 
        message: 'No database configured. Please select a database first.' 
      };
    }
    
    const databaseId = config.DATABASES.gmail.id;
    
    // Test 1: Check if we can load mappings
    console.log('📖 Loading existing mappings...');
    const existingMappings = loadG2NPropertyMappings(databaseId);
    
    console.log('📊 Existing mappings:', {
      count: Object.keys(existingMappings).length,
      keys: Object.keys(existingMappings)
    });
    
    // Test 2: Create test mappings if none exist
    if (Object.keys(existingMappings).length === 0) {
      console.log('🔄 Creating test mappings...');
      const testMappings = {
        subject: {
          notionProperty: 'Name',
          notionType: 'title',
          emailField: 'subject',
          test: true,
          createdAt: new Date().toISOString()
        },
        sender: {
          notionProperty: 'From',
          notionType: 'rich_text',
          emailField: 'sender',
          test: true,
          createdAt: new Date().toISOString()
        }
      };
      
      const saveResult = saveG2NPropertyMappings(databaseId, testMappings);
      console.log('💾 Save result:', saveResult);
      
      // Wait and reload
      Utilities.sleep(1000);
      const reloadedMappings = loadG2NPropertyMappings(databaseId);
      
      console.log('🔍 Test mappings reloaded:', {
        savedCount: Object.keys(testMappings).length,
        loadedCount: Object.keys(reloadedMappings).length,
        success: Object.keys(reloadedMappings).length > 0
      });
      
      return {
        success: Object.keys(reloadedMappings).length > 0,
        message: `Test ${Object.keys(reloadedMappings).length > 0 ? 'passed' : 'failed'}: ${Object.keys(reloadedMappings).length} mappings loaded`,
        testMappings: testMappings,
        loadedMappings: reloadedMappings
      };
    } else {
      console.log('✅ Found existing mappings');
      return {
        success: true,
        message: `Found ${Object.keys(existingMappings).length} existing mappings`,
        mappings: existingMappings
      };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      message: `Test failed: ${error.message}`,
      error: error.toString()
    };
  }
}

// Add this function to help debug mapping issues
function debugMappingStorage() {
  console.log('🔍 Debugging mapping storage...');
  
  try {
    const config = getEnhancedG2NConfig();
    const databaseId = config.DATABASES.gmail.id;
    
    if (!databaseId) {
      console.log('❌ No database ID configured');
      return;
    }
    
    console.log('📊 Current configuration:', {
      databaseId: databaseId,
      databaseName: config.DATABASES.gmail.name,
      hasMappings: !!config.PROPERTY_MAPPINGS?.mappings?.[databaseId]
    });
    
    // Check all storage locations
    console.log('\n📍 Checking Script Properties:');
    const scriptProps = PropertiesService.getScriptProperties();
    const allScriptProps = scriptProps.getProperties();
    Object.keys(allScriptProps).forEach(key => {
      if (key.includes('MAPPING') || key.includes('mapping')) {
        console.log(`  ${key}: ${allScriptProps[key].substring(0, 100)}...`);
      }
    });
    
    console.log('\n📍 Checking User Properties:');
    const userProps = PropertiesService.getUserProperties();
    const allUserProps = userProps.getProperties();
    Object.keys(allUserProps).forEach(key => {
      if (key.includes('MAPPING') || key.includes('mapping')) {
        console.log(`  ${key}: ${allUserProps[key].substring(0, 100)}...`);
      }
    });
    
    console.log('\n📍 Checking Cache:');
    const cache = CacheService.getScriptCache();
    const cached = cache.get(`mappings_${databaseId}`);
    console.log(`  mappings_${databaseId}: ${cached ? 'Exists' : 'Not found'}`);
    
    console.log('\n📍 Calling loadG2NPropertyMappings:');
    const loaded = loadG2NPropertyMappings(databaseId);
    console.log(`  Loaded ${Object.keys(loaded).length} mappings:`, Object.keys(loaded));
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}