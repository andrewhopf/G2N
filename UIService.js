// UIService.gs 
// =============================================================================//
class UIService {
constructor() {
  try {
    console.log('🛠️ UIService constructor called');
    
    // Get constants with safe access
    const constants = getAppConstants();
    console.log('✅ Constants loaded in UIService:', {
      hasConstants: !!constants,
      hasUI: !!(constants && constants.UI),
      hasErrorHandling: !!(constants && constants.ERROR_HANDLING)
    });
    
    // Assign with safe fallbacks
    this.constants = constants || {};
    this.ui = this.constants.UI || {};
    this.functions = this.constants.FUNCTION_NAMES || {};
    this.messages = this.ui.MESSAGES || {};
    this.buttons = this.ui.BUTTONS || {};
    this.sections = this.ui.SECTIONS || {};
    this.icons = this.ui.ICONS || {};
    this.emailFields = this.constants.EMAIL_FIELDS || {};
    
    // CRITICAL FIX: Safe access to ERROR_HANDLING
    this.errors = this.constants.ERROR_HANDLING || {};
    
    // Ensure CARD_TITLES exists with fallbacks
    if (!this.errors.CARD_TITLES) {
      console.warn('⚠️ CARD_TITLES not found in ERROR_HANDLING, using defaults');
      this.errors.CARD_TITLES = {
        HOMEPAGE: '❌ Homepage Error',
        SETTINGS: '❌ Settings Error',
        DATABASE: '🗄️ Database Access Required',
        AUTH: '🔐 Authentication Required',
        PREVIEW: '❌ Preview Error',
        MAPPING: '❌ Mapping Error',
        DEFAULT: '❌ Error'
      };
    }
    
    console.log('✅ UIService initialized successfully', {
      hasErrorsObject: !!this.errors,
      hasCardTitles: !!this.errors.CARD_TITLES,
      cardTitleCount: Object.keys(this.errors.CARD_TITLES || {}).length
    });
    
  } catch (error) {
    console.error('❌ UIService constructor failed:', error);
    
    // Emergency fallback
    this.constants = {};
    this.ui = {};
    this.functions = {};
    this.messages = {};
    this.buttons = {};
    this.sections = {};
    this.icons = {
      ERROR: '❌',
      INFO: 'ℹ️',
      EMAIL: '📧',
      DATABASE: '🗄️',
      CONFIG: '⚙️',
      SAVE: '💾'
    };
    this.emailFields = {};
    this.errors = {
      CARD_TITLES: {
        HOMEPAGE: '❌ Homepage Error',
        SETTINGS: '❌ Settings Error',
        DATABASE: '🗄️ Database Access Required',
        AUTH: '🔐 Authentication Required',
        PREVIEW: '❌ Preview Error',
        MAPPING: '❌ Mapping Error',
        DEFAULT: '❌ Error'
      },
      SUGGESTIONS: {
        DEFAULT: 'Please check your configuration and try again.'
      }
    };
  }
}

  // === MAIN CARD BUILDERS ===

  /**
   * Main homepage card builder
   */
  buildG2NHomepageCard() {
    try {
      console.log('🏠 Building homepage card...');
      
      const config = getEnhancedG2NConfig();
      const isConfigured = config.NOTION_API_KEY && config.DATABASES.gmail.id;
      
      if (!isConfigured) {
        console.log('❌ Configuration required - showing config card');
        return this.buildConfigurationRequiredCard();
      }
      
      console.log('✅ Configuration valid - showing main homepage');
      return this.buildMainHomepageCard();
      
    } catch (error) {
      console.error('💥 Failed to build homepage card: ' + error);
      return this.buildErrorCard(
        this.errors.CARD_TITLES.HOMEPAGE,
        'Failed to load homepage: ' + error.message
      );
    }
  }

