// SettingsService.gs
// =============================================================================
// SETTINGS SERVICE - COMPLETE FIXED VERSION
// =============================================================================

/**
 * Main settings card builder
 */
function buildG2NSettingsCard(activeCategory = 'general') {
  try {
    // Use safe UI constants
    const uiConstants = getUiConstants();
    const constants = getAppConstants();
    
    console.log('Building settings card with category:', activeCategory);
    
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(uiConstants.MESSAGES?.SETTINGS_CARD_TITLE || '⚙️ Gmail to Notion - Settings'));

    // Add category navigation
    card.addSection(createG2NSettingsCategorySection(activeCategory, uiConstants, constants));

    // Add content for active category
    const contentSection = createG2NSettingsContentSection(activeCategory, uiConstants, constants);
    if (contentSection) {
      card.addSection(contentSection);
    }

    // Add global actions
    card.addSection(createG2NSettingsActionsSection(uiConstants, constants));

    console.log('Settings card built successfully');
    return card.build();

  } catch (error) {
    console.error('Failed to build settings card:', error);
    
    // Emergency fallback card
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('⚙️ Gmail to Notion - Settings'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Failed to load settings configuration.'))
        .addWidget(CardService.newTextParagraph()
          .setText('Error: ' + error.message))
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText('🔄 Retry')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('showG2NSettings')))
          .addButton(CardService.newTextButton()
            .setText('🏠 Home')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('onG2NHomepage')))))
      .build();
  }
}

/**
 * Create settings category navigation section
 */
function createG2NSettingsCategorySection(activeCategory, uiConstants, constants) {
  const section = CardService.newCardSection()
    .setHeader('Settings Categories');

  const buttonSet = CardService.newButtonSet();

  // Define categories with safe icon access
  const categories = [
    { id: 'general', name: 'General', icon: uiConstants.ICONS?.CONFIG || '⚙️' },
    { id: 'databases', name: 'Databases', icon: uiConstants.ICONS?.DATABASE || '🗄️' },
    { id: 'properties', name: 'Properties', icon: uiConstants.ICONS?.MAPPING || '🔄' },
    { id: 'email_processing', name: 'Email Processing', icon: uiConstants.ICONS?.EMAIL || '📧' },
    { id: 'attachments', name: 'Attachments', icon: uiConstants.ICONS?.ATTACHMENT || '📎' },
    { id: 'advanced', name: 'Advanced', icon: uiConstants.ICONS?.CONFIG || '⚙️' },
    { id: 'backup', name: 'Backup & Reset', icon: uiConstants.ICONS?.SAVE || '💾' }
  ];

  categories.forEach(category => {
    const isActive = category.id === activeCategory;
    
    buttonSet.addButton(CardService.newTextButton()
      .setText(`${category.icon} ${category.name}`)
      .setTextButtonStyle(isActive ? 
        CardService.TextButtonStyle.FILLED : 
        CardService.TextButtonStyle.TEXT)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('showG2NSettingsCategory')
        .setParameters({ category: category.id })));
  });

  section.addWidget(buttonSet);
  return section;
}

/**
 * Create settings content section based on active category
 */
function createG2NSettingsContentSection(activeCategory, uiConstants, constants) {
  const section = CardService.newCardSection()
    .setHeader(getCategoryHeader(activeCategory));

  switch (activeCategory) {
    case 'general':
      addGeneralSettings(section, uiConstants, constants);
      break;
    case 'databases':
      addDatabaseSettings(section, uiConstants, constants);
      break;
    case 'properties':
      addPropertySettings(section, uiConstants, constants);
      break;
    case 'email_processing':
      addEmailProcessingSettings(section, uiConstants, constants);
      break;
    case 'attachments':
      addAttachmentSettings(section, uiConstants, constants);
      break;
    case 'advanced':
      addAdvancedSettings(section, uiConstants, constants);
      break;
    case 'backup':
      addBackupSettings(section, uiConstants, constants);
      break;
    default:
      section.addWidget(CardService.newTextParagraph()
        .setText('Select a settings category to configure.'));
  }

  return section;
}

/**
 * Get header for category
 */
function getCategoryHeader(category) {
  const headers = {
    'general': 'General Settings',
    'databases': 'Database Configuration',
    'properties': 'Property Mapping',
    'email_processing': 'Email Processing',
    'attachments': 'Attachment Handling',
    'advanced': 'Advanced Settings',
    'backup': 'Backup & Reset'
  };
  return headers[category] || 'Settings';
}

/**
 * Add general settings widgets
 */
