/**
 * Attachment management UI (pure CardService, no BaseCardRenderer dependency)
 *
 * Functions:
 *  - showAttachmentsConfiguration(event)
 *  - buildAttachmentsCard()
 *  - ensureAttachmentField(event)
 */

function showAttachmentsConfiguration(event) {
  try {
    const app = getApp();
    const container = app.getContainer();
    const notionService = container.resolve('notionService');
    const configRepo = container.resolve('configRepo');
    const logger = container.resolve('logger');
    
    logger.info('Building attachments configuration card');
    
    // Get current configuration
    const config = configRepo.getAll();
    
    // List databases
    let databases = [];
    try {
      databases = notionService.listDatabases() || [];
    } catch (e) {
      logger.warn('Could not list databases', e);
      return _buildErrorCardSafely('Notion Error', 
        'Could not list databases. Check API key and permissions.');
    }
    
    const currentDbId = config.attachmentDatabaseId || config.databaseId || '';
    
    // Build the card
    const header = CardService.newCardHeader()
      .setTitle('📎 Attachments Configuration')
      .setSubtitle('Configure how email attachments are handled');
    
    const card = CardService.newCardBuilder()
      .setHeader(header);
    
    // === SECTION 1: Database Selection ===
    const dbSection = CardService.newCardSection()
      .setHeader('🗄️ Select Attachment Database');
    
    if (databases.length === 0) {
      dbSection.addWidget(CardService.newTextParagraph()
        .setText('No Notion databases found.'));
    } else {
      const selection = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName('attachment_database_id') // Consistent field name
        .setTitle('Choose Database');
      
      selection.addItem('-- Select database --', '', currentDbId === '');
      databases.forEach(db => {
        selection.addItem(db.name, db.id, db.id === currentDbId);
      });
      
      dbSection.addWidget(selection);
    }
    
    card.addSection(dbSection);
    
    // === SECTION 2: Files Property Configuration ===
    const filesSection = CardService.newCardSection()
      .setHeader('📁 Files Property');
    
    filesSection.addWidget(CardService.newTextInput()
      .setFieldName('files_property_name') // Consistent field name
      .setTitle('Property Name for Files')
      .setValue(config.filesPropertyName || 'Attachments')
      .setHint('Name of the files property in Notion (default: "Attachments")'));
    
    card.addSection(filesSection);
    
    // === SECTION 3: Attachment Handling ===
    const handlingSection = CardService.newCardSection()
      .setHeader('⚙️ Attachment Handling');
    
    const handlingDropdown = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('file_handling') // Consistent field name
      .setTitle('How to handle attachments');
    
    const currentHandling = config.fileHandling || 'upload_to_drive';
    handlingDropdown.addItem('Upload to Google Drive', 'upload_to_drive', currentHandling === 'upload_to_drive');
    handlingDropdown.addItem('Link only (no upload)', 'link_only', currentHandling === 'link_only');
    handlingDropdown.addItem('Skip attachments', 'skip', currentHandling === 'skip');
    
    handlingSection.addWidget(handlingDropdown);
    card.addSection(handlingSection);
    
    // === SECTION 4: Actions ===
    const actionSection = CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('✅ Ensure Files Property')
          .setBackgroundColor('#0F9D58')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOnClickAction(CardService.newAction()
            .setFunctionName('ensureAttachmentField')))
        .addButton(CardService.newTextButton()
          .setText('💾 Save Settings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('saveAttachmentSettings')))
        .addButton(CardService.newTextButton()
          .setText('📎 Configure Mappings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showAttachmentMappingsConfiguration'))));
    
    card.addSection(actionSection);
    
    // === SECTION 5: Navigation ===
    const navSection = CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('🔙 Back to Settings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showG2NSettings')))
        .addButton(CardService.newTextButton()
          .setText('🏠 Home')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onG2NHomepage'))));
    
    card.addSection(navSection);
    
    return card.build();
    
  } catch (error) {
    console.error('showAttachmentsConfiguration error:', error);
    return _buildErrorCardSafely('Attachments Error', error.message || 'Unknown error');
  }
}

