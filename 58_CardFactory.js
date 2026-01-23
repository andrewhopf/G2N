/**
 * @fileoverview Card factory
 * @description Factory for creating UI cards
 */

/**
 * Card Factory
 * @class CardFactory
 */
class CardFactory {
  /**
   * @param {ServiceContainer} container - DI container
   */
  constructor(container) {
    /** @private */
    this._container = container;
  }

  /**
   * Create homepage card
   * @returns {CardService.Card}
   */
  createHomepage() {
    const databaseService = this._container.resolve('databaseService');
    const attachmentDatabaseService = this._container.resolve('attachmentDatabaseService');
    const attachmentMappingRepo = this._container.resolve('attachmentMappingRepo');
    const attachmentService = this._container.resolve('attachmentService');
    const status = databaseService.getStatus();
    const attachmentStatus = attachmentDatabaseService.getStatus();

    const recentlySaved = this._wasSettingsJustSaved();
    const card = CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle('📧 Gmail to Notion')
          .setSubtitle('Save emails to your Notion workspace')
      );

    // Status section
    const statusSection = CardService.newCardSection()
      .setHeader('📊 Status')
      .addWidget(
        CardService.newKeyValue()
          .setTopLabel('Notion Connection')
          .setContent(status.hasApiKey ? '✅ Connected' : '❌ Not connected')
      )
      .addWidget(
        CardService.newKeyValue()
          .setTopLabel('Database')
          .setContent(status.hasDatabaseId ? `✅ ${status.databaseName}` : '❌ Not selected')
      )
      .addWidget(
        CardService.newKeyValue()
          .setTopLabel('Email Mappings')
          .setContent(status.hasMappings ? `✅ ${status.enabledMappings} configured` : '❌ Not configured')
      );

    card.addSection(statusSection);

    // Attachment summary section
    const attachmentSection = CardService.newCardSection()
      .setHeader('📎 Attachment Mappings');

    attachmentSection.addWidget(
      CardService.newKeyValue()
        .setTopLabel('Attachment DB')
        .setContent(attachmentStatus.hasDatabaseId ? `✅ ${attachmentStatus.databaseName}` : '❌ Not selected')
    );

    const lastSelection = attachmentService.getLastSelectionSummary();
    const selectionText = lastSelection
      ? `${lastSelection.selectedCount}/${lastSelection.totalCount} selected`
      : 'No selection yet';

    attachmentSection.addWidget(
      CardService.newKeyValue()
        .setTopLabel('Attachments Selected')
        .setContent(selectionText)
    );

    attachmentSection.addWidget(
      CardService.newKeyValue()
        .setTopLabel('Attachment Mappings')
        .setContent(attachmentMappingRepo.getEnabledCount() > 0
          ? `✅ ${attachmentMappingRepo.getEnabledCount()} configured`
          : '❌ Not configured')
    );

    card.addSection(attachmentSection);

    // Action section based on status
    if (status.isReady) {
      card.addSection(this._createReadySection());
    } else {
      card.addSection(this._createSetupSection(status));
    }

    // Tools section
    card.addSection(this._createToolsSection());