  /**
   * Build configuration required card
   */
  buildConfigurationRequiredCard() {
    console.log('🔧 Building configuration required card');
    
    const messages = this.messages.CONFIGURATION_REQUIRED;
    
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(this.icons.CONFIG + ' ' + this.constants.APP.NAME))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText(this.icons.ERROR + ' ' + messages.TITLE))
        .addWidget(CardService.newTextParagraph()
          .setText(messages.DESCRIPTION))
        .addWidget(CardService.newTextParagraph()
          .setText(messages.COMMON_ISSUES_HEADER))
        .addWidget(CardService.newTextParagraph()
          .setText(messages.ISSUE_REAUTH))
        .addWidget(CardService.newTextParagraph()
          .setText(messages.ISSUE_PERMISSIONS))
        .addWidget(CardService.newTextParagraph()
          .setText(messages.ISSUE_ACCESS))
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText(this.buttons.CONFIGURE_SETTINGS)
            .setOnClickAction(CardService.newAction()
              .setFunctionName(this.functions.SHOW_SETTINGS)))
          .addButton(CardService.newTextButton()
            .setText(this.buttons.TEST_CONNECTION)
            .setOnClickAction(CardService.newAction()
              .setFunctionName(this.functions.TEST_NOTION_CONNECTION)))))
      .build();
  }

  /**
   * Build main homepage card
   */
  buildMainHomepageCard() {
    try {
      console.log('🏠 Building main homepage card...');
      
      const config = getEnhancedG2NConfig();
      const databaseName = config.DATABASES.gmail.name || this.constants.DATABASES.DEFAULT_NAMES.GMAIL;
      
      const card = CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
          .setTitle(this.icons.EMAIL + ' ' + this.constants.APP.NAME)
          .setSubtitle(this.formatMessage(this.messages.HOMEPAGE.SUBTITLE, { database: databaseName })));

      // Database section
      card.addSection(this.createHomepageDatabaseSection(config));
      
      // Quick Actions section
      card.addSection(this.createHomepageActionsSection());
      
      // Configuration section
      card.addSection(this.createHomepageConfigSection());
      
      console.log('✅ Main homepage card built successfully');
      return card.build();
      
    } catch (error) {
      console.error('💥 Error building main homepage card: ' + error);
      return this.buildErrorCard(
        this.errors.CARD_TITLES.HOMEPAGE,
        'Failed to load interface: ' + error.message
      );
    }
  }

  /**
   * Build configuration card for settings
   */
  buildConfigCard() {
    try {
      console.log('🏗️ Building configuration card...');
      
      const config = getEnhancedG2NConfig();
      const messages = this.messages.CONFIGURATION;
      
      const card = CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
          .setTitle(messages.TITLE)
          .setSubtitle(this.formatMessage(messages.SUBTITLE, { version: this.constants.APP.VERSION })))
        
        // API Key Section
        .addSection(this.createApiKeySection(config))
        
        // Current Database Status Section
        .addSection(this.createDatabaseStatusSection(config))
        
        // Database Management Actions
        .addSection(this.createDatabaseManagementSection())
        
        // Actions Section
        .addSection(this.createConfigActionsSection());
      
      console.log('✅ Configuration card built successfully');
      return card.build();
      
    } catch (error) {
      console.error('❌ Failed to build configuration card: ' + error);
      return this.buildErrorCard(
        this.errors.CARD_TITLES.SETTINGS,
        error.message
      );
    }
  }

  /**
   * Build database selection card
   */
  buildDatabaseSelectionCard() {
    try {
      console.log('🗄️ Building database selection card...');
      
      const notionService = new NotionService();
      const messages = this.messages.DATABASE_SELECTION;
      
      let databases = [];
      if (typeof notionService.fetchG2NDatabasesWithCache === 'function') {
        console.log('📊 Using fetchG2NDatabasesWithCache method...');
        databases = notionService.fetchG2NDatabasesWithCache();
      } else {
        throw new Error('No database fetching method found in NotionService');
      }
      
      console.log('✅ Found ' + databases.length + ' databases');
      
      const card = CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
          .setTitle(messages.TITLE))
        .addSection(CardService.newCardSection()
          .setHeader(messages.HEADER)
          .addWidget(CardService.newTextParagraph()
            .setText(messages.SUBTITLE)));
      
      console.log('📊 Processing databases...');
      
      let validDatabases = 0;
      
      databases.forEach((db, index) => {
        try {
          if (!db.id) {
            console.warn('⚠️ Skipping database ' + (index + 1) + ': No ID');
            return;
          }
          
          const dbName = this.getCleanDatabaseName(db);
          console.log('📋 Database ' + (index + 1) + ': ' + dbName + ' (' + db.id + ')');
          
          const button = CardService.newTextButton()
            .setText(this.icons.DATABASE + ' ' + dbName)
            .setOnClickAction(CardService.newAction()
              .setFunctionName(this.functions.ON_DATABASE_SELECTED)
              .setParameters({ databaseId: db.id }));
          
          card.addSection(CardService.newCardSection()
            .addWidget(button));
            
          validDatabases++;
          
        } catch (dbError) {
          console.error('❌ Error processing database ' + (index + 1) + ': ' + dbError);
        }
      });
      
      console.log('✅ Added ' + validDatabases + ' valid databases to selection');
      
      if (validDatabases === 0) {
        card.addSection(CardService.newCardSection()
          .addWidget(CardService.newTextParagraph()
            .setText(messages.NO_DATABASES_FOUND)));
      }
      
      // Add back button
      card.addSection(CardService.newCardSection()
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText(this.buttons.BACK_TO_EMAIL)
            .setOnClickAction(CardService.newAction()
              .setFunctionName(this.functions.ON_GMAIL_MESSAGE)))));
      
      return card.build();
      
    } catch (error) {
      console.error('💥 Failed to build database selection: ' + error);
      return this.buildErrorCard(
        this.errors.CARD_TITLES.DATABASE,
        error.message
      );
    }
  }

  /**
   * Builds the main preview card
   */
  buildPreviewCard(e) {
    console.log('📧 Building preview card...');
    
    try {
      let targetDatabaseId = (e && e.parameters && e.parameters.databaseId) ? e.parameters.databaseId : null;
      
      if (targetDatabaseId) {
        console.log('🎯 Using database from parameters: ' + targetDatabaseId);
        this.updateConfigWithDatabase(targetDatabaseId);
      }

      // Get email data
      let email = null;
      try {
        const gmailService = getGmailService();
        email = gmailService.getSelectedEmailWithRecovery(e);
      } catch (emailError) {
        console.error('❌ Failed to fetch email: ' + emailError);
        email = this.createFallbackEmailData(e);
      }
      
      if (!email) {
        return this.buildAuthErrorCard();
      }

      // Clean email for display
      email = this.cleanEmailForDisplay(email);

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
        databases = this.getConfiguredDatabasesAsFallback();
      }
      
      if (databases.length === 0) {
        return this.buildDatabaseErrorCard();
      }
      
      // Build the card
      const card = CardService.newCardBuilder();
      
      // Add email preview section
      card.addSection(this.createEmailPreviewSection(email));
      
      // Add database selection section
      card.addSection(this.createDatabaseSelectionSection(config.DATABASES.gmail.id));
      
      // Add save options section
      card.addSection(this.createSaveOptionsSection(databases, config.DATABASES.gmail.id));
      
      console.log('✅ Preview card built with database: ' + config.DATABASES.gmail.name);
      return card.build();
      
    } catch (error) {
      console.error('💥 Error building preview card: ' + error);
      return this.buildErrorCard(
        this.errors.CARD_TITLES.PREVIEW,
        error.message
      );
    }
  }

  // === SECTION BUILDERS ===

  /**
   * Create homepage database section
   */
  createHomepageDatabaseSection(config) {
    const section = CardService.newCardSection()
      .setHeader(this.sections.DATABASE_SELECTION.HEADER);
    
    const dbName = config.DATABASES.gmail.name || this.constants.DATABASES.DEFAULT_NAMES.GMAIL;
    const dbId = config.DATABASES.gmail.id || 'Not set';
    
    section.addWidget(CardService.newTextParagraph()
      .setText(this.formatMessage(this.sections.DATABASE_SELECTION.WIDGETS.DATABASE_NAME, { name: dbName })));
    
    section.addWidget(CardService.newTextParagraph()
      .setText(this.formatMessage(this.sections.DATABASE_SELECTION.WIDGETS.DATABASE_ID, { id: dbId })));
    
    section.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(this.buttons.CHANGE_DATABASE)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.SHOW_DATABASE_SELECTION))));
    
    return section;
  }

  /**
   * Create homepage actions section
   */
  createHomepageActionsSection() {
    const section = CardService.newCardSection()
      .setHeader(this.messages.HOMEPAGE.QUICK_ACTIONS_HEADER);
    
    section.addWidget(CardService.newTextParagraph()
      .setText(this.messages.HOMEPAGE.SAVE_INSTRUCTIONS));
    
    section.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(this.buttons.QUICK_SAVE)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.QUICK_SAVE_EMAIL)))
      .addButton(CardService.newTextButton()
        .setText(this.buttons.ADVANCED_SAVE)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.SHOW_ADVANCED_MAPPING))));
    
    return section;
  }

  /**
   * Create homepage config section
   */
  createHomepageConfigSection() {
    const section = CardService.newCardSection()
      .setHeader(this.messages.HOMEPAGE.CONFIGURATION_HEADER);
    
    section.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(this.buttons.CONFIGURE_SETTINGS)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.SHOW_SETTINGS)))
      .addButton(CardService.newTextButton()
        .setText(this.buttons.TEST_CONNECTION)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.TEST_NOTION_CONNECTION))));
    
    return section;
  }

  /**
   * Create API key section for config card
   */
  createApiKeySection(config) {
    const section = CardService.newCardSection()
      .setHeader(this.sections.CONFIGURATION.API);
    
    section.addWidget(CardService.newTextInput()
      .setFieldName(this.ui.FORM_FIELDS.API_KEY)
      .setTitle(this.messages.CONFIGURATION.API_KEY_TITLE)
      .setValue(config.NOTION_API_KEY || '')
      .setHint(this.messages.CONFIGURATION.API_KEY_HINT)
      .setMultiline(false));
    
    section.addWidget(CardService.newTextParagraph()
      .setText(this.messages.CONFIGURATION.API_KEY_INSTRUCTIONS));
    
    section.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(this.buttons.OPEN_NOTION_INTEGRATIONS)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.SHOW_NOTION_INTEGRATIONS_HELP))));
    
    return section;
  }

  /**
   * Create database status section for config card
   */
  createDatabaseStatusSection(config) {
    const section = CardService.newCardSection()
      .setHeader(this.sections.CONFIGURATION.DATABASE_STATUS);
    
    section.addWidget(CardService.newKeyValue()
      .setTopLabel(this.messages.CONFIGURATION.GMAIL_DATABASE_LABEL)
      .setContent(config.DATABASES.gmail.name || this.messages.CONFIGURATION.NO_DATABASE_SELECTED)
      .setBottomLabel(this.formatMessage(this.messages.CONFIGURATION.DATABASE_ID_LABEL, { id: config.DATABASES.gmail.id || 'Not set' })));
    
    section.addWidget(CardService.newKeyValue()
      .setTopLabel(this.messages.CONFIGURATION.ATTACHMENTS_DATABASE_LABEL)
      .setContent(config.DATABASES.resources.name || this.messages.CONFIGURATION.NOT_CONFIGURED)
      .setBottomLabel(this.formatMessage(this.messages.CONFIGURATION.DATABASE_ID_LABEL, { id: config.DATABASES.resources.id || 'Not set' })));
    
    section.addWidget(CardService.newTextParagraph()
      .setText(this.messages.CONFIGURATION.DATABASE_CHANGE_INSTRUCTIONS));
    
    return section;
  }

  /**
   * Create database management section for config card
   */
  createDatabaseManagementSection() {
    const section = CardService.newCardSection()
      .setHeader(this.sections.CONFIGURATION.DATABASE_MANAGEMENT);
    
    section.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(this.buttons.CHANGE_DATABASE)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.SHOW_DATABASE_SELECTION)))
      .addButton(CardService.newTextButton()
        .setText(this.buttons.REFRESH_DATABASE_INFO)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.REFRESH_DATABASE_INFO)))
      .addButton(CardService.newTextButton()
        .setText(this.buttons.CONFIGURE_MAPPINGS)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.SHOW_ADVANCED_MAPPING))));
    
    return section;
  }

  /**
   * Create config actions section
   */
  createConfigActionsSection() {
    const section = CardService.newCardSection()
      .setHeader(this.sections.CONFIGURATION.ACTIONS);
    
    section.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(this.buttons.SAVE_API_KEY)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.SAVE_CONFIG)))
      .addButton(CardService.newTextButton()
        .setText(this.buttons.TEST_CONNECTION)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.TEST_NOTION_CONNECTION))));
    
    section.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(this.buttons.BACK_TO_HOME)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.ON_HOMEPAGE)))
      .addButton(CardService.newTextButton()
        .setText(this.buttons.BACK_TO_EMAIL)
        .setOnClickAction(CardService.newAction()
          .setFunctionName(this.functions.ON_GMAIL_MESSAGE))));
    
    return section;
  }

  /**
   * Create database selection section
   */
  createDatabaseSelectionSection(selectedDatabaseId) {
    try {
      console.log('🏗️ Creating database selection section for: ' + selectedDatabaseId);
      
      const section = CardService.newCardSection()
        .setHeader(this.sections.DATABASE_SELECTION.HEADER);
      
      const config = getEnhancedG2NConfig();
      const databases = config.DATABASES || {};
      
      // Show current database
      if (databases.gmail && databases.gmail.id) {
        section.addWidget(CardService.newTextParagraph()
          .setText(this.formatMessage(this.sections.DATABASE_SELECTION.WIDGETS.DATABASE_NAME, { name: databases.gmail.name })));
          
        section.addWidget(CardService.newTextParagraph()
          .setText(this.formatMessage(this.sections.DATABASE_SELECTION.WIDGETS.DATABASE_ID, { id: databases.gmail.id })));
      }
      
      // Add change database button
      section.addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText(this.buttons.CHANGE_DATABASE)
          .setOnClickAction(CardService.newAction()
            .setFunctionName(this.functions.ON_CHANGE_DATABASE_REQUEST))));
      
      return section;
      
    } catch (error) {
      console.error('❌ Error creating database selection section: ' + error);
      return CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.DATABASE_SELECTION.CONFIGURATION_REQUIRED));
    }
  }

  /**
   * Create save options section
   */
  createSaveOptionsSection(databases, selectedDatabaseId) {
    console.log('💾 Creating save options section...');
    
    const section = CardService.newCardSection()
      .setHeader(this.sections.SAVE_OPTIONS.HEADER);

    // Include body checkbox
    const includeBody = CardService.newSelectionInput()
      .setFieldName(this.ui.FORM_FIELDS.INCLUDE_BODY)
      .setTitle(this.messages.SAVE_OPTIONS.INCLUDE_BODY)
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .addItem(this.sections.SAVE_OPTIONS.WIDGETS.INCLUDE_BODY, 'true', true);

    section.addWidget(includeBody);

    // Action buttons
    const buttonSet = CardService.newButtonSet();

    buttonSet.addButton(CardService.newTextButton()
      .setText(this.buttons.QUICK_SAVE)
      .setOnClickAction(CardService.newAction()
        .setFunctionName(this.functions.QUICK_SAVE_EMAIL)));

    buttonSet.addButton(CardService.newTextButton()
      .setText(this.buttons.ADVANCED_SAVE)
      .setOnClickAction(CardService.newAction()
        .setFunctionName(this.functions.SHOW_ADVANCED_MAPPING)));

    buttonSet.addButton(CardService.newTextButton()
      .setText(this.buttons.CONFIGURE_SETTINGS)
      .setOnClickAction(CardService.newAction()
        .setFunctionName(this.functions.SHOW_SETTINGS)));

    section.addWidget(buttonSet);

    return section;
  }

  /**
   * Enhanced email preview section
   */
  createEmailPreviewSection(email) {
    console.log('👀 Creating email preview section...');
    
    const section = CardService.newCardSection()
      .setHeader(this.sections.EMAIL_PREVIEW.HEADER);
    
    try {
      // Clean subject display
      let displaySubject = email.subject || this.messages.EMAIL_PREVIEW.NO_SUBJECT;
      displaySubject = this.cleanDisplayText(displaySubject);
      
      section.addWidget(CardService.newTextParagraph()
        .setText(this.formatMessage(this.sections.EMAIL_PREVIEW.WIDGETS.SUBJECT, { subject: displaySubject })));
      
      // Clean sender display
      let displaySender = email.sender || this.messages.EMAIL_PREVIEW.UNKNOWN_SENDER;
      displaySender = this.cleanDisplayText(displaySender);
      
      section.addWidget(CardService.newTextParagraph()
        .setText(this.formatMessage(this.sections.EMAIL_PREVIEW.WIDGETS.FROM, { sender: displaySender })));
      
      // Date
      let dateString = this.messages.EMAIL_PREVIEW.UNKNOWN_DATE;
      try {
        dateString = new Date(email.dateSent).toLocaleString();
      } catch (dateError) {
        dateString = new Date().toLocaleString();
      }
      
      section.addWidget(CardService.newTextParagraph()
        .setText(this.formatMessage(this.sections.EMAIL_PREVIEW.WIDGETS.DATE, { date: dateString })));
      
      // Email body preview
      if (email.body && email.body.trim().length > 0) {
        let cleanBody = this.cleanDisplayText(email.body);
        
        // Clean up the body text
        try {
          const gmailService = getGmailService();
          cleanBody = gmailService.cleanEmailBody(cleanBody);
        } catch (cleanError) {
          console.warn('Email body cleaning failed: ' + cleanError);
          cleanBody = cleanBody.substring(0, 500);
        }
        
        let bodySnippet = cleanBody;
        if (cleanBody.length > 500) {
          bodySnippet = cleanBody.substring(0, 500) + '...';
        }
        
        // Only show if we have meaningful content
        if (bodySnippet.trim().length > 10) {
          section.addWidget(CardService.newTextParagraph()
            .setText(this.formatMessage(this.sections.EMAIL_PREVIEW.WIDGETS.PREVIEW, { content: bodySnippet })));
        } else {
          section.addWidget(CardService.newTextParagraph()
            .setText(this.formatMessage(this.sections.EMAIL_PREVIEW.WIDGETS.PREVIEW, { content: this.messages.EMAIL_PREVIEW.CONTENT_UNAVAILABLE })));
        }
      } else {
        section.addWidget(CardService.newTextParagraph()
          .setText(this.formatMessage(this.sections.EMAIL_PREVIEW.WIDGETS.PREVIEW, { content: this.messages.EMAIL_PREVIEW.NO_CONTENT })));
      }
      
      // Add attachment info if available
      if (email.attachments && email.attachments.length > 0) {
        section.addWidget(CardService.newTextParagraph()
          .setText(this.formatMessage(this.messages.EMAIL_PREVIEW.ATTACHMENTS_COUNT, { count: email.attachments.length })));
      }
      
    } catch (error) {
      console.error('Error creating email preview section: ' + error);
      section.addWidget(CardService.newTextParagraph()
        .setText(this.messages.EMAIL_PREVIEW.ERROR_DISPLAYING));
    }
    
    return section;
  }

  // === ADVANCED MAPPING ===
  
  /**
   * Build advanced mapping card using PropertyMapper
   */
  buildAdvancedMappingCard(databaseId) {
    try {
      console.log('⚙️ Building advanced mapping card for database: ' + databaseId);
      
      const propertyMapper = new PropertyMapper();
      const currentMappings = propertyMapper.loadMappings(databaseId);
      
      // Use the PropertyMapper's interface directly
      return propertyMapper.createMappingInterface(databaseId, currentMappings);
      
    } catch (error) {
      console.error('Error building advanced mapping card: ' + error);
      return this.buildErrorCard(
        this.errors.CARD_TITLES.MAPPING,
        'Failed to load property mapping interface: ' + error.message
      );
    }
  }

  /**
   * Enhanced advanced mapping card with property creation
   */
  buildEnhancedAdvancedMappingCard(databaseId) {
    try {
      console.log('⚙️ Building ENHANCED advanced mapping card with property creation for database: ' + databaseId);
      
      const propertyMapper = new PropertyMapper();
      const emailService = new EmailService();
      const notionService = new NotionService();
      
      // Get current mappings
      const currentMappings = propertyMapper.loadMappings(databaseId);
      
      // Get database and properties
      const database = notionService.verifyG2NDatabaseAccess(databaseId);
      const databaseProperties = database.properties || {};
      const databaseName = (database.title && database.title[0] && database.title[0].plain_text) ? database.title[0].plain_text : 'Database';
      
      console.log('📋 Building enhanced mapping for: ' + databaseName + ' Properties: ' + Object.keys(databaseProperties));
      
      // Build enhanced card
      const card = CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
          .setTitle(this.icons.MAPPING + ' ' + this.messages.ADVANCED_MAPPING.TITLE));
      
      // Add database selection section
      const databaseSection = this.createDatabaseSelectionSection(databaseId);
      card.addSection(databaseSection);
      
      // Add mapping instructions
      card.addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText(this.formatMessage(this.messages.ADVANCED_MAPPING.DATABASE_LABEL, { name: databaseName })))
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.ADVANCED_MAPPING.INSTRUCTIONS)));

      // Create enhanced mapping sections for each email field
      this.emailFields.DEFINITIONS.forEach(emailField => {
        const mappingSection = this.createEnhancedMappingSection(
          emailField, 
          databaseProperties, 
          currentMappings[emailField.id] || '', 
          databaseId
        );
        card.addSection(mappingSection);
      });

      // Enhanced action buttons
      card.addSection(CardService.newCardSection()
        .setHeader(this.messages.ADVANCED_MAPPING.ACTIONS_HEADER)
        .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText(this.buttons.SAVE_MAPPINGS)
          .setOnClickAction(CardService.newAction()
            .setFunctionName(this.functions.SAVE_ADVANCED_MAPPING)
            .setParameters({ 
              databaseId: databaseId,
              useSavedMappings: 'true'  // MUST be string, not boolean
            })))
          .addButton(CardService.newTextButton()
            .setText(this.buttons.AUTO_DETECT)
            .setOnClickAction(CardService.newAction()
              .setFunctionName(this.functions.AUTO_DETECT_MAPPING)
              .setParameters({ databaseId: databaseId })))
          .addButton(CardService.newTextButton()
            .setText(this.buttons.BACK_TO_EMAIL)
            .setOnClickAction(CardService.newAction()
              .setFunctionName(this.functions.ON_GMAIL_MESSAGE)))));

      console.log('✅ Enhanced mapping card built successfully');
      return card.build();

    } catch (error) {
      console.error('❌ Error building enhanced mapping card: ' + error);
      
      // Fallback to original PropertyMapper
      console.log('🔄 Falling back to original PropertyMapper...');
      const propertyMapper = new PropertyMapper();
      const currentMappings = propertyMapper.loadMappings(databaseId);
      return propertyMapper.createMappingInterface(databaseId, currentMappings);
    }
  }

  /**
   * Enhanced mapping section with create property option
   */
  createEnhancedMappingSection(emailField, databaseProperties, currentMapping, databaseId) {
    const emailService = new EmailService();
    
    const section = CardService.newCardSection()
      .setHeader(emailField.name)
      .addWidget(CardService.newTextParagraph()
        .setText(emailField.description));

    // Get compatible property types for this email field
    const compatibleTypes = emailField.compatibleTypes || ['rich_text'];

    // Filter existing compatible properties
    const compatibleProperties = Object.entries(databaseProperties)
      .filter(([propName, prop]) => compatibleTypes.includes(prop.type))
      .map(([propName, prop]) => ({ name: propName, type: prop.type }));

    console.log('🔧 ' + emailField.id + ': Compatible properties: ' + compatibleProperties.map(p => p.name));

    // Enhanced dropdown with create option
    const dropdown = CardService.newSelectionInput()
      .setFieldName(this.ui.FORM_FIELDS.MAPPING_PREFIX + emailField.id)
      .setTitle(this.messages.ADVANCED_MAPPING.MAP_TO_PROPERTY)
      .setType(CardService.SelectionInputType.DROPDOWN);

    // Add options
    dropdown.addItem(this.messages.ADVANCED_MAPPING.DONT_MAP, '', currentMapping === '');

    // Add existing compatible properties
    compatibleProperties.forEach(prop => {
      const isSelected = currentMapping === prop.name;
      dropdown.addItem(prop.name, prop.name, isSelected);
    });

    // Add create new property option
    dropdown.addItem(this.messages.ADVANCED_MAPPING.CREATE_NEW_PROPERTY, 'CREATE_NEW', false);

    section.addWidget(dropdown);

    // Property creation options (shown when user selects CREATE_NEW)
    const typeDropdown = CardService.newSelectionInput()
      .setFieldName(this.ui.FORM_FIELDS.NEW_PROP_TYPE_PREFIX + emailField.id)
      .setTitle(this.messages.ADVANCED_MAPPING.NEW_PROPERTY_TYPE)
      .setType(CardService.SelectionInputType.DROPDOWN);

    compatibleTypes.forEach(type => {
      const displayName = this.emailFields.PROPERTY_TYPE_DISPLAY_NAMES[type] || type;
      typeDropdown.addItem(displayName, type, type === 'rich_text');
    });

    section.addWidget(typeDropdown);

    const nameInput = CardService.newTextInput()
      .setFieldName(this.ui.FORM_FIELDS.NEW_PROP_NAME_PREFIX + emailField.id)
      .setTitle(this.messages.ADVANCED_MAPPING.NEW_PROPERTY_NAME)
      .setHint(this.formatMessage(this.messages.ADVANCED_MAPPING.NEW_PROPERTY_HINT, { suggestion: emailService.suggestPropertyName(emailField.id) }))
      .setValue(emailService.suggestPropertyName(emailField.id));

    section.addWidget(nameInput);

    return section;
  }

  // === ERROR CARDS ===

  /**
   * Build authentication error card
   */
  buildAuthErrorCard() {
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(this.errors.CARD_TITLES.AUTH))
      .addSection(CardService.newCardSection()
        .setHeader(this.messages.AUTH_ERROR.TITLE)
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.AUTH_ERROR.DESCRIPTION))
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.AUTH_ERROR.COMMON_ISSUES_HEADER))
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.AUTH_ERROR.ISSUE_REAUTH))
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.AUTH_ERROR.ISSUE_PERMISSIONS))
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.AUTH_ERROR.ISSUE_ACCESS))
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText(this.buttons.RELOAD)
            .setOnClickAction(CardService.newAction()
              .setFunctionName(this.functions.ON_GMAIL_MESSAGE)))
          .addButton(CardService.newTextButton()
            .setText(this.buttons.CONFIGURE_SETTINGS)
            .setOnClickAction(CardService.newAction()
              .setFunctionName(this.functions.SHOW_SETTINGS)))))
      .build();
  }

  /**
   * Build database error card
   */
  buildDatabaseErrorCard() {
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(this.errors.CARD_TITLES.DATABASE))
      .addSection(CardService.newCardSection()
        .setHeader(this.messages.DATABASE_ERROR.TITLE)
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.DATABASE_ERROR.DESCRIPTION))
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.DATABASE_ERROR.COMMON_SOLUTIONS_HEADER))
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.DATABASE_ERROR.SOLUTION_API_KEY))
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.DATABASE_ERROR.SOLUTION_DATABASES_EXIST))
        .addWidget(CardService.newTextParagraph()
          .setText(this.messages.DATABASE_ERROR.SOLUTION_SHARE_DATABASES))
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText(this.buttons.CONFIGURE_SETTINGS)
            .setOnClickAction(CardService.newAction()
              .setFunctionName(this.functions.SHOW_SETTINGS)))
          .addButton(CardService.newTextButton()
            .setText(this.buttons.REFRESH_DATABASES)
            .setOnClickAction(CardService.newAction()
              .setFunctionName(this.functions.SHOW_DATABASE_SELECTION)))
          .addButton(CardService.newTextButton()
            .setText(this.buttons.TEST_CONNECTION)
            .setOnClickAction(CardService.newAction()
              .setFunctionName(this.functions.TEST_NOTION_CONNECTION)))))
      .build();
  }