/**
 * Build attachments management card
 * @returns {CardService.Card}
 */
function buildAttachmentsCard() {
  try {
    const app = getApp();
    const container = app.getContainer();
    const notionService = container.resolve('notionService');
    const configRepo = container.resolve('configRepo');
    const databaseService = container.resolve('databaseService');
    const logger = container.resolve('logger');
    
    // Get current configuration
    const config = configRepo.getAll();
    const status = databaseService.getStatus();
    
    // Check if we have API key
    if (!config.apiKey) {
      return _buildNoApiKeyCard();
    }
    
    // List databases
    let databases = [];
    try {
      databases = notionService.listDatabases() || [];
    } catch (e) {
      logger.warn('Could not list databases', e);
      return _buildConnectionErrorCard('Notion', e.message);
    }
    
    // Current attachment database ID (separate or fallback to main)
    const currentAttachmentDbId = config.attachmentDatabaseId || config.databaseId || '';
    const currentAttachmentDbName = config.attachmentDatabaseName || config.databaseName || '';
    
    // Build the card
    const header = CardService.newCardHeader()
      .setTitle('📎 Attachments Configuration')
      .setSubtitle('Configure where and how email attachments are saved');
    
    const card = CardService.newCardBuilder()
      .setHeader(header);
    
    // === SECTION 1: Status ===
    const statusSection = CardService.newCardSection()
      .setHeader('📊 Current Status');
    
    if (currentAttachmentDbId && currentAttachmentDbName) {
      // Check if database has files property
      let hasFilesProperty = false;
      try {
        const dbSchema = notionService.adapter.getDatabase(currentAttachmentDbId, config.apiKey);
        hasFilesProperty = dbSchema.properties?.some(p => p.type === 'files') || false;
      } catch (e) {
        logger.warn('Could not check files property', e);
      }
      
      statusSection.addWidget(CardService.newKeyValue()
        .setTopLabel('Attachment Database')
        .setContent(currentAttachmentDbName));
      
      statusSection.addWidget(CardService.newKeyValue()
        .setTopLabel('Files Property')
        .setContent(hasFilesProperty ? '✅ Configured' : '❌ Not found'));
      
      statusSection.addWidget(CardService.newKeyValue()
        .setTopLabel('Handling')
        .setContent(_getFileHandlingDisplay(config.fileHandling || 'upload_to_drive')));
    } else {
      statusSection.addWidget(CardService.newTextParagraph()
        .setText('<font color="#FF6B6B">⚠️ No attachment database configured</font>'));
      statusSection.addWidget(CardService.newTextParagraph()
        .setText('Attachments will not be saved until you select a database.'));
    }
    
    card.addSection(statusSection);

    // === SECTION 1B: Attachment Mappings Summary ===
    const mappingSummarySection = _buildAttachmentMappingSummarySection(container);
    if (mappingSummarySection) {
      card.addSection(mappingSummarySection);
    }
    
    // === SECTION 2: Database Selection ===
    const dbSection = CardService.newCardSection()
      .setHeader('🗄️ Select Attachment Database');
    
    if (databases.length === 0) {
      dbSection.addWidget(CardService.newTextParagraph()
        .setText('No databases found. Make sure your Notion integration has access to databases.'));
    } else {
      const dbSelection = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName('attachment_database_id')
        .setTitle('Choose Database');
      
      // Add default option
      dbSelection.addItem('-- Select database --', '', currentAttachmentDbId === '');
      
      // Add all databases
      databases.forEach(db => {
        const isSelected = db.id === currentAttachmentDbId;
        const displayName = db.id === config.databaseId ? `${db.name} (Email Database)` : db.name;
        dbSelection.addItem(displayName, db.id, isSelected);
      });
      
      dbSection.addWidget(dbSelection);
      
      // Note
      dbSection.addWidget(CardService.newTextParagraph()
        .setText('<font color="#5F6368"><i>You can use the same database as emails or a dedicated attachments database.</i></font>'));
    }
    
    card.addSection(dbSection);
    
    // === SECTION 3: Files Property ===
    const filesSection = CardService.newCardSection()
      .setHeader('📁 Files Property Configuration');
    
    if (currentAttachmentDbId) {
      filesSection.addWidget(CardService.newTextInput()
        .setFieldName('files_property_name')
        .setTitle('Property Name for Files')
        .setValue(config.filesPropertyName || 'Attachments')
        .setHint('Name of the files property in Notion (default: "Attachments")'));
      
      filesSection.addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('🛠️ Ensure Files Property Exists')
          .setBackgroundColor('#4285F4')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('ensureAttachmentField'))));
    } else {
      filesSection.addWidget(CardService.newTextParagraph()
        .setText('<i>Select a database first to configure files property.</i>'));
    }
    
    card.addSection(filesSection);
    
    // === SECTION 4: Attachment Handling ===
    const handlingSection = CardService.newCardSection()
      .setHeader('⚙️ How to Handle Attachments');
    
    const handlingDropdown = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('file_handling')
      .setTitle('Attachment Handling');
    
    const currentHandling = config.fileHandling || 'upload_to_drive';
    handlingDropdown.addItem('Upload to Google Drive', 'upload_to_drive', currentHandling === 'upload_to_drive');
    handlingDropdown.addItem('Link only (no upload)', 'link_only', currentHandling === 'link_only');
    handlingDropdown.addItem('Skip attachments', 'skip', currentHandling === 'skip');
    
    handlingSection.addWidget(handlingDropdown);
    
    // Explanations
    handlingSection.addWidget(CardService.newTextParagraph()
      .setText('<b>Options:</b>'));
    handlingSection.addWidget(CardService.newTextParagraph()
      .setText('• <b>Upload to Google Drive</b>: Files uploaded to Drive and linked in Notion'));
    handlingSection.addWidget(CardService.newTextParagraph()
      .setText('• <b>Link only</b>: Only store file metadata, no upload'));
    handlingSection.addWidget(CardService.newTextParagraph()
      .setText('• <b>Skip</b>: Ignore attachments completely'));
    
    card.addSection(handlingSection);
    
    // === SECTION 5: Actions ===
    const actionSection = CardService.newCardSection()
      .setHeader('🚀 Save Configuration');
    
    const buttonSet = CardService.newButtonSet();
    
    // Save button
    buttonSet.addButton(CardService.newTextButton()
      .setText('💾 Save Settings')
      .setBackgroundColor('#0F9D58')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(CardService.newAction()
        .setFunctionName('saveAttachmentSettings')));

    buttonSet.addButton(CardService.newTextButton()
      .setText('📎 Configure Mappings')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('showAttachmentMappingsConfiguration')));
    
    // Test button (only if database selected)
    if (currentAttachmentDbId) {
      buttonSet.addButton(CardService.newTextButton()
        .setText('🧪 Test Connection')
        .setOnClickAction(CardService.newAction()
          .setFunctionName('testAttachmentConnection')
          .setParameters({ dbId: currentAttachmentDbId })));
    }
    
    actionSection.addWidget(buttonSet);
    card.addSection(actionSection);
    
    // === SECTION 6: Navigation ===
    const navSection = CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('🔙 Back to Settings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showG2NSettings')))
        .addButton(CardService.newTextButton()
          .setText('🏠 Home')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onG2NHomepage'))));
    
    card.addSection(navSection);
    
    return card.build();
    
  } catch (error) {
    console.error('buildAttachmentsCard error:', error);
    return _buildErrorCardSafely('Attachments Card Error', error && error.message ? error.message : 'Unknown error');
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Get display text for file handling option
 * @private
 * @returns {string}
 */
function _getFileHandlingDisplay(handling) {
  const options = {
    'upload_to_drive': 'Upload to Google Drive',
    'link_only': 'Link only (no upload)',
    'skip': 'Skip attachments'
  };
  return options[handling] || 'Upload to Google Drive';
}

/**
 * Build error card for missing API key
 * @private
 * @returns {CardService.Card}
 */
function _buildNoApiKeyCard() {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('🔑 API Key Required'))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText('You need to configure your Notion API key first.'))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('⚙️ Go to Settings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showG2NSettings')))))
    .build();
}

