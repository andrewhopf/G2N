/**
 * SettingsCard - renders settings UI for API key, DB selection, mappings, and attachments
 */
class SettingsCard extends BaseCardRenderer {
  constructor(container, logger) {
    super(container, logger);
    this.configRepo = container.resolve('configRepo');
    this.databaseService = container.resolve('databaseService');
  }

  build() {
    try {
      const config = this.configRepo.getAll();
      const status = this.databaseService.getStatus();
      const recentlySaved = this._wasSettingsJustSaved();

      const header = this.buildHeader('⚙️ Settings', 'Configure Gmail to Notion');

      // === SECTION 1: API Key ===
      const apiSection = CardService.newCardSection()
        .setHeader('🔑 API Configuration')
        .addWidget(
          CardService.newTextInput()
            .setFieldName('api_key')
            .setTitle('Notion API Key')
            .setValue(config.apiKey || '')
            .setHint("Enter your Notion API key (starts with 'secret_')")
        )
        .addWidget(
          this.textParagraph(
            '<font color="#5F6368">Web import: set <b>G2N_HMAC_KEY_V1</b> in Script Properties. <b>G2N_HMAC_KEY_V0</b> is the previous key kept temporarily during rotation so older links still work.</font>'
          )
        )
        .addWidget(
          this.textParagraph(
            '<font color="#5F6368">Admin controls are hidden unless your email is listed in <b>G2N_ADMIN_EMAILS</b> (Script Properties).</font>'
          )
        );

      // === SECTION 2: Database ===
      const dbSection = CardService.newCardSection()
        .setHeader('📧 Gmail to Notion Database')
        .addWidget(
          this.textParagraph(
            status.hasDatabaseId
              ? `Selected: <b>${status.databaseName}</b>`
              : 'No database selected'
          )
        )
        .addWidget(
          this.textParagraph(
            '<font color="#5F6368"><i>This is the Notion database where emails will be saved.</i></font>'
          )
        );

      if (status.hasApiKey) {
        try {
          const databases = this.container.resolve('notionService').listDatabases() || [];
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
            this.textParagraph('<i>Unable to load databases. Check your Notion connection.</i>')
          );
        }
      } else {
        dbSection.addWidget(
          this.textParagraph('<i>Enter API key first to select a database.</i>')
        );
      }

      dbSection.addWidget(
        this.buttonSet(
          this.newButton('💾 Save Database', 'saveDatabaseSelection'),
          this.newButton('🔄 Test Connection', 'testNotionConnection')
        )
      );

      // Start building sections array
      const sections = [];
      if (typeof getTrialNoticeSection_ === 'function') {
        const trialSection = getTrialNoticeSection_();
        if (trialSection) sections.push(trialSection);
      }
      sections.push(apiSection, dbSection);

      if (typeof isAdminUser_ === 'function' && isAdminUser_()) {
        const keyStatus = typeof getHmacKeyStatus_ === 'function' ? getHmacKeyStatus_() : {};
        const rotateState = typeof getRotateConfirmState_ === 'function' ? getRotateConfirmState_() : null;
        const keySection = CardService.newCardSection()
          .setHeader('🔐 Web Import Keys');

        const v1Text = keyStatus.hasV1
          ? `V1: ✅ set (…${keyStatus.v1Suffix || 'set'})`
          : 'V1: ❌ not set';
        const v0Text = keyStatus.hasV0
          ? `V0: ✅ set (…${keyStatus.v0Suffix || 'set'})`
          : 'V0: ❌ not set';

        keySection.addWidget(this.textParagraph(v1Text));
        keySection.addWidget(this.textParagraph(v0Text));
        if (keyStatus.rotatedAt) {
          keySection.addWidget(this.textParagraph(`Rotated at: ${keyStatus.rotatedAt}`));
        }

        if (rotateState && rotateState.pending) {
          keySection.addWidget(this.textParagraph(
            '<font color="#B45309"><b>Confirm rotation?</b> This will replace V1. Keep V0 for overlap.</font>'
          ));
          keySection.addWidget(
            CardService.newTextInput()
              .setFieldName('rotate_confirm_text')
              .setTitle('Type ROTATE to confirm')
              .setHint('Enter ROTATE to enable the confirm action')
          );
          keySection.addWidget(
            this.buttonSet(
              this.newButton('✅ Confirm Rotation', 'confirmRotateHmacKeys', {}, { filled: true }),
              this.newButton('✖ Cancel', 'cancelRotateHmacKeys')
            )
          );
        } else {
          keySection.addWidget(
            this.buttonSet(
              this.newButton('🔄 Rotate Keys', 'requestRotateHmacKeys'),
              this.newButton('🧹 Clear V0', 'clearHmacKeyV0')
            )
          );
        }

        keySection.addWidget(this.textParagraph(
          '<font color="#5F6368">V1 is active. V0 is temporary for overlap during rotation.</font>'
        ));
        sections.push(keySection);
      }
      // === SECTION 3: Mappings (if DB selected) ===
      if (status.hasDatabaseId) {
        const mappingsSection = CardService.newCardSection()
          .setHeader('✉️ Email Mappings')
          .addWidget(
            this.textParagraph(
              status.hasMappings
                ? `${status.enabledMappings} mappings configured`
                : 'Not configured'
            )
          )
          .addWidget(
            this.buttonSet(
              this.newButton('✉️ Email Mappings', 'showMappingsConfiguration')
            )
          );
        sections.push(mappingsSection);
      }

// === SECTION 4: Attachments === 
      const attachmentsSection = CardService.newCardSection()
  .setHeader('📎 Attachment Mappings');

try {
  // Get configuration
  const config = this.container.resolve('configRepo').getAll();
  const hasApiKey = config.apiKey;
  const hasDatabase = config.databaseId;
  const attachmentDbId = config.attachmentDatabaseId || config.databaseId;
  const filesPropertyName = config.filesPropertyName || 'Attachments';
  const filesPropertyType = config.filesPropertyType === 'url' ? 'URL' : 'Files';

  // Show status
  if (hasApiKey && hasDatabase) {
    const useSeparateDb = config.attachmentUseSeparateDatabase === true;
    attachmentsSection.addWidget(
      CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .setFieldName('attachment_use_separate_db')
        .addItem('Save attachments to a separate database', 'true', useSeparateDb)
    );
    attachmentsSection.addWidget(this.textParagraph(
      '<font color="#5F6368"><i>Enable to map attachments into a different database.</i></font>'
    ));

    if (!useSeparateDb) {
      attachmentsSection.addWidget(this.textParagraph(
        '<i>Attachment mappings are disabled until this is enabled.</i>'
      ));
    } else {
      try {
        const notionService = this.container.resolve('notionService');
        const databases = notionService.listDatabases() || [];
        if (databases.length > 0) {
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
        } else {
          attachmentsSection.addWidget(this.textParagraph(
            '<i>No Notion databases found.</i>'
          ));
        }
      } catch (e) {
        attachmentsSection.addWidget(this.textParagraph(
          '<i>Unable to load databases. Check your Notion connection.</i>'
        ));
      }

      if (attachmentDbId) {
        attachmentsSection.addWidget(this.textParagraph(
          '<b>Attachment Database:</b> ' + (config.attachmentDatabaseName || config.databaseName || 'Selected')
        ));
      }
      
      attachmentsSection.addWidget(this.textParagraph(
        '<b>Files Property:</b> ' + filesPropertyName + ' (' + filesPropertyType + ')'
      ));

      const embedEmail = config.attachmentEmbedEmailPage ? 'Email page' : '';
      const embedAttachment = config.attachmentEmbedAttachmentPage ? 'Attachment pages' : '';
      const embedTargets = [embedEmail, embedAttachment].filter(Boolean).join(', ');
      attachmentsSection.addWidget(this.textParagraph(
        '<b>Embed in Pages:</b> ' + (embedTargets || 'None')
      ));
      attachmentsSection.addWidget(this.buttonSet(
        this.newButton('💾 Save Attachment Settings', 'saveAttachmentSettings')
      ));
    }
  } else {
    attachmentsSection.addWidget(this.textParagraph(
      '<font color="#FF6B6B">⚠️ Configure Notion connection first</font>'
    ));
  }
} catch (error) {
  console.error('Error loading attachment config:', error);
  attachmentsSection.addWidget(this.textParagraph(
    '<font color="#FF6B6B">⚠️ Error loading configuration</font>'
  ));
}

// Configuration button
if (config.attachmentUseSeparateDatabase) {
  attachmentsSection.addWidget(this.buttonSet(
    this.newButton('📎 Configure Attachments', 'showAttachmentsConfiguration')
  ));
}

sections.push(attachmentsSection);

      const saveSection = CardService.newCardSection()
        .setHeader('Save')
        .addWidget(this.textParagraph('<b>Save settings</b> - persist API key and options'))
        .addWidget(
          this.buttonSet(
            this.newButton('💾 Save', 'saveConfiguration', {}, {
              backgroundColor: recentlySaved ? '#0F9D58' : undefined,
              filled: recentlySaved
            })
          )
        );
      sections.push(saveSection);

      // === SECTION 5: Actions ===
      const actionsSection = CardService.newCardSection()
        .setHeader('Actions')
        .addWidget(this.textParagraph('<b>Reauthorize</b> - refresh Drive permissions'))
        .addWidget(this.textParagraph('<b>Test</b> - verify Notion connection'))
        .addWidget(CardService.newDivider())
        .addWidget(
          this.buttonSet(
            this.newButton('🔐 Reauthorize', 'forceDriveAuthorization'),
            this.newButton('🧪 Test', 'testNotionConnection')
          )
        )
        .addWidget(CardService.newDivider())
        .addWidget(
          this.buttonSet(
            this.newButton('↩️ Back to Preview', 'onG2NGmailMessage')
          )
        );
      sections.push(actionsSection);

      if (typeof isDevMode_ === 'function' && isDevMode_()) {
        const diagnostics = CardService.newCardSection()
          .setHeader('🧪 Diagnostics');
        const gateStatus = typeof getAdminGateStatus_ === 'function' ? getAdminGateStatus_() : null;
        const keyStatus = typeof getHmacKeyStatus_ === 'function' ? getHmacKeyStatus_() : {};
        const v1Status = keyStatus.hasV1 ? 'yes' : 'no';
        const v0Status = keyStatus.hasV0 ? 'yes' : 'no';

        diagnostics.addWidget(this.textParagraph(
          'Email resolved: ' + (gateStatus ? gateStatus.email : '(unknown)')
        ));
        diagnostics.addWidget(this.textParagraph(
          'Admin allow-list match: ' + (gateStatus && gateStatus.isAdmin ? 'YES' : 'NO')
        ));
        diagnostics.addWidget(this.textParagraph(
          'DEV_MODE: ' + (gateStatus && gateStatus.devMode ? 'true' : 'false')
        ));
        diagnostics.addWidget(this.textParagraph(
          'HMAC V1 present: ' + v1Status
        ));
        diagnostics.addWidget(this.textParagraph(
          'HMAC V0 present: ' + v0Status
        ));
        if (keyStatus.rotatedAt) {
          diagnostics.addWidget(this.textParagraph('Last rotated: ' + keyStatus.rotatedAt));
        }
        sections.push(diagnostics);
      }

      return this.buildCard(header, sections);

    } catch (err) {
      this.logger.error('Settings build failed', err);
      return buildErrorCard('Error', err.message || 'Unknown error');
    }
  }

      /** 
       * Check if current database has a files property
       * @private
       * @returns {boolean}
       */
      _checkDatabaseForFilesProperty() {
        try {
          const databaseService = this.container.resolve('databaseService');
          const schema = databaseService.getCurrentSchema();
          
          if (!schema || !schema.properties) return false;
          
          // Check if any property is of type 'files'
          return schema.properties.some(prop => prop.type === 'files');
        } catch (error) {
          this.logger.debug('Error checking for files property:', error);
          return false;
        }
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
 * Get attachment configuration
 * @private
 * @returns {Object}
 */
_getAttachmentConfig() {
  try {
    const configRepo = this.container.resolve('configRepo');
    const notionService = this.container.resolve('notionService');
    const config = configRepo.getAll();
    
    const result = {
      attachmentDbId: config.attachmentDatabaseId || config.databaseId, // Use separate or fallback
      attachmentDbName: config.attachmentDatabaseName || config.databaseName,
      fileHandling: config.fileHandling || 'upload_to_drive',
      hasAttachmentDb: !!(config.attachmentDatabaseId || config.databaseId),
      hasFilesProperty: false
    };
    
    // Check if database has files property
    if (result.hasAttachmentDb) {
      try {
        const dbId = config.attachmentDatabaseId || config.databaseId;
        const apiKey = config.apiKey;
        if (apiKey && dbId) {
          const dbSchema = notionService.adapter.getDatabase(dbId, apiKey);
          result.hasFilesProperty = dbSchema.properties?.some(p => p.type === 'files') || false;
        }
      } catch (error) {
        this.logger.debug('Could not check files property:', error.message);
      }
    }
    
    return result;
  } catch (error) {
    this.logger.debug('Error getting attachment config:', error);
    return {
      hasAttachmentDb: false,
      hasFilesProperty: false,
      fileHandling: 'upload_to_drive'
    };
  }
}

/** 
 * Get display text for file handling option
 * @private
 * @returns {string}
 */
_getFileHandlingDisplay(handling) {
  const options = {
    'upload_to_drive': 'Upload to Google Drive',
    'link_only': 'Link only (no upload)',
    'skip': 'Skip attachments'
  };
  return options[handling] || 'Upload to Google Drive';
}

}

/**
 * Global helper to build settings card
 * @returns {CardService.Card}
 */
function buildSettingsCard() {
  const card = new SettingsCard(container, container.resolve('logger'));
  return card.build();
}
