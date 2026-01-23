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
    
    const attachmentDbId = config.attachmentDatabaseId || '';
    const emailDbId = config.databaseId || '';
    const propertyDbId = config.attachmentUseSeparateDatabase ? attachmentDbId : emailDbId;
    const useUrlProperty = config.filesPropertyType === 'url';
    const propertyType = useUrlProperty ? 'url' : 'files';
    let hasProperty = false;
    let availablePropertyNames = [];
    let hasHashProperty = false;
    const hashPropertyName = config.attachmentHashPropertyName || 'G2N Attachment Hash';
    if (propertyDbId && config.apiKey) {
      try {
        const dbSchema = notionService.adapter.getDatabase(propertyDbId, config.apiKey);
        availablePropertyNames = (dbSchema.properties || [])
          .filter(p => p.type === propertyType)
          .map(p => p.name);
        hasProperty = availablePropertyNames.length > 0;
        hasHashProperty = (dbSchema.properties || [])
          .some(p => p.type === 'rich_text' && p.name === hashPropertyName);
      } catch (e) {
        logger.warn('Could not load attachment properties', e);
      }
    }
    
    // Build the card
    const header = CardService.newCardHeader()
      .setTitle('📎 Attachments Settings')
      .setSubtitle('Configure attachment settings');
    
    const card = CardService.newCardBuilder()
      .setHeader(header);
    
    // === SECTION 1: Database (configured in Settings) ===
    const dbSection = CardService.newCardSection()
      .setHeader('🗄️ Attachment Database');
    if (attachmentDbId) {
      dbSection.addWidget(CardService.newTextParagraph()
        .setText(`Current: <b>${config.attachmentDatabaseName || 'Selected'}</b>`));
    } else {
      dbSection.addWidget(CardService.newTextParagraph()
        .setText('<i>Select the attachment database in Settings.</i>'));
    }
    card.addSection(dbSection);
    
    // === SECTION 2: Attachment Link To Notion ===
    const filesSection = CardService.newCardSection()
      .setHeader('📁 Attachment Link To Notion');

    const linkType = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('files_property_use_url');
    linkType.addItem('Use URL links instead of Notion files', 'true', useUrlProperty);
    filesSection.addWidget(linkType);
    filesSection.addWidget(
      CardService.newTextParagraph()
        .setText('<font color="#5F6368"><i>We store an attachment hash to speed up duplicate checks. If missing, it will be created automatically.</i></font>')
    );

    if (!propertyDbId) {
      filesSection.addWidget(CardService.newTextParagraph()
        .setText('<i>Select a database first to configure the attachment link field.</i>'));
    } else {
      const propertyChoice = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName('files_property_choice')
        .setTitle(useUrlProperty ? 'Choose URL property' : 'Choose Files property');

      if (availablePropertyNames.length === 0) {
        propertyChoice.addItem('Create new property', '__create__', true);
      } else {
        const currentName = config.filesPropertyName || 'Attachments';
        let matched = false;
        availablePropertyNames.forEach(name => {
          const isSelected = name === currentName;
          if (isSelected) matched = true;
          propertyChoice.addItem(name, name, isSelected);
        });
        propertyChoice.addItem('Create new property', '__create__', !matched);
      }

      filesSection.addWidget(propertyChoice);
      filesSection.addWidget(
        CardService.newTextInput()
          .setFieldName('files_property_new_name')
          .setTitle('New property name')
          .setValue(config.filesPropertyName || 'Attachments')
          .setHint('Used only when "Create new property" is selected')
      );
    }

    card.addSection(filesSection);
    
    // === SECTION 3: Page Embeds ===
    const embedSection = CardService.newCardSection()
      .setHeader('📄 Page Embeds');

    const embedEmail = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('embed_email_page')
      .addItem('Email to Notion Page', 'yes', config.attachmentEmbedEmailPage === true);

    const embedAttachment = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('embed_attachment_page')
      .addItem('Attachment Link To Notion', 'yes', config.attachmentEmbedAttachmentPage === true);

    embedSection.addWidget(embedEmail);
    embedSection.addWidget(embedAttachment);
    card.addSection(embedSection);
    
    // === SECTION 5: Actions ===
    const actionButtons = CardService.newButtonSet();
    actionButtons.addButton(CardService.newTextButton()
      .setText('💾 Save Settings')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('saveAttachmentSettings')));
    actionButtons.addButton(CardService.newTextButton()
      .setText('📎 Attachment Mappings')
      .setOnClickAction(CardService.newAction()
        .setFunctionName('showAttachmentMappingsConfiguration')));
    
    const actionSection = CardService.newCardSection()
      .addWidget(actionButtons);
    
    card.addSection(actionSection);
    
    // === SECTION 6: Navigation ===
    const navSection = CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('🔙 Back to Settings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('showG2NSettings'))));
    
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
    const currentAttachmentDbId = config.attachmentDatabaseId || '';
    const currentAttachmentDbName = config.attachmentDatabaseName || config.databaseName || '';
    const emailDbId = config.databaseId || '';
    const propertyDbId = config.attachmentUseSeparateDatabase ? currentAttachmentDbId : emailDbId;
    const useUrlProperty = config.filesPropertyType === 'url';
    const propertyType = useUrlProperty ? 'url' : 'files';
    let availablePropertyNames = [];
    if (propertyDbId && config.apiKey) {
      try {
        const dbSchema = notionService.adapter.getDatabase(propertyDbId, config.apiKey);
        availablePropertyNames = (dbSchema.properties || [])
          .filter(p => p.type === propertyType)
          .map(p => p.name);
      } catch (e) {
        logger.warn('Could not load attachment properties', e);
      }
    }
    
    // Build the card
    const header = CardService.newCardHeader()
      .setTitle('📎 Attachments Settings')
      .setSubtitle('Configure attachment settings');
    
    const card = CardService.newCardBuilder()
      .setHeader(header);
    
    // === SECTION 1: Status ===
    const statusSection = CardService.newCardSection()
      .setHeader('📊 Current Status');
    
    if (propertyDbId && currentAttachmentDbName) {
      // Check if database has selected property type
      let hasFilesProperty = false;
      const propType = config.filesPropertyType === 'url' ? 'url' : 'files';
      try {
        const dbSchema = notionService.adapter.getDatabase(propertyDbId, config.apiKey);
        hasFilesProperty = dbSchema.properties?.some(p => p.type === propType) || false;
      } catch (e) {
        logger.warn('Could not check attachment property', e);
      }
      
      statusSection.addWidget(CardService.newKeyValue()
        .setTopLabel('Attachment Database')
        .setContent(currentAttachmentDbName));
      
      statusSection.addWidget(CardService.newKeyValue()
        .setTopLabel(propType === 'url' ? 'URL Property' : 'Files Property')
        .setContent(hasFilesProperty ? '✅ Configured' : '❌ Not found'));

      statusSection.addWidget(CardService.newKeyValue()
        .setTopLabel('Attachment Hash')
        .setContent(hasHashProperty ? '✅ Configured' : '⚠️ Will be created on save'));
      
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
    
    // === SECTION 2: Database (configured in Settings) ===
    const dbSection = CardService.newCardSection()
      .setHeader('🗄️ Attachment Database');
    if (currentAttachmentDbId) {
      const name = currentAttachmentDbName || 'Selected';
      dbSection.addWidget(CardService.newTextParagraph()
        .setText(`Current: <b>${name}</b>`));
    } else {
      dbSection.addWidget(CardService.newTextParagraph()
        .setText('<i>Select the attachment database in Settings.</i>'));
    }
    card.addSection(dbSection);
    
    // === SECTION 3: Attachment Link To Notion ===
    const filesSection = CardService.newCardSection()
      .setHeader('📁 Attachment Link To Notion');

    const linkType = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('files_property_use_url')
      .addItem('Use URL links instead of Notion files', 'true', useUrlProperty);
    filesSection.addWidget(linkType);

    if (propertyDbId) {
      const propertyChoice = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName('files_property_choice')
        .setTitle(useUrlProperty ? 'Choose URL property' : 'Choose Files property');
      
      if (availablePropertyNames.length === 0) {
        propertyChoice.addItem('Create new property', '__create__', true);
      } else {
        const currentName = config.filesPropertyName || 'Attachments';
        let matched = false;
        availablePropertyNames.forEach(name => {
          const isSelected = name === currentName;
          if (isSelected) matched = true;
          propertyChoice.addItem(name, name, isSelected);
        });
        propertyChoice.addItem('Create new property', '__create__', !matched);
      }

      filesSection.addWidget(propertyChoice);
      filesSection.addWidget(
        CardService.newTextInput()
          .setFieldName('files_property_new_name')
          .setTitle('New property name')
          .setValue(config.filesPropertyName || 'Attachments')
          .setHint('Used only when "Create new property" is selected')
      );
    } else {
      filesSection.addWidget(CardService.newTextParagraph()
        .setText('<i>Select a database first to configure the attachment link field.</i>'));
    }
    
    card.addSection(filesSection);
    
    // === SECTION 4: Page Embeds ===
    const embedSection = CardService.newCardSection()
      .setHeader('📄 Page Embeds');

    const embedEmail = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('embed_email_page')
      .addItem('Add attachments to email page body', 'yes', config.attachmentEmbedEmailPage === true);

    const embedAttachment = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('embed_attachment_page')
      .addItem('Add attachments to attachment pages', 'yes', config.attachmentEmbedAttachmentPage === true);

    embedSection.addWidget(embedEmail);
    embedSection.addWidget(embedAttachment);
    card.addSection(embedSection);
    
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
      .setText('📎 Attachment Mappings')
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
            .setFunctionName('showG2NSettings'))));
    
    card.addSection(navSection);
    
    return card.build();
    
  } catch (error) {
    console.error('buildAttachmentsCard error:', error);
    return _buildErrorCardSafely('Attachments Card Error', error && error.message ? error.message : 'Unknown error');
  }
}