/**
 * Build connection error card
 * @private
 * @param {string} service - Service name
 * @param {string} errorMessage - Error details
 * @returns {CardService.Card}
 */
function _buildConnectionErrorCard(service, errorMessage) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle(`❌ ${service} Connection Failed`))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(`Could not connect to ${service}. Please check your configuration.`))
      .addWidget(CardService.newTextParagraph()
        .setText(`Error: ${errorMessage || 'Unknown error'}`))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('⚙️ Check Settings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showG2NSettings')))
        .addButton(CardService.newTextButton()
          .setText('🔄 Retry')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showAttachmentsConfiguration')))))
    .build();
}

/**
 * Safely build error card (fallback if global function not available)
 * @private
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {CardService.Card}
 */
function _buildErrorCardSafely(title, message) {
  // Try to use global buildErrorCard if available
  if (typeof buildErrorCard === 'function') {
    return buildErrorCard(title, message);
  }
  
  // Fallback implementation
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle(`❌ ${title}`))
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph()
        .setText(message))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('🔄 Retry')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onG2NHomepage')))
        .addButton(CardService.newTextButton()
          .setText('⚙️ Settings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showG2NSettings')))))
    .build();
}

/**
 * Build attachment mappings summary section
 * @private
 * @param {ServiceContainer} container
 * @returns {CardService.CardSection|null}
 */
