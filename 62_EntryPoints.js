/**
 * @fileoverview Google Apps Script entry points
 * @description Global functions called by GAS triggers
 */

var app;

/**
 * Checks if the app is initialized, and if not, runs bootstrap.
 * This prevents "app is not defined" ReferenceErrors.
 * @returns {Application} The initialized Application instance.
 */
function getApp() {
  if (!app) {
    app = bootstrap();
  }
  return app;
}

/**
 * Helper: safely build error card
 * @private
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {CardService.Card} Error card
 */
function _buildErrorCardSafely(title, message) {
  if (typeof buildErrorCard === 'function') {
    return buildErrorCard(title, message);
  }
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader().setTitle(`❌ ${title}`)
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText(message)
        )
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText('🔄 Retry')
                .setOnClickAction(
                  CardService.newAction().setFunctionName('showG2NSettings')
                )
            )
        )
    )
    .build();
}

/**
 * Homepage trigger
 * @param {Object} event - GAS event
 * @returns {CardService.Card} Homepage card
 */
function onG2NHomepage(event) {
  try {
    return getApp().showSettings(event);
  } catch (error) {
    console.error('Homepage error:', error);
    return _buildErrorCardSafely('Homepage Error', error.message || 'Unknown error');
  }
}

/**
 * Gmail message trigger
 * @param {Object} event - GAS event with gmail data
 * @returns {CardService.Card} Email preview card
 */
function onG2NGmailMessage(event) {
  try {
    if (typeof getTrialGuardCard_ === 'function') {
      const guardCard = getTrialGuardCard_();
      if (guardCard) return guardCard;
    }
    return getApp().showEmailPreview(event);
  } catch (error) {
    console.error('Email preview error:', error);
    return _buildErrorCardSafely('Email Preview Error', error.message || 'Unknown error');
  }
}

/**
 * Show email preview
 * @param {Object} event - GAS event with gmail data
 * @returns {CardService.Card} Email preview card
 */
function showEmailPreview(event) {
  try {
    if (typeof getTrialGuardCard_ === 'function') {
      const guardCard = getTrialGuardCard_();
      if (guardCard) return guardCard;
    }
    return getApp().showEmailPreview(event);
  } catch (error) {
    console.error('Email preview error:', error);
    return _buildErrorCardSafely('Error', error.message || 'Unknown error');
  }
}

/**
 * Show preview from the add-on menu
 * @param {Object} event - GAS event
 * @returns {CardService.Card} Email preview card
 */
function showPreviewFromMenu(event) {
  try {
    if (typeof getTrialGuardCard_ === 'function') {
      const guardCard = getTrialGuardCard_();
      if (guardCard) return guardCard;
    }
    return getApp().showEmailPreview(event);
  } catch (error) {
    console.error('Preview menu error:', error);
    return _buildErrorCardSafely('Preview Error', error.message || 'Unknown error');
  }
}

/**
 * Show settings
 * @param {Object} event - GAS event
 * @returns {CardService.Card} Settings card
 */
function showG2NSettings(event) {
  try {
    if (typeof getTrialGuardCard_ === 'function') {
      const guardCard = getTrialGuardCard_();
      if (guardCard) return guardCard;
    }
    return getApp().showSettings(event);
  } catch (error) {
    console.error('Settings error:', error);
    return _buildErrorCardSafely('Settings Error', error.message || 'Unknown error');
  }
}

/**
 * Show attachments configuration card
 * @param {Object} event - GAS event
 * @returns {CardService.Card} Attachments configuration card
 */
function showAttachmentsConfiguration(event) {
  try {
    if (typeof getTrialGuardCard_ === 'function') {
      const guardCard = getTrialGuardCard_();
      if (guardCard) return guardCard;
    }
    getApp(); // ensure bootstrap
    return buildAttachmentsCard();
  } catch (error) {
    console.error('showAttachmentsConfiguration error:', error);
    return _buildErrorCardSafely('Attachments Error', error.message || 'Unknown error');
  }
}