// ==================== HELPER FUNCTIONS ====================

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
            .setFunctionName('showG2NSettings')))
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
    let selectedDb = formInput.selected_database_for_attachments || 
                      formInput.attachment_database_id ||
                      event?.parameters?.selectedDb;
    const propertyName = (formInput.files_property_name || 
                         formInput.attachment_property_name || 
                         event?.parameters?.propertyName ||
                         'Attachments').trim();

    if (!selectedDb) {
      try {
        const configRepo = container.resolve('configRepo');
        const config = configRepo.getAll();
        selectedDb = config.attachmentDatabaseId || config.databaseId || '';
      } catch (e) {
        // ignore fallback failures
      }
    }
    
    if (!selectedDb) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification()
          .setText('⚠️ Please select a database (or save it in settings first)'))
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
        const fileHandling = 'upload_to_drive';
        const app = getApp();
        const container = app.getContainer();
        const configRepo = container.resolve('configRepo');
        const notionService = container.resolve('notionService');
        const attachmentDatabaseService = container.resolve('attachmentDatabaseService');
        const logger = container.resolve('logger');

        const existingConfig = configRepo.getAll();
        const useUrlInput = formInput.files_property_use_url;
        const useUrlProperty = useUrlInput === undefined
          ? (existingConfig.filesPropertyType === 'url')
          : (Array.isArray(useUrlInput)
            ? useUrlInput.includes('true')
            : useUrlInput === 'true');
        const propertyChoice = formInput.files_property_choice || '';
        const propertyNewName = (formInput.files_property_new_name || '').trim();
        const embedEmailInput = formInput.embed_email_page;
        const embedAttachmentInput = formInput.embed_attachment_page;
        const embedEmailPage = embedEmailInput === undefined
          ? existingConfig.attachmentEmbedEmailPage
          : (Array.isArray(embedEmailInput)
            ? embedEmailInput.includes('yes')
            : embedEmailInput === 'yes');
        const embedAttachmentPage = embedAttachmentInput === undefined
          ? existingConfig.attachmentEmbedAttachmentPage
          : (Array.isArray(embedAttachmentInput)
            ? embedAttachmentInput.includes('yes')
            : embedAttachmentInput === 'yes');

        if (!attachmentDbId) {
        return CardService.newActionResponseBuilder()
            .setNotification(CardService.newNotification()
            .setText('⚠️ Please select an attachments database'))
            .build();
        }
        
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
        let filesPropertyName = propertyChoice === '__create__'
          ? (propertyNewName || 'Attachments')
          : (propertyChoice || existingConfig.filesPropertyName || 'Attachments');

        if (attachmentDbId) {
          try {
            if (useUrlProperty) {
              notionService.adapter.ensureUrlProperty(attachmentDbId, filesPropertyName, existingConfig.apiKey);
            } else {
              notionService.adapter.ensureFilesProperty(attachmentDbId, filesPropertyName, existingConfig.apiKey);
            }
            const hashPropertyName = existingConfig.attachmentHashPropertyName || 'G2N Attachment Hash';
            notionService.adapter.ensureRichTextProperty(attachmentDbId, hashPropertyName, existingConfig.apiKey);
          } catch (e) {
            logger.warn('Failed to ensure attachment property', e.message);
          }
        }

        const configData = {
        attachmentDatabaseId: attachmentDbId,
        attachmentDatabaseName: attachmentDbName,
        fileHandling: fileHandling,
        attachmentUseSeparateDatabase: true,
        attachmentEmbedEmailPage: embedEmailPage,
        attachmentEmbedAttachmentPage: embedAttachmentPage,
        filesPropertyName: filesPropertyName,
        filesPropertyType: useUrlProperty ? 'url' : 'files',
        attachmentHashPropertyName: existingConfig.attachmentHashPropertyName || 'G2N Attachment Hash'
        };
        
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