function _buildAttachmentMappingSummarySection(container) {
  try {
    const attachmentMappingRepo = container.resolve('attachmentMappingRepo');
    const attachmentFieldRegistry = container.resolve('attachmentFieldRegistry');
    const emailFieldRegistry = container.resolve('fieldRegistry');
    const configRepo = container.resolve('configRepo');
    const config = configRepo.getAll();

    const enabledMappings = attachmentMappingRepo.getEnabled();
    const mappingKeys = Object.keys(enabledMappings);

    const section = CardService.newCardSection()
      .setHeader('📋 Attachment Mappings');

    const dbName = config.attachmentDatabaseName || config.databaseName || 'Attachment DB';
    section.addWidget(CardService.newTextParagraph()
      .setText(`Database: <b>${dbName}</b>`));

    if (mappingKeys.length > 0) {
      let html = '<b>Enabled Mappings:</b><br/>';
      mappingKeys.forEach(id => {
        const m = enabledMappings[id];
        const emailField = m.emailField || '';
        const isAttachmentField = String(emailField).startsWith('attachment');
        const source = m.isStaticOption
          ? `<font color="#34a853">${m.selectedOption || 'Value'}</font>`
          : `<font color="#4285f4">${_formatMappingSourceLabel(
              emailField,
              isAttachmentField ? attachmentFieldRegistry : emailFieldRegistry,
              isAttachmentField
            )}</font>`;
        html += `• <b>${m.notionPropertyName}</b> ← ${source}<br/>`;
      });
      section.addWidget(CardService.newTextParagraph().setText(html));
    } else {
      section.addWidget(CardService.newTextParagraph()
        .setText('<i>No attachment fields mapped yet.</i>'));
    }

    return section;
  } catch (error) {
    return null;
  }
}

/**
 * Format mapping source label
 * @private
 */
function _formatMappingSourceLabel(fieldValue, registry, isAttachmentField) {
  if (!fieldValue) return 'Value';
  const fields = registry && typeof registry.getAllFields === 'function'
    ? registry.getAllFields()
    : [];
  const match = fields.find(f => f.value === fieldValue);
  if (match && match.label) {
    const label = String(match.label).replace(/^[^\w]+/g, '').trim();
    return isAttachmentField ? label : `Email ${label}`;
  }
  return isAttachmentField ? fieldValue : `Email ${fieldValue}`;
}