/**
 * Build attachments management card
 * @returns {CardService.Card} Attachments card
 */
function buildAttachmentsCard() {
  try {
    const app = getApp();
    const container = app.getContainer();
    const notionService = container.resolve('notionService');
    const configRepo = container.resolve('configRepo');
    
    // List databases
    let databases = [];
    try {
      databases = notionService.listDatabases() || [];
    } catch (e) {
      console.warn('Could not list databases', e);
      return _buildErrorCardSafely('Notion Error', 'Could not list databases. Check API key and permissions.');
    }
    
    const currentDbId = configRepo.get('databaseId') || '';
    const header = CardService.newCardHeader().setTitle('📎 Attachments');
    const section = CardService.newCardSection();
    
    if (!databases || databases.length === 0) {
      section.addWidget(
        CardService.newTextParagraph().setText('No Notion databases found.')
      );
    } else {
      const selection = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.RADIO_BUTTON)
        .setFieldName('selected_database_for_attachments')
        .setTitle('Choose Database');
      
      databases.forEach(db => {
        selection.addItem(db.name, db.id, db.id === currentDbId);
      });
      
      section.addWidget(selection);
      section.addWidget(
        CardService.newTextInput()
          .setFieldName('attachment_property_name')
          .setTitle('Property name for files')
          .setValue('Attachments')
          .setHint('Notion property name to store files')
      );
      
      const actions = CardService.newButtonSet()
        .addButton(
          CardService.newTextButton()
            .setText('✅ Ensure Field')
            .setBackgroundColor('#0F9D58')
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOnClickAction(
              CardService.newAction().setFunctionName('ensureAttachmentField')
            )
        )
        .addButton(
          CardService.newTextButton()
            .setText('🔙 Back')
            .setOnClickAction(
              CardService.newAction().setFunctionName('showG2NSettings')
            )
        );
      
      section.addWidget(actions);
    }
    
    return CardService.newCardBuilder()
      .setHeader(header)
      .addSection(section)
      .build();
  } catch (error) {
    console.error('buildAttachmentsCard error:', error);
    return _buildErrorCardSafely('Attachments Card Error', error.message || 'Unknown error');
  }
}

/**
 * Ensure the database has the file property and (optionally) select the DB.
 * @param {Object} event - contains formInput.selected_database_for_attachments and attachment_property_name
 * @returns {CardService.ActionResponse} Action response
 */