/**
 * Build error card for consistent error display - FIXED VERSION
 */
buildErrorCard(title, error, suggestion) {
  try {
    console.log('🛠️ Building error card:', { title, error });
    
    // Use safe access to card titles
    let cardTitle = title;
    if (!cardTitle && this.errors && this.errors.CARD_TITLES) {
      cardTitle = this.errors.CARD_TITLES.DEFAULT || 'Error';
    }
    
    const displaySuggestion = suggestion || 
      (this.errors && this.errors.SUGGESTIONS && this.errors.SUGGESTIONS.DEFAULT) || 
      'Please check your configuration and try again.';
    
    const icon = (this.icons && this.icons.ERROR) || '❌';
    
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle(icon + ' ' + cardTitle))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText(error || 'An unknown error occurred.'))
        .addWidget(CardService.newTextParagraph()
          .setText(displaySuggestion))
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText((this.buttons && this.buttons.RETRY) || 'Retry')
            .setOnClickAction(CardService.newAction()
              .setFunctionName((this.functions && this.functions.SHOW_SETTINGS) || 'showG2NSettings')))
          .addButton(CardService.newTextButton()
            .setText((this.buttons && this.buttons.BACK_TO_HOME) || 'Back to Home')
            .setOnClickAction(CardService.newAction()
              .setFunctionName((this.functions && this.functions.ON_HOMEPAGE) || 'onG2NHomepage')))))
      .build();
      
  } catch (cardError) {
    console.error('💥 Critical error building error card:', cardError);
    
    // Ultimate fallback - simplest possible error card
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('❌ Error'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('An error occurred: ' + (error || 'Unknown error')))
        .addWidget(CardService.newTextButton()
          .setText('Try Again')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onG2NHomepage'))))
      .build();
  }
}

  // === UTILITY METHODS ===

  /**
   * Create fallback email data when Gmail API fails
   */
  createFallbackEmailData(e) {
    console.log('🔄 Creating fallback email data...');
    
    return {
      subject: (e && e.gmail && e.gmail.subject) ? e.gmail.subject : this.messages.EMAIL_PREVIEW.NO_SUBJECT,
      sender: (e && e.gmail && e.gmail.from) ? e.gmail.from : this.messages.EMAIL_PREVIEW.UNKNOWN_SENDER,
      dateSent: new Date(),
      body: this.messages.EMAIL_PREVIEW.CONTENT_UNAVAILABLE,
      id: (e && e.gmail && e.gmail.messageId) ? e.gmail.messageId : 'unknown',
      threadId: (e && e.gmail && e.gmail.threadId) ? e.gmail.threadId : 'unknown',
      gmailLink: 'https://mail.google.com/mail/u/0/#inbox/' + ((e && e.gmail && e.gmail.messageId) ? e.gmail.messageId : '')
    };
  }

  /**
   * Get configured databases as fallback when search fails
   */
  getConfiguredDatabasesAsFallback() {
    try {
      console.log('🔄 Getting configured databases as fallback...');
      const databases = [];
      const config = getEnhancedG2NConfig();
      
      // Check if we have configured database IDs
      if (config.DATABASES.gmail.id) {
        try {
          const notionService = new NotionService();
          const db = notionService.verifyG2NDatabaseAccess(config.DATABASES.gmail.id);
          const dbName = this.getCleanDatabaseName(db);
          databases.push({ name: dbName, id: config.DATABASES.gmail.id });
          console.log('✅ Added configured Gmail database: ' + dbName);
        } catch (error) {
          console.error('Configured Gmail database not accessible: ' + error);
        }
      }
      
      if (config.DATABASES.resources.id) {
        try {
          const notionService = new NotionService();
          const db = notionService.verifyG2NDatabaseAccess(config.DATABASES.resources.id);
          const dbName = this.getCleanDatabaseName(db);
          databases.push({ name: dbName, id: config.DATABASES.resources.id });
          console.log('✅ Added configured Resources database: ' + dbName);
        } catch (error) {
          console.error('Configured Resources database not accessible: ' + error);
        }
      }
      
      return databases;
    } catch (error) {
      console.error('Error getting configured databases: ' + error);
      return [];
    }
  }

  /**
   * Get clean database name with enhanced fallbacks
   */
  getCleanDatabaseName(database) {
    try {
      if (!database) return this.constants.DATABASES.DEFAULT_NAMES.GMAIL;
      
      let databaseName = this.constants.DATABASES.DEFAULT_NAMES.GMAIL;
      
      // Try multiple ways to get the name
      if (database.title && database.title.length > 0) {
        // Notion API format
        databaseName = database.title[0].plain_text || this.constants.DATABASES.DEFAULT_NAMES.GMAIL;
      } else if (database.object === 'database' && database.title) {
        // Direct title property
        if (typeof database.title === 'string') {
          databaseName = database.title;
        } else if (Array.isArray(database.title)) {
          databaseName = database.title.map(t => t.plain_text || '').join('') || this.constants.DATABASES.DEFAULT_NAMES.GMAIL;
        }
      } else if (database.name) {
        // Name property
        databaseName = database.name;
      }
      
      // Clean up the name
      databaseName = this.cleanDisplayText(databaseName);
      
      if (databaseName === '') databaseName = this.constants.DATABASES.DEFAULT_NAMES.GMAIL;
      
      console.log('🏷️ Cleaned database name: ' + databaseName);
      return databaseName;
      
    } catch (error) {
      console.error('Error getting clean database name: ' + error);
      return this.constants.DATABASES.DEFAULT_NAMES.GMAIL;
    }
  }

  /**
   * Clean email data for display - remove technical IDs
   */
  cleanEmailForDisplay(email) {
    if (!email) return email;
    
    try {
      const cleanEmail = {...email};
      
      // Clean subject
      if (cleanEmail.subject) {
        cleanEmail.subject = this.cleanDisplayText(cleanEmail.subject);
      }
      
      // Clean sender
      if (cleanEmail.sender) {
        cleanEmail.sender = this.cleanDisplayText(cleanEmail.sender);
      }
      
      // Clean body preview
      if (cleanEmail.body) {
        cleanEmail.body = this.cleanDisplayText(cleanEmail.body);
      }
      
      return cleanEmail;
    } catch (error) {
      console.error('Error cleaning email for display: ' + error);
      return email;
    }
  }

  /**
   * Clean display text by removing technical IDs and patterns
   */
  cleanDisplayText(text) {
    if (!text) return text;
    
    let cleanText = text.toString();
    
    // Remove message IDs and other technical patterns
    if (cleanText.includes('msg-a:r')) {
      cleanText = cleanText.replace(/msg-a:r\d+/g, '');
    }
    
    // Remove UUIDs
    cleanText = cleanText.replace(/[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/gi, '');
    
    // Clean up whitespace
    cleanText = cleanText.replace(/\s+/g, ' ').trim();
    
    return cleanText;
  }

  /**
   * Update config with selected database
   */
  updateConfigWithDatabase(databaseId) {
    console.log('🎯 Updating config with database from parameters: ' + databaseId);
    const config = getEnhancedG2NConfig();
    
    if (config.DATABASES.gmail.id !== databaseId) {
      config.DATABASES.gmail.id = databaseId;
      
      // Try to get the database name
      try {
        const notionService = new NotionService();
        const database = notionService.verifyG2NDatabaseAccess(databaseId);
        config.DATABASES.gmail.name = this.getCleanDatabaseName(database);
      } catch (error) {
        console.warn('Could not fetch database name: ' + error);
        config.DATABASES.gmail.name = this.constants.DATABASES.DEFAULT_NAMES.GMAIL;
      }
      
      saveG2NConfigToStorage(config);
    }
  }

  /**
   * Format message with parameters
   */
  formatMessage(message, params) {
    let formatted = message;
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        formatted = formatted.replace(new RegExp('{' + key + '}', 'g'), params[key]);
      }
    }
    return formatted;
  }

  /**
   * Build setup status card
   */
  buildSetupStatusCard() {
    return this.buildG2NHomepageCard();
  }

  /**
   * Build message context card
   */
  buildMessageContextCard(messageId) {
    return this.buildPreviewCard({ gmail: { messageId: messageId } });
  }