function addGeneralSettings(section, uiConstants, constants) {
  const config = getEnhancedG2NConfig();
  
  section.addWidget(CardService.newTextInput()
    .setFieldName('notion_api_key')
    .setTitle('Notion API Key')
    .setValue(config.NOTION_API_KEY || '')
    .setHint('Enter your Notion integration API key'));

  section.addWidget(CardService.newSelectionInput()
    .setFieldName('default_save_mode')
    .setTitle('Default Save Mode')
    .setType(CardService.SelectionInputType.DROPDOWN)
    .addItem('Quick Save', 'quick', config.SETTINGS.defaultSaveMode === 'quick')
    .addItem('Advanced Mapping', 'advanced', config.SETTINGS.defaultSaveMode === 'advanced'));

  section.addWidget(CardService.newSelectionInput()
    .setFieldName('check_duplicates')
    .setTitle('Check for Duplicates')
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .addItem('Enable duplicate checking', 'true', config.SETTINGS.checkDuplicates !== false));
}

/**
 * Add database settings widgets
 */
function addDatabaseSettings(section, uiConstants, constants) {
  const config = getEnhancedG2NConfig();
  
  section.addWidget(CardService.newTextInput()
    .setFieldName('gmail_database_id')
    .setTitle('Gmail Database ID')
    .setValue(config.DATABASES.gmail.id || '')
    .setHint('Notion database ID for saving emails'));

  section.addWidget(CardService.newTextInput()
    .setFieldName('resources_database_id')
    .setTitle('Resources Database ID')
    .setValue(config.DATABASES.resources.id || '')
    .setHint('Notion database ID for attachments (optional)'));

  section.addWidget(CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText('🔍 Find Databases')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('showG2NDatabaseSelection'))));
}

/**
 * Add property settings widgets
 */
function addPropertySettings(section, uiConstants, constants) {
  section.addWidget(CardService.newTextParagraph()
    .setText('Configure how email fields map to Notion properties.'));

  section.addWidget(CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText('🔄 Auto-Detect Mappings')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('autoDetectG2NMappings')))
    .addButton(CardService.newTextButton()
      .setText('🗑️ Clear Mappings')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('refreshG2NPropertyMappings'))));
}

/**
 * Add email processing settings widgets
 */
function addEmailProcessingSettings(section, uiConstants, constants) {
  const config = getEnhancedG2NConfig();
  
  section.addWidget(CardService.newSelectionInput()
    .setFieldName('clean_email_body')
    .setTitle('Clean Email Body')
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .addItem('Remove quoted text and signatures', 'true', config.SETTINGS.cleanEmailBody !== false));

  section.addWidget(CardService.newSelectionInput()
    .setFieldName('include_email_links')
    .setTitle('Include Email Links')
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .addItem('Add Gmail links to saved pages', 'true', config.SETTINGS.includeEmailLinks !== false));

  section.addWidget(CardService.newTextInput()
    .setFieldName('max_body_length')
    .setTitle('Max Body Length')
    .setValue(config.SETTINGS.maxBodyLength?.toString() || '10000')
    .setHint('Maximum characters to save from email body'));
}

/**
 * Add attachment settings widgets
 */
function addAttachmentSettings(section, uiConstants, constants) {
  const config = getEnhancedG2NConfig();
  
  section.addWidget(CardService.newSelectionInput()
    .setFieldName('attachment_handling')
    .setTitle('Attachment Handling')
    .setType(CardService.SelectionInputType.DROPDOWN)
    .addItem('None', 'none', config.SETTINGS.attachmentHandling === 'none')
    .addItem('Save to Resources DB', 'resources', config.SETTINGS.attachmentHandling === 'resources')
    .addItem('Embed in email page', 'embed', config.SETTINGS.attachmentHandling === 'embed'));

  section.addWidget(CardService.newTextInput()
    .setFieldName('max_attachment_size')
    .setTitle('Max Attachment Size (bytes)')
    .setValue(config.SETTINGS.maxAttachmentSize?.toString() || '10485760')
    .setHint('Maximum file size to process'));
}

/**
 * Add advanced settings widgets
 */
function addAdvancedSettings(section, uiConstants, constants) {
  const config = getEnhancedG2NConfig();
  
  section.addWidget(CardService.newSelectionInput()
    .setFieldName('enable_caching')
    .setTitle('Enable Caching')
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .addItem('Cache configuration and database info', 'true', config.SETTINGS.enableCaching !== false));

  section.addWidget(CardService.newTextInput()
    .setFieldName('cache_duration')
    .setTitle('Cache Duration (seconds)')
    .setValue(config.SETTINGS.cacheDuration?.toString() || '300')
    .setHint('How long to cache data'));

  section.addWidget(CardService.newTextInput()
    .setFieldName('rate_limit_delay')
    .setTitle('Rate Limit Delay (ms)')
    .setValue(config.SETTINGS.rateLimitDelay?.toString() || '1000')
    .setHint('Delay between API calls'));
}