function ensureAttachmentField(event) {
  try {
    const formInput = event.formInput || {};
    const selectedDb = formInput.selected_database_for_attachments;
    const propName = (formInput.attachment_property_name || 'Attachments').trim();
    
    if (!selectedDb) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText('⚠️ Please select a database')
        )
        .build();
    }
    
    const app = getApp();
    const container = app.getContainer();
    const notionAdapter = container.resolve('notionAdapter');
    const configRepo = container.resolve('configRepo');
    const databaseService = container.resolve('databaseService');
    const apiKey = configRepo.get('apiKey');
    
    if (!apiKey) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText('⚠️ API key not configured')
        )
        .build();
    }
    
    // Attempt to create the files property
    const updatedDb = notionAdapter.ensureFilesProperty(selectedDb, propName, apiKey);
    
    // If creation succeeded, set the selected database in configuration (so mappings initialize)
    try {
      databaseService.selectDatabase(selectedDb);
    } catch (e) {
      // non-fatal - we still continue
      console.warn('selectDatabase failed after ensuring files property', e);
    }
    
    const successMessage = updatedDb 
      ? `✅ Property "${propName}" ensured on database`
      : `⚠️ Could not create property - Notion may have rejected the request.`;
    
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(successMessage)
      )
      .setNavigation(
        CardService.newNavigation()
          .popCard()
          .updateCard(buildSettingsCard())
      )
      .build();
  } catch (error) {
    console.error('ensureAttachmentField error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Quick save email action
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function quickG2NSaveEmail(event) {
  try {
    if (typeof getTrialGuardActionResponse_ === 'function') {
      const guardResponse = getTrialGuardActionResponse_();
      if (guardResponse) return guardResponse;
    }
    return getApp().quickG2NSaveEmail(event);
  } catch (error) {
    console.error('Save email error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ Error: ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Save configuration action
 * @param {Object} event - GAS event with form input
 * @returns {CardService.ActionResponse} Action response
 */
function saveConfiguration(event) {
  try {
    const formInput = event?.formInput || {};
    const newApiKey = formInput.api_key || '';
    const fileHandling = formInput.file_handling || 'upload_to_drive';
    const attachmentUseSeparateInput = formInput.attachment_use_separate_db;
    const attachmentUseSeparateDatabase = Array.isArray(attachmentUseSeparateInput)
      ? attachmentUseSeparateInput.includes('true')
      : attachmentUseSeparateInput === 'true';
    
    if (!newApiKey) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText('⚠️ Please enter an API key')
        )
        .build();
    }
    
    const appInstance = getApp();
    const container = appInstance.getContainer();
    const configRepo = container.resolve('configRepo');
    const logger = container.resolve('logger');
    const oldConfig = configRepo.getAll();
    const propertiesToSet = {
      apiKey: newApiKey,
      fileHandling: fileHandling,
      attachmentUseSeparateDatabase: attachmentUseSeparateDatabase
    };
    
    let notificationText = '✅ Settings saved!';
    
    // If API key changed, clear database
    if (oldConfig.apiKey !== newApiKey) {
      logger.warn('API Key changed. Clearing previous database selection.');
      propertiesToSet.databaseId = '';
      propertiesToSet.databaseName = '';
      const mappingRepo = container.resolve('mappingRepo');
      mappingRepo.clear();
      notificationText = '✅ Settings saved! Please re-select your database.';
    }
    
    configRepo.set(propertiesToSet);
    try {
      const props = PropertiesService.getUserProperties();
      props.setProperty('G2N_SETTINGS_SAVED_AT', String(Date.now()));
    } catch (e) {
      // non-fatal
    }

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(notificationText)
      )
      .setNavigation(
        CardService.newNavigation().updateCard(buildSettingsCard())
      )
      .build();
  } catch (error) {
    console.error('Failed to save configuration', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Show database selection
 * @returns {CardService.Card} Database selection card
 */
function showDatabaseSelection() {
  try {
    getApp(); // Initialize
    return buildDatabaseSelectionCard();
  } catch (error) {
    console.error('Database selection error:', error);
    return _buildErrorCardSafely('Database Selection Error', error.message || 'Unknown error');
  }
}

/**
 * Show mappings configuration
 * @param {Object} event - GAS event with page parameter
 * @returns {CardService.Card} Mappings configuration card
 */
function showMappingsConfiguration(event) {
  try {
    getApp(); // Initialize
    const page = event?.parameters?.targetPage 
      ? parseInt(event.parameters.targetPage, 10)
      : 0;
    return buildMappingsCard(page);
  } catch (error) {
    console.error('Mappings configuration error:', error);
    return _buildErrorCardSafely('Mappings Configuration Error', error.message || 'Unknown error');
  }
}

/**
 * Save selected attachments from preview
 * @param {Object} event - GAS event with form input
 * @returns {CardService.ActionResponse}
 */
function saveSelectedAttachments(event) {
  try {
    getApp();
    const formInput = event?.formInput || {};
    const messageId = event?.parameters?.messageId || event?.gmail?.messageId;

    if (!messageId) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText('⚠️ No email message identified')
        )
        .build();
    }

    const selected = formInput.selected_attachments || [];
    const selectedNames = Array.isArray(selected) ? selected : [selected];
    const totalCount = parseInt(event?.parameters?.totalCount || '0', 10) || 0;
    const selectionKey = event?.parameters?.selectionKey || messageId;

    const attachmentService = container.resolve('attachmentService');
    attachmentService.setSelectedAttachmentNames(selectionKey, selectedNames);
    attachmentService.setLastSelectionSummary(selectionKey, selectedNames.length, totalCount);

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('✅ Attachment selection saved')
      )
      .setNavigation(
        CardService.newNavigation()
          .updateCard(showEmailPreview({ parameters: { messageId: messageId } }))
      )
      .build();
  } catch (error) {
    console.error('saveSelectedAttachments error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Ensure files property exists in the attachment database from config
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse}
 */
function ensureAttachmentFilesPropertyFromConfig(event) {
  try {
    getApp();
    const configRepo = container.resolve('configRepo');
    const notionAdapter = container.resolve('notionAdapter');
    const config = configRepo.getAll();

    if (!config.apiKey || !config.attachmentDatabaseId) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText('⚠️ Attachment database not configured')
        )
        .build();
    }

    const propertyName = config.filesPropertyName || 'Attachments';
    const updated = notionAdapter.ensureFilesProperty(
      config.attachmentDatabaseId,
      propertyName,
      config.apiKey
    );

    const message = updated
      ? `✅ Files property "${propertyName}" created`
      : '⚠️ Could not create files property';

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(message)
      )
      .setNavigation(
        CardService.newNavigation()
          .updateCard(showAttachmentMappingsConfiguration(event))
      )
      .build();
  } catch (error) {
    console.error('ensureAttachmentFilesPropertyFromConfig error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Force Drive authorization by making a benign DriveApp call
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse}
 */
function forceDriveAuthorization(event) {
  try {
    getApp();
    DriveApp.getRootFolder(); // Minimal call to trigger Drive scope authorization

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('✅ Drive authorization complete')
      )
      .build();
  } catch (error) {
    console.error('forceDriveAuthorization error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ Drive authorization failed: ' + (error.message || 'Unknown error'))
      )
      .build();
  }
} 

/**
 * Show attachment mappings configuration
 * @param {Object} event - GAS event with page parameter
 * @returns {CardService.Card} Attachment mappings card
 */
function showAttachmentMappingsConfiguration(event) {
  try {
    getApp(); // Initialize
    const configRepo = container.resolve('configRepo');
    const config = configRepo.getAll();
    if (!config.attachmentUseSeparateDatabase) {
      return _buildErrorCardSafely(
        'Attachment Mappings Disabled',
        'Enable "Save attachments to a separate database" in Settings to configure attachment mappings.'
      );
    }
    const page = event?.parameters?.targetPage
      ? parseInt(event.parameters.targetPage, 10)
      : 0;
    return buildAttachmentMappingsCard(page);
  } catch (error) {
    console.error('Attachment mappings configuration error:', error);
    return _buildErrorCardSafely('Attachment Mappings Error', error.message || 'Unknown error');
  }
}

/**
 * Save database selection action
 * @param {Object} event - GAS event with form input
 * @returns {CardService.ActionResponse} Action response
 */
function saveDatabaseSelection(event) {
  try {
    const appInstance = getApp();
    const selectedDatabase = event?.formInput?.selected_database;
    
    if (!selectedDatabase) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText('⚠️ Please select a database')
        )
        .build();
    }
    
    const databaseService = appInstance.getContainer().resolve('databaseService');
    const database = databaseService.selectDatabase(selectedDatabase);
    
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(`✅ Selected: ${database.title}`)
      )
      .setNavigation(
        CardService.newNavigation()
          .popCard()
          .updateCard(buildSettingsCard())
      )
      .build();
  } catch (error) {
    console.error('Database selection error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Reset mappings to defaults
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function resetMappingsOnly(event) {
  try {
    const appInstance = getApp();
    const container = appInstance.getContainer();
    const configRepo = container.resolve('configRepo');
    const mappingRepo = container.resolve('mappingRepo');
    
    mappingRepo.clear();
    configRepo.reset();
    
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('↺ Mappings reset')
      )
      .setNavigation(
        CardService.newNavigation().popToRoot()
      )
      .build();
  } catch (error) {
    console.error('Reset error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Navigate between mapping pages (auto-saves current page)
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function saveAndNavigateMappingsPage(event) {
  try {
    getApp(); // Initialize
    
    // Save current page from form inputs if present
    try {
      _saveMappingsFromForm(event.formInput);
    } catch (saveErr) {
      console.error('Failed to save mappings before navigation:', saveErr);
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText('❌ Failed to save page. Please try again.')
        )
        .build();
    }
    
    // Determine target page
    const targetPage = parseInt(event?.parameters?.targetPage || '0', 10);
    const card = buildMappingsCard(targetPage);
    
    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().updateCard(card)
      )
      .build();
  } catch (error) {
    console.error('Navigation error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Navigate between attachment mapping pages (auto-saves current page)
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function saveAndNavigateAttachmentMappingsPage(event) {
  try {
    getApp(); // Initialize

    try {
      _saveAttachmentMappingsFromForm(event.formInput);
    } catch (saveErr) {
      console.error('Failed to save attachment mappings before navigation:', saveErr);
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText('❌ Failed to save page. Please try again.')
        )
        .build();
    }

    const targetPage = parseInt(event?.parameters?.targetPage || '0', 10);
    const card = buildAttachmentMappingsCard(targetPage);

    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().updateCard(card)
      )
      .build();
  } catch (error) {
    console.error('Attachment navigation error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Cancel mappings configuration
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function cancelMappingsConfiguration(event) {
  try {
    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().popCard()
      )
      .build();
  } catch (error) {
    console.error('Cancel error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Cancel attachment mappings configuration
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function cancelAttachmentMappingsConfiguration(event) {
  try {
    _clearPendingAttachmentEmail();
    return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().popCard()
      )
      .build();
  } catch (error) {
    console.error('Attachment cancel error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Finish mappings configuration - save all and return
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function finishMappingsConfiguration(event) {
  try {
    getApp(); // Initialize
    
    // Save current page
    _saveMappingsFromForm(event.formInput);
    
    // Return to settings
    const card = buildSettingsCard();
    
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('✅ Mappings saved!')
      )
      .setNavigation(
        CardService.newNavigation()
          .popToRoot()
          .updateCard(card)
      )
      .build();
  } catch (error) {
    console.error('Finish error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Finish attachment mappings configuration - save all and return
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function finishAttachmentMappingsConfiguration(event) {
  try {
    getApp(); // Initialize

    _saveAttachmentMappingsFromForm(event.formInput);

    const pending = _getPendingAttachmentEmail();
    if (pending && pending.messageId) {
      const configRepo = container.resolve('configRepo');
      const emailService = container.resolve('emailService');
      const attachmentPageService = container.resolve('attachmentPageService');
      const attachmentMappingRepo = container.resolve('attachmentMappingRepo');
      const config = configRepo.getAll();

      const emailData = emailService.extractById(pending.messageId);
      if (!emailData) {
        _clearPendingAttachmentEmail();
        return CardService.newActionResponseBuilder()
          .setNotification(
            CardService.newNotification().setText('❌ Failed to load email for attachments')
          )
          .build();
      }

      _autoLinkAttachmentRelations(
        attachmentMappingRepo,
        config.databaseId,
        pending
      );

      const attachmentResult = attachmentPageService.createPagesFromEmail(emailData);
      const attachmentService = container.resolve('attachmentService');
      attachmentService.clearSelectedAttachmentNames(pending.messageId);
      if (emailData.messageId && emailData.messageId !== pending.messageId) {
        attachmentService.clearSelectedAttachmentNames(emailData.messageId);
      }
      attachmentService.setLastSelectionSummary(pending.messageId, 0, 0);
      _clearPendingAttachmentEmail();

      const successCard = buildSuccessCard({
        emailId: pending.messageId,
        selectionKey: emailData.messageId || pending.messageId,
        subject: pending.subject || emailData.subject,
        pageUrl: pending.pageUrl,
        attachmentsSaved: attachmentResult.created,
        attachmentsSavedText: `${attachmentResult.created} to DB ${config.attachmentDatabaseName || 'Attachment DB'}`
      });

      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText('✅ Attachments saved!')
        )
        .setNavigation(
          CardService.newNavigation()
            .popToRoot()
            .pushCard(successCard)
        )
        .build();
    }

    const card = buildSettingsCard();

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('✅ Attachment mappings saved!')
      )
      .setNavigation(
        CardService.newNavigation()
          .popToRoot()
          .updateCard(card)
      )
      .build();
  } catch (error) {
    console.error('Finish attachment mappings error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ ' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Save mappings from form input to repository
 * @private
 * @param {Object} formInput - Form input from CardService
 */
function _saveMappingsFromForm(formInput) {
  // Guard: no formInput
  if (!formInput || Object.keys(formInput).length === 0) {
    console.warn('_saveMappingsFromForm: no formInput received, skipping');
    return;
  }
  
  try {
    getApp(); // runs bootstrap() once; registers databaseService, etc.
  } catch (e) {
    console.error('_saveMappingsFromForm: getApp() failed', e);
    // Continue; container.resolve will throw and you'll see the real cause in logs
  }
  
  try {
    // Get logger
    const logger = (typeof container !== 'undefined' && container.has && container.has('logger')) 
      ? container.resolve('logger')
      : console;
    
    // Decode URL-encoded keys
    const decodedFormInput = {};
    Object.keys(formInput).forEach(key => {
      const value = formInput[key];
      decodedFormInput[key] = value;
      try {
        const decodedKey = decodeURIComponent(key);
        if (decodedKey !== key) {
          decodedFormInput[decodedKey] = value;
        }
      } catch (e) {
        // Decoding failed, use original
      }
    });
    
    // Get services
    const dbService = container.resolve('databaseService');
    const schema = dbService.getCurrentSchema();
    const repo = container.resolve('mappingRepo');
    const handlerFactory = container.resolve('handlerFactory');
    
    if (!schema) {
      logger.warn('_saveMappingsFromForm: no schema available, skipping');
      return;
    }
    
    const existingMappings = repo.getAll();
    let updatedCount = 0;
    let skippedCount = 0;
    
    schema.properties.forEach(prop => {
      const propId = prop.id;
      
      // Check if property has form fields
      const hasFormField = Object.keys(decodedFormInput).some(
        key => key.includes(propId) || key.includes(encodeURIComponent(propId))
      );
      
      if (!hasFormField) {
        skippedCount++;
        return;
      }
      
      const handler = handlerFactory.getHandler(prop.type);
      if (!handler) {
        skippedCount++;
        return;
      }
      
      try {
        const config = handler.processConfiguration(prop, decodedFormInput, 'email');
        if (config) {
          const existing = existingMappings[propId] || {};
          const merged = {...existing, ...config};
          repo.update(propId, merged);
          updatedCount++;
          
          if (config.enabled) {
            console.log(`✅ Property "${prop.name}" enabled`);
          }
        }
      } catch (e) {
        console.warn(`Error processing property ${prop.name}: ${e.message}`);
        skippedCount++;
      }
    });
    
    console.log(`_saveMappingsFromForm: updated=${updatedCount}, preserved=${skippedCount}`);
  } catch (error) {
    console.error('_saveMappingsFromForm error:', error);
    throw error;
  }
}

/**
 * Save attachment mappings from form input to repository
 * @private
 * @param {Object} formInput - Form input from CardService
 */
function _saveAttachmentMappingsFromForm(formInput) {
  if (!formInput || Object.keys(formInput).length === 0) {
    console.warn('_saveAttachmentMappingsFromForm: no formInput received, skipping');
    return;
  }

  try {
    getApp();
  } catch (e) {
    console.error('_saveAttachmentMappingsFromForm: getApp() failed', e);
  }

  try {
    const logger = (typeof container !== 'undefined' && container.has && container.has('logger'))
      ? container.resolve('logger')
      : console;

    const decodedFormInput = {};
    Object.keys(formInput).forEach(key => {
      const value = formInput[key];
      decodedFormInput[key] = value;
      try {
        const decodedKey = decodeURIComponent(key);
        if (decodedKey !== key) {
          decodedFormInput[decodedKey] = value;
        }
      } catch (e) {
        // use original key
      }
    });

    const dbService = container.resolve('attachmentDatabaseService');
    const schema = dbService.getCurrentSchema();
    const repo = container.resolve('attachmentMappingRepo');
    const handlerFactory = container.resolve('attachmentHandlerFactory');

    if (!schema) {
      logger.warn('_saveAttachmentMappingsFromForm: no schema available, skipping');
      return;
    }

    const existingMappings = repo.getAll();
    let updatedCount = 0;
    let skippedCount = 0;

    schema.properties.forEach(prop => {
      const propId = prop.id;
      const hasFormField = Object.keys(decodedFormInput).some(
        key => key.includes(propId) || key.includes(encodeURIComponent(propId))
      );

      if (!hasFormField) {
        skippedCount++;
        return;
      }

      const handler = handlerFactory.getHandler(prop.type);
      if (!handler) {
        skippedCount++;
        return;
      }

      try {
        const config = handler.processConfiguration(prop, decodedFormInput, 'attachment');
        if (config) {
          const existing = existingMappings[propId] || {};
          const merged = { ...existing, ...config };
          repo.update(propId, merged);
          updatedCount++;
        }
      } catch (e) {
        console.warn(`Error processing attachment property ${prop.name}: ${e.message}`);
        skippedCount++;
      }
    });

    console.log(`_saveAttachmentMappingsFromForm: updated=${updatedCount}, preserved=${skippedCount}`);
  } catch (error) {
    console.error('_saveAttachmentMappingsFromForm error:', error);
    throw error;
  }
}

/**
 * Test Notion connection
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function testNotionConnection(event) {
  try {
    const appInstance = getApp();
    const result = appInstance.testConnection();
    const message = result.success 
      ? `✅ Connected! ${result.message}`
      : `❌ Connection failed: ${result.message}`;
    
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(message)
      )
      .build();
  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText('❌ Error:' + (error.message || 'Unknown error'))
      )
      .build();
  }
}

/**
 * Build homepage card
 * @returns {CardService.Card} Homepage card
 */
function buildHomepageCard() {
  try {
    return getApp().showSettings();
  } catch (error) {
    console.error('buildHomepageCard error:', error);
    return _buildErrorCardSafely('Homepage Error', error.message || 'Unknown error');
  }
}

/**
 * Build settings card
 * @returns {CardService.Card} Settings card
 */
function buildSettingsCard() {
  try {
    return getApp().showSettings();
  } catch (error) {
    console.error('buildSettingsCard error:', error);
    return _buildErrorCardSafely('Settings Error', error.message || 'Unknown error');
  }
}

/**
 * Build database selection card
 * @returns {CardService.Card} Database selection card
 */
function buildDatabaseSelectionCard() {
  try {
    return getApp().showDatabaseSelection();
  } catch (error) {
    console.error('buildDatabaseSelectionCard error:', error);
    return _buildErrorCardSafely('Database Selection Error', error.message || 'Unknown error');
  }
}

/**
 * Build mappings configuration card
 * @param {number} [page=0] - 0-indexed page number
 * @returns {CardService.Card} Mappings configuration card
 */
function buildMappingsCard(page) {
  try {
    const pageNum = typeof page === 'number' ? page : 0;
    return getApp().showMappings(pageNum);
  } catch (error) {
    console.error('buildMappingsCard error:', error);
    return _buildErrorCardSafely('Mappings Error', error.message || 'Unknown error');
  }
}

/**
 * Build attachment mappings configuration card
 * @param {number} [page=0] - 0-indexed page number
 * @returns {CardService.Card}
 */
function buildAttachmentMappingsCard(page) {
  try {
    getApp(); // Ensure bootstrap runs so services are registered
    const pageNum = typeof page === 'number' ? page : 0;
    const mappingCard = new MappingCard(
      container.resolve('attachmentDatabaseService'),
      container.resolve('attachmentMappingRepo'),
      container.resolve('attachmentHandlerFactory'),
      container.resolve('logger'),
      {
        cardTitle: '📎 Map Attachments → Notion',
        subtitlePrefix: 'Attachment DB',
        configActionName: 'showAttachmentsConfiguration',
        configActionLabel: '⚙️ Attachment Settings',
        retryActionName: 'showAttachmentMappingsConfiguration',
        saveNavigateActionName: 'saveAndNavigateAttachmentMappingsPage',
        cancelActionName: 'cancelAttachmentMappingsConfiguration',
        finishActionName: 'finishAttachmentMappingsConfiguration',
        mappingScope: 'attachment'
      }
    );
    return mappingCard.build(pageNum);
  } catch (error) {
    console.error('buildAttachmentMappingsCard error:', error);
    return _buildErrorCardSafely('Attachment Mappings Error', error.message || 'Unknown error');
  }
}

/**
 * Get pending email context for attachment save flow
 * @returns {Object|string}
 */
function _getPendingAttachmentEmail() {
  try {
    getApp();
    const configRepo = container.resolve('configRepo');
    const config = configRepo.getAll();
    return config.pendingAttachmentEmail || '';
  } catch (error) {
    return '';
  }
}

/**
 * Clear pending email context for attachment save flow
 */
function _clearPendingAttachmentEmail() {
  try {
    getApp();
    const configRepo = container.resolve('configRepo');
    configRepo.set({ pendingAttachmentEmail: '' });
  } catch (error) {
    // ignore
  }
}

/**
 * Auto-link attachment relation mappings to the saved email page
 * @param {MappingRepository} attachmentMappingRepo
 * @param {string} emailDatabaseId
 * @param {Object} pending
 */
function _autoLinkAttachmentRelations(attachmentMappingRepo, emailDatabaseId, pending) {
  if (!attachmentMappingRepo || !pending || !pending.pageId) return;
  const normalizedEmailDbId = _normalizeId(emailDatabaseId);
  if (!normalizedEmailDbId) return;

  const mappings = attachmentMappingRepo.getAll();
  let updated = false;

  Object.keys(mappings).forEach(propId => {
    const mapping = mappings[propId];
    if (!mapping) return;
    const enabled = mapping.enabled === true || mapping.enabled === 'true';
    if (!enabled) return;
    if (!mapping.isRelation && mapping.type !== 'relation') return;
    if (mapping.selectedPages && mapping.selectedPages.length > 0) return;

    const relationConfig = mapping.relationConfig || {};
    const relatedDbId = _normalizeId(
      relationConfig.database_id ||
      relationConfig.data_source_id ||
      relationConfig.dual_property?.database_id ||
      ''
    );

    if (relatedDbId && relatedDbId === normalizedEmailDbId) {
      mapping.selectedPages = [
        {
          id: pending.pageId,
          title: pending.subject || 'Email'
        }
      ];
      mappings[propId] = mapping;
      updated = true;
    }
  });

  if (updated) {
    attachmentMappingRepo.saveAll(mappings);
  }
}

/**
 * Normalize Notion IDs for comparisons
 * @param {string} value
 * @returns {string}
 */
function _normalizeId(value) {
  return String(value || '').replace(/-/g, '').toLowerCase();
}

// Add this debug function to File 62_EntryPoints.js
function checkExistingFunctions() {
  const functions = [
    'buildAttachmentsCard',
    'showAttachmentsConfiguration',
    'saveAttachmentSettings',
    'ensureAttachmentField',
    'showAttachmentMappingsConfiguration',
    'saveAndNavigateAttachmentMappingsPage',
    'finishAttachmentMappingsConfiguration',
    'saveSelectedAttachments',
    'ensureAttachmentFilesPropertyFromConfig',
    'forceDriveAuthorization'
  ];
  
  const existing = functions.filter(fn => typeof window[fn] === 'function');
  console.log('Existing functions:', existing);
  
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('🔍 Function Check'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(`Found: ${existing.join(', ') || 'None'}`)))
    .build();
}
