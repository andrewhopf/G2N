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
        );

      // === SECTION 2: Database ===
      const dbSection = CardService.newCardSection()
        .setHeader('🗄️ Database')
        .addWidget(
          this.textParagraph(
            status.hasDatabaseId
              ? `Selected: <b>${status.databaseName}</b>`
              : 'No database selected'
          )
        )
        .addWidget(
          this.buttonSet(
            this.newButton('🗄️ Select Database', 'showDatabaseSelection'),
            this.newButton('🔄 Test Connection', 'testNotionConnection')
          )
        );

      // Start building sections array
      const sections = [apiSection, dbSection];

      // === SECTION 3: Mappings (if DB selected) ===
      if (status.hasDatabaseId) {
        const mappingsSection = CardService.newCardSection()
          .setHeader('🔄 Field Mappings')
          .addWidget(
            this.textParagraph(
              status.hasMappings
                ? `${status.enabledMappings} mappings configured`
                : 'Not configured'
            )
          )
          .addWidget(
            this.buttonSet(
              this.newButton('⚙️ Configure Mappings', 'showMappingsConfiguration')
            )
          );
        sections.push(mappingsSection);
      }

// === SECTION 4: Attachments === 
const attachmentsSection = CardService.newCardSection()
  .setHeader('📎 Attachments');

try {
  // Get configuration
  const config = this.container.resolve('configRepo').getAll();
  const hasApiKey = config.apiKey;
  const hasDatabase = config.databaseId;
  const attachmentDbId = config.attachmentDatabaseId || config.databaseId;
  const fileHandling = config.fileHandling || 'upload_to_drive';
  const filesPropertyName = config.filesPropertyName || 'Attachments';

  // Show status
  if (hasApiKey && hasDatabase) {
    if (attachmentDbId) {
      attachmentsSection.addWidget(this.textParagraph(
        '<b>Attachment Database:</b> ' + (config.attachmentDatabaseName || config.databaseName || 'Selected')
      ));
    }
    
    // Convert file handling to readable text
    let handlingText = '';
    if (fileHandling === 'upload_to_drive') {
      handlingText = 'Upload to Drive';
    } else if (fileHandling === 'link_only') {
      handlingText = 'Link only';
    } else {
      handlingText = 'Skip';
    }
    
    attachmentsSection.addWidget(this.textParagraph(
      '<b>File Handling:</b> ' + handlingText
    ));
    
    attachmentsSection.addWidget(this.textParagraph(
      '<b>Files Property:</b> ' + filesPropertyName
    ));
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
attachmentsSection.addWidget(this.buttonSet(
  this.newButton('📎 Configure Attachments', 'showAttachmentsConfiguration')
));

sections.push(attachmentsSection);

      // === SECTION 5: Actions ===
      const actionsSection = CardService.newCardSection()
        .addWidget(
          this.buttonSet(
            this.newButton('💾 Save', 'saveConfiguration'),
            this.newButton('↺ Reset', 'resetMappingsOnly'),
            this.newButton('🏠 Home', 'onG2NHomepage')
          )
        );
      sections.push(actionsSection);

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