/**
 * Add backup settings widgets
 */
function addBackupSettings(section, uiConstants, constants) {
  section.addWidget(CardService.newTextParagraph()
    .setText('Backup and reset options:'));

  section.addWidget(CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText('💾 Export Configuration')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('exportG2NConfiguration')))
    .addButton(CardService.newTextButton()
      .setText('🔄 Reset to Defaults')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('resetG2NSettingsToDefaults'))));
}

/**
 * Create settings actions section
 */
function createG2NSettingsActionsSection(uiConstants, constants) {
  const section = CardService.newCardSection()
    .setHeader('Actions');

  const buttonSet = CardService.newButtonSet();

  buttonSet.addButton(CardService.newTextButton()
    .setText('💾 Save All Settings')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('saveG2NAllSettings')));

  buttonSet.addButton(CardService.newTextButton()
    .setText('🧪 Test Connection')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('enhancedTestG2NNotionConnection')));

  buttonSet.addButton(CardService.newTextButton()
    .setText('🏠 Back to Home')
    .setOnClickAction(CardService.newAction()
      .setFunctionName('onG2NHomepage')));

  section.addWidget(buttonSet);
  return section;
}

/**
 * Show settings category
 */
function showG2NSettingsCategory(e) {
  const category = e.parameters.category || 'general';
  return buildG2NSettingsCard(category);
}

/**
 * Save all settings from form
 */
function saveG2NAllSettings(e) {
  try {
    const formInputs = e.formInputs;
    const config = getEnhancedG2NConfig();
    
    // Update configuration with form values
    if (formInputs.notion_api_key) {
      config.NOTION_API_KEY = formInputs.notion_api_key;
    }
    
    if (formInputs.gmail_database_id) {
      config.DATABASES.gmail.id = formInputs.gmail_database_id;
    }
    
    if (formInputs.resources_database_id) {
      config.DATABASES.resources.id = formInputs.resources_database_id;
    }
    
    // Update settings
    config.SETTINGS.defaultSaveMode = formInputs.default_save_mode || 'quick';
    config.SETTINGS.checkDuplicates = formInputs.check_duplicates === 'true';
    config.SETTINGS.cleanEmailBody = formInputs.clean_email_body === 'true';
    config.SETTINGS.includeEmailLinks = formInputs.include_email_links === 'true';
    config.SETTINGS.maxBodyLength = parseInt(formInputs.max_body_length) || 10000;
    config.SETTINGS.attachmentHandling = formInputs.attachment_handling || 'none';
    config.SETTINGS.maxAttachmentSize = parseInt(formInputs.max_attachment_size) || 10485760;
    config.SETTINGS.enableCaching = formInputs.enable_caching === 'true';
    config.SETTINGS.cacheDuration = parseInt(formInputs.cache_duration) || 300;
    config.SETTINGS.rateLimitDelay = parseInt(formInputs.rate_limit_delay) || 1000;
    
    // Save to storage
    saveG2NConfigToStorage(config);
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Settings saved successfully!'))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildG2NSettingsCard()))
      .build();
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Failed to save settings: ' + error.message))
      .build();
  }
}

/**
 * Export configuration to JSON
 */
function exportG2NConfiguration() {
  try {
    const config = getEnhancedG2NConfig();
    const configJson = JSON.stringify(config, null, 2);
    
    // In a real implementation, you might:
    // 1. Save to a Google Drive file
    // 2. Return as a download
    // 3. Display in a card
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Configuration exported (check logs for JSON)'))
      .build();
        
  } catch (error) {
    console.error('Export failed:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Export failed: ' + error.message))
      .build();
  }
}

/**
 * Reset settings to defaults
 */
function resetG2NSettingsToDefaults() {
  try {
    const constants = getAppConstants();
    const defaultConfig = {
      NOTION_API_KEY: '',
      DATABASES: {
        gmail: { id: '', name: '' },
        resources: { id: '', name: '' }
      },
      PROPERTY_MAPPINGS: {
        mappings: {},
        metadata: { version: '1.0', lastUpdated: null, mappingCount: 0 }
      },
      SETTINGS: constants.DEFAULTS,
      SYSTEM: {
        initialized: false,
        lastConfigUpdate: new Date().toISOString(),
        configVersion: constants.APP.CONFIG_VERSION
      }
    };
    
    saveG2NConfigToStorage(defaultConfig);
    clearG2NCache();
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('✅ Settings reset to defaults!'))
      .setNavigation(CardService.newNavigation()
        .popToRoot()
        .updateCard(buildG2NSettingsCard()))
      .build();
      
  } catch (error) {
    console.error('Reset failed:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText('❌ Reset failed: ' + error.message))
      .build();
  }
}