/**
 * Ensure the database has a files property
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse}
 */
function ensureAttachmentField(event) {
  try {
    const formInput = event?.formInput || {};
    const selectedDb = formInput.selected_database_for_attachments || 
                      formInput.attachment_database_id;
    const propertyName = (formInput.files_property_name || 
                         formInput.attachment_property_name || 
                         'Attachments').trim();
    
    if (!selectedDb) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText('⚠️ No database selected'))
        .build();
    }
    
    const app = getApp();
    const container = app.getContainer();
    const notionAdapter = container.resolve('notionAdapter');
    const configRepo = container.resolve('configRepo');
    const apiKey = configRepo.get('apiKey');
    
    if (!apiKey) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText('⚠️ API key not configured'))
        .build();
    }
    
    // Try to create the files property
    const updatedDb = notionAdapter.ensureFilesProperty(selectedDb, propertyName, apiKey);
    
    const message = updatedDb 
      ? `✅ Files property "${propertyName}" created successfully!`
      : `⚠️ Could not create files property. It might already exist or Notion rejected the request.`;
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(message))
      .setNavigation(CardService.newNavigation()
        .updateCard(showAttachmentsConfiguration(event)))
      .build();
    
  } catch (error) {
    console.error('Ensure attachment field error:', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText(`❌ Error: ${error.message || 'Unknown error'}`))
      .build();
  }
}

    /**
     * Save attachment settings
     * @param {Object} event - GAS event with form input
     * @returns {CardService.ActionResponse}
     */
    function saveAttachmentSettings(event) {
    try {
        const formInput = event.formInput || {};
        const attachmentDbId = formInput.attachment_database_id || 
                            formInput.selected_database_for_attachments;
        const fileHandling = formInput.file_handling || 'upload_to_drive';
        const filesPropertyName = (formInput.files_property_name || 
                                formInput.attachment_property_name || 
                                'Attachments').trim();
        
        if (!attachmentDbId) {
        return CardService.newActionResponseBuilder()
            .setNotification(CardService.newNotification()
            .setText('⚠️ Please select an attachments database'))
            .build();
        }
        
        const app = getApp();
        const container = app.getContainer();
        const configRepo = container.resolve('configRepo');
        const notionService = container.resolve('notionService');
        const attachmentDatabaseService = container.resolve('attachmentDatabaseService');
        const logger = container.resolve('logger');
        
        // Get database name (and initialize attachment mappings)
        let attachmentDbName = 'Unknown Database';
        try {
        const selectedDb = attachmentDatabaseService.selectDatabase(attachmentDbId);
        if (selectedDb && selectedDb.title) {
            attachmentDbName = selectedDb.title;
        }
        } catch (error) {
        logger.warn('Could not select attachment database:', error.message);
        try {
            const databases = notionService.listDatabases();
            const selectedDb = databases.find(db => db.id === attachmentDbId);
            if (selectedDb) {
            attachmentDbName = selectedDb.name;
            }
        } catch (listError) {
            logger.warn('Could not get database name:', listError.message);
        }
        }
        
        // Save to configuration
        const configData = {
        attachmentDatabaseId: attachmentDbId,
        attachmentDatabaseName: attachmentDbName,
        fileHandling: fileHandling
        };
        
        // Only add filesPropertyName if it's provided
        if (filesPropertyName && filesPropertyName !== 'Attachments') {
        configData.filesPropertyName = filesPropertyName;
        }
        
        configRepo.set(configData);
        
        logger.info('Attachment settings saved', { 
        attachmentDbId, 
        attachmentDbName,
        fileHandling, 
        filesPropertyName 
        });
        
        return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
            .setText(`✅ Attachment settings saved! Database: ${attachmentDbName}`))
        .setNavigation(CardService.newNavigation()
            .popCard() // Go back to settings
            .updateCard(showG2NSettings(event)))
        .build();
        
    } catch (error) {
        console.error('Save attachment settings error:', error);
        return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
            .setText('❌ ' + (error.message || 'Unknown error')))
        .build();
    }
    }