    return card.build();
  }

  /**
   * Create email preview card
   * @param {Object} event - Gmail event
   * @returns {CardService.Card}
   */
  createEmailPreview(event) {
    const databaseService = this._container.resolve('databaseService');
    const mappingRepo = this._container.resolve('mappingRepo');
    const status = databaseService.getStatus();
    const messageId = event?.gmail?.messageId;

    let subject = 'No email selected';
    let from = 'Unknown';
    let date = 'N/A';
    let preview = '';

    if (messageId) {
      try {
        const message = GmailApp.getMessageById(messageId);
        if (message) {
          subject = message.getSubject() || 'No Subject';
          from = message.getFrom() || 'Unknown';
          date = message.getDate()?.toLocaleString() || 'Unknown';
          preview = (message.getPlainBody() || '').substring(0, 250);
        }
      } catch (e) {
        this._logger.error('Preview error', e);
      }
    }

    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('📨 Save to Notion').setSubtitle(status.databaseName || 'Target: Mail'));

    // --- SECTION 1: EMAIL CONTENT (The Preview) ---
    const emailSection = CardService.newCardSection()
      .setHeader('📧 Email Preview')
      .addWidget(CardService.newKeyValue().setTopLabel('Subject').setContent(subject).setMultiline(true))
      .addWidget(CardService.newKeyValue().setTopLabel('From').setContent(from));
    
    if (preview) {
      emailSection.addWidget(CardService.newTextParagraph().setText(`<i>"${preview}..."</i>`));
    }
    card.addSection(emailSection);

    // --- SECTION 2: MAPPINGS SUMMARY ---
    const mappingSection = CardService.newCardSection()
      .setHeader('📋 Email Mappings')
      // Added database name here for clarity as requested
      .addWidget(CardService.newTextParagraph().setText(`Saving to: <b>${status.databaseName || 'Mail'}</b>`));

    const enabledMappings = mappingRepo.getEnabled();
    const mappingKeys = Object.keys(enabledMappings);

    if (mappingKeys.length > 0) {
      let mappingHtml = "";
      mappingKeys.forEach(id => {
        const m = enabledMappings[id];
        let source = m.isStaticOption ? 
          `<font color="#34a853">${m.selectedOption || 'Selected Value'}</font>` : 
          `<font color="#4285f4">Email ${m.emailField}</font>`;
        
        mappingHtml += `<b>${m.notionPropertyName}</b> ← ${source}<br/>`;
      });
      mappingSection.addWidget(CardService.newTextParagraph().setText(mappingHtml));
    } else {
      mappingSection.addWidget(CardService.newTextParagraph().setText("<i>No secondary fields mapped.</i>"));
    }
    card.addSection(mappingSection);

    // --- SECTION 3: ACTIONS ---
    const actionSection = CardService.newCardSection();
    if (status.isReady && messageId) {
      actionSection.addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText('💾 Confirm & Save')
              .setBackgroundColor('#0F9D58')
              .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
              .setOnClickAction(CardService.newAction().setFunctionName('quickG2NSaveEmail'))
          )
          .addButton(
            CardService.newTextButton()
              .setText('✉️ Email Mappings')
              .setOnClickAction(CardService.newAction().setFunctionName('showMappingsConfiguration'))
          )
      );
    } else {
      actionSection.addWidget(CardService.newTextParagraph().setText('⚠️ Configuration incomplete. Check Settings.'));
    }
    card.addSection(actionSection);

    return card.build();
  }

  /**
   * Create settings card
   * @returns {CardService.Card}
   */
  createSettings() {
    const configRepo = this._container.resolve('configRepo');
    const config = configRepo.getAll();
    const databaseService = this._container.resolve('databaseService');
    const attachmentMappingRepo = this._container.resolve('attachmentMappingRepo');
    const status = databaseService.getStatus();
    const recentlySaved = this._wasSettingsJustSaved();

    const card = CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle('⚙️ Settings')
          .setSubtitle('Configure Gmail to Notion')
      );

    if (!config.apiKey) {
      card.addSection(
        CardService.newCardSection()
          .setHeader('👋 First-time setup')
          .addWidget(
            CardService.newTextParagraph()
              .setText("Paste your Notion API key (starts with 'secret_') to connect.")
          )
      );
    }

    // API Key section
    card.addSection(
      CardService.newCardSection()
        .setHeader('🔑 API Configuration')
        .addWidget(
          CardService.newTextInput()
            .setFieldName('api_key')
            .setTitle('Notion API Key')
            .setValue(config.apiKey || '')
            .setHint("Enter your Notion API key (starts with 'secret_')")
        )
    );

    // Database section
    const dbSection = CardService.newCardSection()
      .setHeader('📧 Gmail to Notion Database');

    if (status.hasApiKey) {
      dbSection.addWidget(
        CardService.newTextParagraph()
          .setText(status.hasDatabaseId 
            ? `Selected: <b>${status.databaseName}</b>` 
            : 'No database selected')
      );
      try {
        const databases = this._container.resolve('notionService').listDatabases() || [];
        const selection = CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.DROPDOWN)
          .setFieldName('selected_database')
          .setTitle('Choose Database');
        selection.addItem('-- Select database --', '', !config.databaseId);
        databases.forEach(db => {
          const isSelected = db.id === config.databaseId;
          selection.addItem(db.name, db.id, isSelected);
        });
        dbSection.addWidget(selection);
      } catch (e) {
        dbSection.addWidget(
          CardService.newTextParagraph()
            .setText('<i>Unable to load databases. Check your Notion connection.</i>')
        );
      }
      dbSection.addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText('💾 Save Database')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('saveDatabaseSelection')
              )
          )
      );
    } else {
      dbSection.addWidget(
        CardService.newTextParagraph()
          .setText('Enter API key first to select a database.')
      );
    }

    card.addSection(dbSection);

    // Mappings section (if database selected)
    if (status.hasDatabaseId) {
      card.addSection(
        CardService.newCardSection()
          .setHeader('✉️ Email Mappings')
          .addWidget(
            CardService.newTextParagraph()
              .setText(status.hasMappings 
                ? `${status.enabledMappings} mappings configured` 
                : 'Not configured')
          )
          .addWidget(
            CardService.newButtonSet()
              .addButton(
                CardService.newTextButton()
                  .setText('✉️ Email Mappings')
                  .setOnClickAction(
                    CardService.newAction()
                      .setFunctionName('showMappingsConfiguration')
                  )
              )
          )
      );
    }

    // Attachments section
    const attachmentsSection = CardService.newCardSection()
      .setHeader('📎 Attachment Mappings');

    if (status.hasApiKey && status.hasDatabaseId) {
      const attachmentDbName = config.attachmentDatabaseName || config.databaseName || 'Selected';
      const filesPropertyName = config.filesPropertyName || 'Attachments';
      const filesPropertyType = config.filesPropertyType === 'url' ? 'URL' : 'Files';
      const useSeparateDb = config.attachmentUseSeparateDatabase === true;

      const attachmentToggle = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .setFieldName('attachment_use_separate_db')
        .addItem('Save attachments to a separate database', 'true', useSeparateDb);

      attachmentsSection.addWidget(attachmentToggle);
      attachmentsSection.addWidget(
        CardService.newTextParagraph()
          .setText('<font color="#5F6368"><i>Enable to map attachments into a different database.</i></font>')
      );

      if (!useSeparateDb) {
        attachmentsSection.addWidget(
          CardService.newTextParagraph()
            .setText('<i>Attachment mappings are disabled until this is enabled.</i>')
        );
        card.addSection(attachmentsSection);
      } else {
        try {
          const databases = this._container.resolve('notionService').listDatabases() || [];
          const selection = CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.DROPDOWN)
            .setFieldName('attachment_database_id')
            .setTitle('Choose Attachment Database');
          selection.addItem('-- Select database --', '', !config.attachmentDatabaseId);
          databases.forEach(db => {
            const isSelected = db.id === config.attachmentDatabaseId;
            selection.addItem(db.name, db.id, isSelected);
          });
          attachmentsSection.addWidget(selection);
        } catch (e) {
          attachmentsSection.addWidget(
            CardService.newTextParagraph()
              .setText('<i>Unable to load databases. Check your Notion connection.</i>')
          );
        }

        attachmentsSection.addWidget(
          CardService.newTextParagraph()
            .setText(`Attachment DB: <b>${attachmentDbName}</b>`)
        );
        attachmentsSection.addWidget(
          CardService.newTextParagraph()
            .setText(attachmentMappingRepo.getEnabledCount() > 0
              ? `${attachmentMappingRepo.getEnabledCount()} mappings configured`
              : 'Not configured')
        );
        attachmentsSection.addWidget(
          CardService.newTextParagraph()
            .setText(`Files Property: <b>${filesPropertyName}</b> (${filesPropertyType})`)
        );

        attachmentsSection.addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText('💾 Save Attachment Settings')
                .setOnClickAction(
                  CardService.newAction().setFunctionName('saveAttachmentSettings')
                )
            )
        );

        attachmentsSection.addWidget(
          CardService.newButtonSet()
            .addButton(
            CardService.newTextButton()
              .setText('📎 Attachment Mappings')
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName('showAttachmentMappingsConfiguration')
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText('⚙️ Attachment Settings')
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName('showAttachmentsConfiguration')
                )
            )
        );

        card.addSection(attachmentsSection);
      }
    } else {
      attachmentsSection.addWidget(
        CardService.newTextParagraph()
          .setText('<font color="#FF6B6B">⚠️ Configure Notion connection first</font>')
      );
      card.addSection(attachmentsSection);
    }

    const saveSection = CardService.newCardSection()
      .setHeader('Save')
      .addWidget(
        CardService.newTextParagraph()
          .setText('<b>Save settings</b> - persist API key and options')
      )
      .addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText('💾 Save')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('saveConfiguration')
              )
              .setTextButtonStyle(
                recentlySaved ? CardService.TextButtonStyle.FILLED : CardService.TextButtonStyle.TEXT
              )
              .setBackgroundColor(recentlySaved ? '#0F9D58' : null)
          )
      );
    card.addSection(saveSection);

    // Actions
    let reauthUrl = '';
    try {
      const authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
      reauthUrl = authInfo ? authInfo.getAuthorizationUrl() : '';
    } catch (e) {
      reauthUrl = '';
    }

    card.addSection(
      CardService.newCardSection()
        .setHeader('Actions')
        .addWidget(
          CardService.newTextParagraph()
            .setText('<b>Reauthorize</b> - refresh Drive permissions')
        )
        .addWidget(
          CardService.newTextParagraph()
            .setText('<b>Test</b> - verify Notion connection')
        )
        .addWidget(CardService.newDivider())
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText('🔐 Reauthorize')
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName('forceDriveAuthorization')
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText('🧪 Test')
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName('testNotionConnection')
                )
            )
        )
        .addWidget(CardService.newDivider())
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText('↩️ Back to Preview')
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName('onG2NGmailMessage')
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText('🔍 Review Mappings')
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName('showReviewMappings')
                )
            )
        )
    );

    return card.build();
  }

  /**
   * Check if settings were just saved
   * @private
   * @returns {boolean}
   */
  _wasSettingsJustSaved() {
    try {
      const props = PropertiesService.getUserProperties();
      const raw = props.getProperty('G2N_SETTINGS_SAVED_AT');
      if (!raw) return false;
      const savedAt = parseInt(raw, 10);
      if (!savedAt) return false;
      const isRecent = Date.now() - savedAt < 15000;
      props.deleteProperty('G2N_SETTINGS_SAVED_AT');
      return isRecent;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create database selection card
   * @returns {CardService.Card}
   */
  createDatabaseSelection() {
    const notionService = this._container.resolve('notionService');
    
    let databases = [];
    try {
      databases = notionService.listDatabases();
    } catch (e) {
      return new ErrorCard().buildConnectionError('Notion');
    }

    const configRepo = this._container.resolve('configRepo');
    const currentDbId = configRepo.get('databaseId') || '';

    const card = CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle('🗄️ Select Database')
      );

    const section = CardService.newCardSection();

    if (databases.length === 0) {
      section.addWidget(
        CardService.newTextParagraph()
          .setText('No databases found. Make sure your integration has access to at least one database.')
      );
    } else {
      const selection = CardService.newSelectionInput()
        .setFieldName('selected_database')
        .setTitle('Available Databases')
        .setType(CardService.SelectionInputType.RADIO_BUTTON);

      databases.forEach(db => {
        selection.addItem(db.name, db.id, db.id === currentDbId);
      });

      section.addWidget(selection);
    }

    card.addSection(section);

    // Actions
    card.addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText('✅ Select')
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName('saveDatabaseSelection')
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText('🔄 Refresh')
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName('showDatabaseSelection')
                )
            )
        )
    );

    return card.build();
  }

  /**
   * Create ready section
   * @private
   */
  _createReadySection() {
    return CardService.newCardSection()
      .setHeader('🎉 Ready!')
      .addWidget(
        CardService.newTextParagraph()
          .setText('Add-on is configured and ready to save emails.')
      )
      .addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText('📨 Preview Email')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('onG2NGmailMessage')
              )
          )
      );
  }

  /**
   * Create setup section based on missing config
   * @private
   */
  _createSetupSection(status) {
    const section = CardService.newCardSection()
      .setHeader('🔧 Setup Required');

    const missing = [];
    if (!status.hasApiKey) missing.push('API Key');
    if (!status.hasDatabaseId) missing.push('Database');
    if (!status.hasMappings) missing.push('Email Mappings');

    section.addWidget(
      CardService.newTextParagraph()
        .setText(`<b>Missing:</b> ${missing.join(', ')}`)
    );

    const buttonSet = CardService.newButtonSet();

    if (!status.hasApiKey) {
      buttonSet.addButton(
        CardService.newTextButton()
          .setText('⚙️ Settings')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('showG2NSettings')
          )
      );
    } else if (!status.hasDatabaseId) {
      buttonSet.addButton(
        CardService.newTextButton()
          .setText('🗄️ Select Database')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('showDatabaseSelection')
          )
      );
    } else {
      buttonSet.addButton(
        CardService.newTextButton()
          .setText('✉️ Email Mappings')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('showMappingsConfiguration')
          )
      );
    }

    section.addWidget(buttonSet);
    return section;
  }

  /**
   * Create tools section
   * @private
   */
  _createToolsSection() {
    return CardService.newCardSection()
      .setHeader('🔧 Tools')
      .addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText('⚙️ Settings')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('showG2NSettings')
              )
          )
          .addButton(
            CardService.newTextButton()
              .setText('🔄 Refresh')
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('showG2NSettings')
              )
          )
      );
  }
}