getErrorCardTitle(titleKey) {
  return (this.errors && this.errors.CARD_TITLES && this.errors.CARD_TITLES[titleKey]) || 
         (this.errors && this.errors.CARD_TITLES && this.errors.CARD_TITLES.DEFAULT) || 
         'Error';
}

}

// =============================================================================
// GLOBAL FUNCTIONS FOR APPS SCRIPT COMPATIBILITY
// =============================================================================

/**
 * Global function to show settings - FIXED VERSION
 */
function showG2NSettings() {
  try {
    console.log('⚙️ Showing settings...');
    
    // Try to create UIService - with safety check
    if (typeof UIService === 'undefined') {
      console.error('❌ UIService class is not defined!');
      return buildDirectSettingsCard();
    }
    
    const uiService = new UIService();
    return uiService.buildConfigCard();
    
  } catch (error) {
    console.error('❌ Failed to show settings: ' + error);
    
    // Emergency fallback card
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('❌ Settings Error'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Failed to load settings: ' + error.message))
        .addWidget(CardService.newTextButton()
          .setText('Try Again')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onG2NHomepage'))))
      .build();
  }
}

/**
 * Build settings card directly without UIService
 */
function buildDirectSettingsCard() {
  console.log('🔄 Building direct settings card (UIService not available)...');
  
  const config = getEnhancedG2NConfig();
  
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('⚙️ Gmail to Notion Settings'))
    .addSection(CardService.newCardSection()
      .setHeader('API Configuration')
      .addWidget(CardService.newTextInput()
        .setFieldName('apiKey')
        .setTitle('Notion API Key')
        .setValue(config.NOTION_API_KEY || '')
        .setHint('Enter your Notion integration API key (starts with ntn_ or secret_)')))
    .addSection(CardService.newCardSection()
      .setHeader('Current Configuration')
      .addWidget(CardService.newTextParagraph()
        .setText(`Gmail Database: ${config.DATABASES.gmail.name || 'Not set'}`))
      .addWidget(CardService.newTextParagraph()
        .setText(`Resources Database: ${config.DATABASES.resources.name || 'Not set'}`)))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('💾 Save')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('saveG2NConfigSettings')))
        .addButton(CardService.newTextButton()
          .setText('🗄️ Select Database')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showG2NDatabaseSelection')))
        .addButton(CardService.newTextButton()
          .setText('🏠 Home')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onG2NHomepage')))))
    .build();
}
/**
 * Build database selection card with CORRECT current selection - SAFE VERSION
 */
function showG2NDatabaseSelection() {
  try {
    console.log('🗄️ Building database selection with correct current selection...');
    
    const config = getEnhancedG2NConfig();
    const currentDatabaseId = config.DATABASES.gmail.id;
    const currentDatabaseName = config.DATABASES.gmail.name;
    
    console.log('🔍 Current database in config:', {
      id: currentDatabaseId,
      name: currentDatabaseName
    });
    
    let databases = [];
    
    // SAFE: Check if NotionService is available
    if (typeof NotionService !== 'undefined') {
      try {
        const notionService = new NotionService();
        databases = notionService.fetchG2NDatabasesWithCache();
        console.log(`✅ Found ${databases.length} databases via NotionService`);
      } catch (serviceError) {
        console.error('❌ NotionService failed:', serviceError);
        databases = getConfiguredDatabasesAsFallback();
      }
    } else {
      console.error('❌ NotionService is not defined');
      databases = getConfiguredDatabasesAsFallback();
    }
    
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('🗄️ Select Gmail Database'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Choose which Notion database to save emails to:')));
    
    // Current Selection Section
    const currentSection = CardService.newCardSection()
      .setHeader('Current Selection');
    
    if (currentDatabaseId) {
      currentSection.addWidget(CardService.newTextParagraph()
        .setText(`**${currentDatabaseName}**`))
        .addWidget(CardService.newTextParagraph()
        .setText(`ID: ${currentDatabaseId.substring(0, 8)}...`));
    } else {
      currentSection.addWidget(CardService.newTextParagraph()
        .setText('No database selected'));
    }
    
    card.addSection(currentSection);
    
    // Available Databases Section
    if (databases.length > 0) {
      const availableSection = CardService.newCardSection()
        .setHeader('Available Databases');
      
      databases.forEach(db => {
        const isSelected = db.id === currentDatabaseId;
        const buttonText = isSelected ? `✅ ${db.name}` : `📊 ${db.name}`;
        
        availableSection.addWidget(CardService.newTextButton()
          .setText(buttonText)
          .setOnClickAction(CardService.newAction()
            .setFunctionName('selectG2NDatabase')
            .setParameters({ 
              databaseId: db.id, 
              databaseName: db.name,
              databaseType: 'gmail'
            })));
      });
      
      card.addSection(availableSection);
    } else {
      // No databases found
      const noDatabasesSection = CardService.newCardSection()
        .setHeader('❌ No Databases Found')
        .addWidget(CardService.newTextParagraph()
          .setText('No databases could be loaded. This could be because:'))
        .addWidget(CardService.newTextParagraph()
          .setText('• Notion API key is invalid'))
        .addWidget(CardService.newTextParagraph()
          .setText('• No databases exist in your workspace'))
        .addWidget(CardService.newTextParagraph()
          .setText('• There are permission issues'));
      
      card.addSection(noDatabasesSection);
    }
    
    // Action buttons
    const actionSection = CardService.newCardSection()
      .setHeader('Actions');
    
    actionSection.addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText('🔄 Refresh Databases')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('refreshG2NDatabases')))
      .addButton(CardService.newTextButton()
        .setText('⚙️ Configure Settings')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('showG2NSettings')))
      .addButton(CardService.newTextButton()
        .setText('↩️ Back to Home')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('onG2NHomepage'))));
    
    card.addSection(actionSection);
    
    console.log('✅ Database selection card built successfully');
    return card.build();
    
  } catch (error) {
    console.error('❌ Database selection failed:', error);
    
    // Emergency fallback card
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('❌ Database Selection Error'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Unable to load database selection:'))
        .addWidget(CardService.newTextParagraph()
          .setText(`**Error:** ${error.message}`)))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText('⚙️ Configure Settings')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('showG2NSettings')))
          .addButton(CardService.newTextButton()
            .setText('🏠 Back to Home')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('onG2NHomepage')))))
      .build();
  }
}

/**
 * Show Notion integrations help
 */
function showNotionIntegrationsHelp() {
  return CardService.newActionResponseBuilder()
    .setOpenLink(CardService.newOpenLink()
      .setUrl('https://www.notion.so/my-integrations')
      .setOpenAs(CardService.OpenAs.FULL_SIZE)
      .setOnClose(CardService.OnClose.NOTHING))
    .build();
}

// Global function for backward compatibility
function getUIService() {
  return new UIService();
}

// =============================================================================
// HELPER FUNCTIONS 
// =============================================================================
/**
 * Get configured databases as fallback - LOCAL VERSION
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
 * Test UIService initialization
 */
function testUIService() {
  console.log('🧪 Testing UIService initialization...');
  
  try {
    const uiService = new UIService();
    
    console.log('✅ UIService created successfully:', {
      hasConstants: !!uiService.constants,
      hasErrors: !!uiService.errors,
      hasCardTitles: !!(uiService.errors && uiService.errors.CARD_TITLES),
      cardTitles: uiService.errors && uiService.errors.CARD_TITLES
    });
    
    // Test building an error card
    const testCard = uiService.buildErrorCard('Test', 'Test error message');
    console.log('✅ Error card built successfully');
    
    return {
      success: true,
      uiService: {
        hasErrors: !!uiService.errors,
        hasCardTitles: !!(uiService.errors && uiService.errors.CARD_TITLES)
      }
    };
    
  } catch (error) {
    console.error('❌ UIService test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
testUIService();


function comprehensiveTest() {
  console.log('🧪 Comprehensive UIService test...');
  
  try {
    // Test 1: Direct UIService instantiation
    console.log('\n1. Testing UIService constructor...');
    const uiService = new UIService();
    console.log('✅ UIService created');
    
    // Test 2: Check all card titles
    console.log('\n2. Checking all card titles...');
    const cardTitles = uiService.errors.CARD_TITLES;
    console.log('Card titles:', cardTitles);
    
    // Test 3: Try to access each card title
    const titles = ['HOMEPAGE', 'SETTINGS', 'DATABASE', 'AUTH', 'PREVIEW', 'MAPPING'];
    titles.forEach(title => {
      const value = cardTitles[title];
      console.log(`${title}: ${value || 'MISSING'}`);
    });
    
    // Test 4: Call each method that might fail
    console.log('\n3. Testing error card methods...');
    
    console.log('Testing buildAuthErrorCard...');
    try {
      const authCard = uiService.buildAuthErrorCard();
      console.log('✅ buildAuthErrorCard succeeded');
    } catch (authError) {
      console.error('❌ buildAuthErrorCard failed:', authError.message);
    }
    
    console.log('Testing buildDatabaseErrorCard...');
    try {
      const dbCard = uiService.buildDatabaseErrorCard();
      console.log('✅ buildDatabaseErrorCard succeeded');
    } catch (dbError) {
      console.error('❌ buildDatabaseErrorCard failed:', dbError.message);
    }
    
    console.log('Testing buildConfigurationRequiredCard...');
    try {
      const configCard = uiService.buildConfigurationRequiredCard();
      console.log('✅ buildConfigurationRequiredCard succeeded');
    } catch (configError) {
      console.error('❌ buildConfigurationRequiredCard failed:', configError.message);
    }
    
    return {
      success: true,
      uiService: {
        hasErrors: !!uiService.errors,
        cardTitles: uiService.errors.CARD_TITLES
      }
    };
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
    console.error('Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
}

comprehensiveTest();

function testSettings() {
  console.log('🧪 Testing showG2NSettings...');
  
  try {
    const card = showG2NSettings();
    console.log('✅ showG2NSettings succeeded');
    return true;
  } catch (error) {
    console.error('❌ showG2NSettings failed:', error);
    return false;
  }
}

testSettings();