/**
 * Email Preview Card - Shows duplicate check and mappings before save
 * @extends BaseCardRenderer
 * 
 * @class EmailPreviewCard
 */
class EmailPreviewCard extends BaseCardRenderer {
    /**
     * @constructor
     * @param {ServiceContainer} container - Dependency injection container
     */
    constructor(container) {
        super(container);
        this.container = container;
        this.databaseService = container.resolve('databaseService');
        this.notionService = container.resolve('notionService');
        this.configRepo = container.resolve('configRepo');
        this.mappingRepo = container.resolve('mappingRepo');
        this.logger = container.resolve('logger');
    }

    /**
     * Build preview card
     * @param {Object} event - GAS event
     * @returns {CardService.Card} Google Apps Script card
     */
    build(event = {}) {
        try {
            const startedAt = Date.now();
            const status = this.databaseService.getStatus();
            const messageId = event?.gmail?.messageId || event?.parameters?.messageId;

            this.logger.info('Building preview card', { 
                messageId, 
                configured: status.isReady 
            });

            const header = this.buildHeader('📨 Save to Notion', 'Review before saving');
            let sections = [];

            // ========== SECTION 0: DUPLICATE WARNING (AT TOP!) ==========
            try {
                const duplicateStartedAt = Date.now();
                const duplicateWarning = this._checkForDuplicates(messageId, status);
                this.logger.info('Preview duplicate check timing', {
                    messageId: messageId,
                    durationMs: Date.now() - duplicateStartedAt
                });
                
                if (duplicateWarning) {
                    this.logger.info('✅ Duplicate warning section created - adding to card');
                    sections.push(duplicateWarning);
                } else {
                    this.logger.debug('No duplicate warning to show');
                }
            } catch (duplicateError) {
                this.logger.warn('Error checking duplicates (non-fatal)', duplicateError);
                // Add a warning section about the check failure
                sections.push(this._buildCheckFailureWarning(duplicateError.message || 'Unknown error during duplicate check'));
            }

            // ========== SECTION 0B: ATTACHMENT DUPLICATE WARNING ==========
            try {
                const attachmentDuplicateStartedAt = Date.now();
                const attachmentWarning = this._checkForAttachmentDuplicates(messageId);
                this.logger.info('Preview attachment duplicate check timing', {
                    messageId: messageId,
                    durationMs: Date.now() - attachmentDuplicateStartedAt
                });
                if (attachmentWarning) {
                    sections.push(attachmentWarning);
                }
            } catch (attachmentError) {
                this.logger.warn('Error checking attachment duplicates (non-fatal)', attachmentError);
                sections.push(this._buildCheckFailureWarning(attachmentError.message || 'Unknown error during attachment duplicate check'));
            }

            // ========== SECTION 1: EMAIL DETAILS ==========
            const detailsStartedAt = Date.now();
            sections.push(this._buildEmailDetailsSection(messageId, status));
            this.logger.info('Preview details section timing', {
                messageId: messageId,
                durationMs: Date.now() - detailsStartedAt
            });

            // ========== SECTION 2: ATTACHMENTS (SELECTION) ==========
            const selectionStartedAt = Date.now();
            const attachmentSection = this._buildAttachmentSelectionSection(messageId);
            if (attachmentSection) {
                sections.push(attachmentSection);
            }
            this.logger.info('Preview attachment selection section timing', {
                messageId: messageId,
                durationMs: Date.now() - selectionStartedAt
            });

            // ========== SECTION 2B: ATTACHMENT MAPPING WARNING ==========
            const mappingWarningStartedAt = Date.now();
            const attachmentWarning = this._buildAttachmentMappingWarning(messageId);
            if (attachmentWarning) {
                sections.push(attachmentWarning);
            }
            this.logger.info('Preview attachment mapping warning timing', {
                messageId: messageId,
                durationMs: Date.now() - mappingWarningStartedAt
            });

            // ========== SECTION 2C: ATTACHMENT UPLOADS ==========
            const uploadsStartedAt = Date.now();
            const uploadSection = this._buildAttachmentUploadSection(messageId);
            if (uploadSection) {
                sections.push(uploadSection);
            }
            this.logger.info('Preview attachment uploads section timing', {
                messageId: messageId,
                durationMs: Date.now() - uploadsStartedAt
            });

            // ========== SECTION 3: MAPPINGS SUMMARY ==========
            const mappingSummaryStartedAt = Date.now();
            sections.push(this._buildMappingSummarySection(messageId));
            this.logger.info('Preview mapping summary timing', {
                messageId: messageId,
                durationMs: Date.now() - mappingSummaryStartedAt
            });

            // ========== SECTION 3B: ATTACHMENT MAPPINGS SUMMARY ==========
            const attachmentSummaryStartedAt = Date.now();
            const attachmentMappingSection = this._buildAttachmentMappingSummarySection(messageId);
            if (attachmentMappingSection) {
                sections.push(attachmentMappingSection);
            }
            this.logger.info('Preview attachment mapping summary timing', {
                messageId: messageId,
                durationMs: Date.now() - attachmentSummaryStartedAt
            });

            // ========== SECTION 4: ACTIONS ==========
            sections.push(this._buildActionSection(status, messageId));

            // ========== SECTION 5: Settings Button ==========
            sections.push(
                CardService.newCardSection().addWidget(
                    this.newButton('⚙️ Settings', 'showG2NSettings')
                )
            );

            const card = this.buildCard(header, sections);
            this.logger.info('Preview card total timing', {
                messageId: messageId,
                durationMs: Date.now() - startedAt,
                sectionCount: sections.length
            });
            return card;

        } catch (error) {
            this.logger.error('Preview build failed', error);
            
            // Safe error handling with fallback
            let errorMessage = 'An unknown error occurred';
            try {
                errorMessage = error.message || 'Unknown error';
            } catch (e) {
                // If even accessing error.message fails
                errorMessage = 'Critical error - check logs';
            }

            return this.buildCard(
                this.buildHeader('Error'),
                [
                    this.sectionWithHeader('Critical Failure').addWidget(
                        this.textParagraph(errorMessage)
                    )
                ]
            );
        }
    }

/**
 * Check for duplicate emails by searching the current database
 * for the Gmail URL in any URL property.
 *
 * Behavior:
 *  - If no URL properties exist, show a warning that a "Gmail Link"
 *    property will be created automatically on save.
 *  - If Gmail link is missing for this email, show a warning that
 *    duplicate detection is not possible for this message.
 *  - If a duplicate page is found, return a warning section with
 *    details and a "Save Anyway" button.
 *
 * @private
 * @param {string} messageId - Gmail message ID
 * @param {Object} status - Database status from DatabaseService.getStatus()
 * @returns {CardService.CardSection|null} A warning section or null
 */
_checkForDuplicates(messageId, status) {
  if (!messageId || !status.hasApiKey || !status.hasDatabaseId) {
    this.logger.debug('Skipping duplicate check - missing basics', {
      hasMessageId: !!messageId,
      hasApiKey: !!status.hasApiKey,
      hasDatabaseId: !!status.hasDatabaseId
    });
    return null;
  }
  
  try {
    this.logger.info('🔍 Starting duplicate check...');
    const config = this.configRepo.getAll();
    if (!config.apiKey || !config.databaseId) {
      this.logger.warn('Missing API key or database ID for duplicate check');
      return null;
    }
    
    // Extract email data
    const extracted = this._extractEmailData(messageId);
    if (!extracted || !extracted.emailData) {
      this.logger.warn('Cannot extract email data for duplicate check');
      return this._buildNoLinkFoundWarning();
    }
    
    const emailData = extracted.emailData;
    
    // ✅ ENHANCED FIX B: Get message ID using multiple methods
    let msgId = emailData.messageId;
    
    // If no message ID from emailData, try to extract from Gmail URL
    if (!msgId && extracted.gmailLinkUrl) {
      msgId = this._extractMessageIdFromUrl(extracted.gmailLinkUrl);
      this.logger.debug('Extracted message ID from URL', { msgId });
    }
    
    // Also try to extract from the original messageId parameter
    if (!msgId && messageId) {
      const extractedFromParam = this._extractMessageIdFromInput(messageId);
      if (extractedFromParam) {
        msgId = extractedFromParam;
        this.logger.debug('Extracted message ID from parameter', { 
          original: messageId,
          extracted: msgId 
        });
      }
    }
    
    if (!msgId) {
      this.logger.warn('Cannot check duplicates - no message ID available');
      return this._buildNoLinkFoundWarning();
    }

    this.logger.debug('Using message ID for duplicate check', { 
      msgId,
      source: emailData.messageId ? 'emailData' : 'extracted'
    });

    // Get database schema
    const dbSchema = this.notionService.adapter.getDatabase(config.databaseId, config.apiKey);
    const urlProperties = (dbSchema.properties || []).filter(p => p.type === 'url');

    this.logger.info('URL properties in database', {
      count: urlProperties.length,
      names: urlProperties.map(p => p.name)
    });

    // No URL properties -> show explicit info section
    if (urlProperties.length === 0) {
      this.logger.warn('No URL properties in database; Gmail Link will be created on save');
      return this._buildNoUrlPropertyWarning();
    }

    // Try each URL property
    for (const urlProp of urlProperties) {
      const propName = urlProp.name;

      try {
        // ✅ FIX B: Use contains instead of equals for more flexible matching
        const queryPayload = {
          page_size: 10,
          filter: {
            property: propName,
            url: { contains: msgId }  // Matches any URL containing the message ID
          }
        };

        this.logger.info(`Searching for duplicates in property "${propName}"`, {
          messageId: msgId,
          filterType: 'contains',
          propertyName: propName
        });

        const results = this.notionService.adapter.queryDatabase(
          config.databaseId,
          queryPayload,
          config.apiKey
        );

        if (results && results.length > 0) {
          const page = results[0];
          const existingPage = {
            id: page.id,
            url: page.url,
            title: this._extractPageTitle(page),
            property: propName,
            matchType: 'contains message ID',
            messageId: msgId
          };

          this.logger.info('⚠️ DUPLICATE DETECTED', {
            title: existingPage.title,
            url: existingPage.url,
            property: propName,
            messageId: msgId,
            matchType: 'contains filter'
          });

          return this._buildDuplicateWarningSection(existingPage, messageId);
        }
      } catch (filterError) {
        // ✅ ENHANCED LOGGING: Log filter error details
        this.logger.warn(`Filter query for property "${propName}" failed`, {
          error: filterError.message || String(filterError),
          filterType: 'contains',
          messageId: msgId,
          propertyName: propName
        });
        
        // Fallback: manual scan of recent pages if filter fails
        this.logger.debug('Falling back to manual scan for duplicates');
        
        const recentPages = this.notionService.adapter.queryDatabase(
          config.databaseId,
          { page_size: 50 },
          config.apiKey
        );
        
        let manualMatchFound = false;
        for (const page of recentPages) {
          const props = page.properties || {};
          const pageUrlVal = props[propName]?.url;
          
          if (pageUrlVal && pageUrlVal.includes(msgId)) {
            const existingPage = {
              id: page.id,
              url: page.url,
              title: this._extractPageTitle(page),
              property: propName,
              matchType: 'URL contains message ID (manual scan)'
            };
            this.logger.info('⚠️ DUPLICATE DETECTED (manual fallback)', {
              title: existingPage.title,
              url: existingPage.url,
              property: propName,
              messageId: msgId
            });
            manualMatchFound = true;
            return this._buildDuplicateWarningSection(existingPage, messageId);
          }
        }
        
        if (!manualMatchFound) {
          this.logger.debug(`No manual matches found for property "${propName}"`);
        }
      }
    }
    
    this.logger.info('✅ No duplicates found for message', { messageId: msgId });
    return null;
    
  } catch (error) {
    this.logger.error('Duplicate check failed', {
      message: error.message,
      stack: error.stack
    });
    return this._buildCheckFailureWarning('Error checking for duplicates: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Check for duplicate attachments by searching the attachment database
 * for attachment name/size matches.
 *
 * @private
 * @param {string} messageId - Gmail message ID
 * @returns {CardService.CardSection|null}
 */
_checkForAttachmentDuplicates(messageId) {
  if (!messageId) return null;

  const config = this.configRepo.getAll();
  if (!config.apiKey || !config.attachmentDatabaseId) {
    this.logger.debug('Skipping attachment duplicate check - no attachment database configured');
    return null;
  }
  if (!config.attachmentUseSeparateDatabase) {
    this.logger.debug('Skipping attachment duplicate check - separate attachment database disabled');
    return null;
  }

  if (config.fileHandling === 'skip') {
    this.logger.debug('Skipping attachment duplicate check - attachments disabled');
    return null;
  }

  const extracted = this._extractEmailData(messageId);
  const emailData = extracted ? extracted.emailData : null;
  if (!emailData) return null;

  const selectionKey = this._getSelectionKey(messageId, emailData);
  const sourceAttachments = this._getAttachmentsForMessage(messageId, emailData);
  const selectionState = this.container.resolve('attachmentService')
    .getSelectedAttachmentNames(selectionKey);
  let selectedAttachments = sourceAttachments;
  try {
    const attachmentService = this.container.resolve('attachmentService');
    if (selectionState !== null) {
      selectedAttachments = attachmentService.filterSelectedAttachments(
        sourceAttachments,
        selectionKey
      );
    }
  } catch (error) {
    this.logger.debug('Attachment selection lookup failed', error.message);
  }

  if (!selectedAttachments || selectedAttachments.length === 0) {
    this.logger.debug('Skipping attachment duplicate check - no attachments selected');
    return null;
  }

  const gmailDuplicate = this._checkAttachmentDuplicatesByGmailLink(emailData, config);
  if (gmailDuplicate) {
    return gmailDuplicate;
  }
  const attachments = selectedAttachments;
  if (!attachments || attachments.length === 0) return null;

  const mappingRepo = this.container.resolve('attachmentMappingRepo');
  const mappings = mappingRepo.getAll();
  const nameMapping = this._findAttachmentMapping(mappings, 'attachmentName');
  const sizeMapping = this._findAttachmentMapping(mappings, 'attachmentSize');

  if (!nameMapping) {
    return this._buildAttachmentCheckUnavailable('Attachment Name mapping not configured.');
  }

  const duplicates = [];

  attachments.forEach(att => {
    const name = att.getName ? att.getName() : '';
    const size = att.getSize ? att.getSize() : 0;
    if (!name) return;

    const filters = [];
    const nameFilter = this._buildEqualsFilter(nameMapping, name);
    if (nameFilter) filters.push(nameFilter);

    if (sizeMapping) {
      const sizeFilter = this._buildEqualsFilter(sizeMapping, size);
      if (sizeFilter) filters.push(sizeFilter);
    }

    if (filters.length === 0) return;

    const filterPayload = filters.length === 1 ? filters[0] : { and: filters };
    const queryPayload = { page_size: 5, filter: filterPayload };

    try {
      const results = this.notionService.adapter.queryDatabase(
        config.attachmentDatabaseId,
        queryPayload,
        config.apiKey
      );

      if (results && results.length > 0) {
        duplicates.push({
          name: name,
          url: results[0].url,
          id: results[0].id
        });
      }
    } catch (e) {
      this.logger.warn('Attachment duplicate query failed', e);
    }
  });

  if (duplicates.length === 0) {
    return null;
  }

  return this._buildAttachmentDuplicateWarning(duplicates);
}

/**
 * Check attachment database for duplicates using Gmail URL/message ID
 * @private
 * @param {EmailData} emailData
 * @param {Object} config
 * @returns {CardService.CardSection|null}
 */
_checkAttachmentDuplicatesByGmailLink(emailData, config) {
  try {
    let msgId = emailData.messageId;
    if (!msgId && emailData.gmailLinkUrl) {
      msgId = this._extractMessageIdFromUrl(emailData.gmailLinkUrl);
    }

    if (!msgId) return null;

    const dbSchema = this.notionService.adapter.getDatabase(config.attachmentDatabaseId, config.apiKey);
    const urlProperties = (dbSchema.properties || []).filter(p => p.type === 'url');
    if (urlProperties.length === 0) return null;

    for (const urlProp of urlProperties) {
      const queryPayload = {
        page_size: 5,
        filter: {
          property: urlProp.name,
          url: { contains: msgId }
        }
      };

      const results = this.notionService.adapter.queryDatabase(
        config.attachmentDatabaseId,
        queryPayload,
        config.apiKey
      );

      if (results && results.length > 0) {
        const page = results[0];
        return this._buildAttachmentGmailDuplicateWarning({
          id: page.id,
          url: page.url,
          title: this._extractPageTitle(page),
          property: urlProp.name
        });
      }
    }

    return null;
  } catch (error) {
    this.logger.warn('Attachment Gmail-link duplicate check failed', error);
    return null;
  }
}

/**
 * Build Gmail-link duplicate warning for attachments
 * @private
 */
_buildAttachmentGmailDuplicateWarning(existingPage) {
  const section = CardService.newCardSection();

  section.addWidget(
    CardService.newDecoratedText()
      .setText('<b style="color: #d93025;">⚠️ ATTACHMENTS ALREADY SAVED</b>')
      .setTopLabel('Attachment database already contains entries for this email')
      .setWrapText(true)
  );

  section.addWidget(
    CardService.newKeyValue()
      .setTopLabel('Existing Page')
      .setContent(existingPage.title || 'Untitled Page')
      .setMultiline(true)
  );

  section.addWidget(
    CardService.newTextParagraph()
      .setText(`<font color="#666666"><i>Found in property: <b>${existingPage.property}</b></i></font>`)
  );

  section.addWidget(
    CardService.newButtonSet()
      .addButton(
        CardService.newTextButton()
          .setText('📄 View in Notion')
          .setBackgroundColor('#4285F4')
          .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
          .setOpenLink(
            CardService.newOpenLink()
              .setUrl(existingPage.url)
              .setOpenAs(CardService.OpenAs.FULL_SIZE)
          )
      )
  );

  return section;
}

/**
 * Build attachment selection section for preview
 * @private
 * @param {string} messageId
 * @returns {CardService.CardSection|null}
 */
_buildAttachmentSelectionSection(messageId) {
  try {
    if (!messageId) return null;
    const extracted = this._extractEmailData(messageId);
    const emailData = extracted ? extracted.emailData : null;
    const attachments = this._getAttachmentsForMessage(messageId, emailData);
    if (!attachments || attachments.length === 0) {
      const emptySection = CardService.newCardSection()
        .setHeader('📎 Attachments to Upload')
        .addWidget(
          CardService.newTextParagraph()
            .setText('<i>No attachments found for this email.</i>')
        );
      return emptySection;
    }

    const selectionKey = this._getSelectionKey(messageId, emailData);
    const attachmentService = this.container.resolve('attachmentService');
    const selectedNames = attachmentService.getSelectedAttachmentNames(selectionKey);

    const section = CardService.newCardSection()
      .setHeader('📎 Attachments to Upload');

    const selection = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('selected_attachments')
      .setTitle('Choose attachments');

    attachments.forEach(att => {
      const name = att.getName ? att.getName() : 'Attachment';
      const isSelected = selectedNames === null
        ? true
        : selectedNames.includes(name);
      selection.addItem(name, name, isSelected);
    });

    section.addWidget(selection);

    section.addWidget(
      CardService.newTextParagraph()
        .setText('<i>If the Files property does not exist, it will be created when you save attachments.</i>')
    );

    const selectedLabel = selectedNames === null
      ? 'All attachments (default)'
      : (selectedNames.length > 0 ? selectedNames.join(', ') : 'None selected');

    section.addWidget(
      CardService.newTextParagraph()
        .setText(`<b>Selected:</b> ${selectedLabel}`)
    );

    section.addWidget(
      CardService.newButtonSet()
        .addButton(
          CardService.newTextButton()
            .setText('✅ Update Selection')
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName('saveSelectedAttachments')
                .setParameters({
                  messageId: messageId,
                  selectionKey: selectionKey,
                  totalCount: String(attachments.length)
                })
            )
        )
    );

    return section;
  } catch (error) {
    this.logger.warn('Failed to build attachment selection section', error);
    return null;
  }
}

/**
 * Warn if attachments are selected but no files property is mapped
 * @private
 * @param {string} messageId
 * @returns {CardService.CardSection|null}
 */
_buildAttachmentMappingWarning(messageId) {
  try {
    if (!messageId) return null;
    const config = this.configRepo.getAll();
    if (!config.attachmentDatabaseId) return null;
    if (!config.attachmentUseSeparateDatabase) return null;

    const extracted = this._extractEmailData(messageId);
    const emailData = extracted ? extracted.emailData : null;
    const attachments = this._getAttachmentsForMessage(messageId, emailData);
    if (!attachments || attachments.length === 0) return null;

    const selectionKey = this._getSelectionKey(messageId, emailData);
    const attachmentService = this.container.resolve('attachmentService');
    const selected = attachmentService.getSelectedAttachmentNames(selectionKey);
    if (selected === null) return null;
    const selectedCount = selected.length;
    if (selectedCount === 0) return null;

    const mappingRepo = this.container.resolve('attachmentMappingRepo');
    const mappings = Object.values(mappingRepo.getAll() || {});
    const hasFilesMapping = mappings.some(m => m && m.type === 'files' && (m.enabled || m.isRequired));

    const attachmentDbService = this.container.resolve('attachmentDatabaseService');
    const schema = attachmentDbService.getCurrentSchema();
    const hasFilesProperty = schema && Array.isArray(schema.properties)
      ? schema.properties.some(p => p.type === 'files')
      : false;

    const warnings = [];
    if (!hasFilesMapping) {
      warnings.push('No Files property is mapped in attachment mappings.');
    }
    if (!hasFilesProperty) {
      warnings.push('Attachment database has no Files property.');
    }
    if (config.fileHandling === 'link_only') {
      warnings.push('File handling is set to "Link only" so files will not be uploaded.');
    }

    if (warnings.length === 0) return null;

    const section = CardService.newCardSection()
      .setHeader('⚠️ Attachments Not Ready');

    section.addWidget(
      CardService.newTextParagraph()
        .setText(warnings.map(w => `• ${w}`).join('<br/>'))
    );

    const buttonSet = CardService.newButtonSet()
      .addButton(
        CardService.newTextButton()
          .setText('🛠️ Create Files Property')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('ensureAttachmentFilesPropertyFromConfig')
          )
      )
      .addButton(
        CardService.newTextButton()
          .setText('📎 Open Attachment Mappings')
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
      );

    section.addWidget(buttonSet);
    return section;
  } catch (error) {
    this.logger.warn('Attachment mapping warning failed', error);
    return null;
  }
}

/**
 * Show last uploaded attachment links (Drive)
 * @private
 * @param {string} messageId
 * @returns {CardService.CardSection|null}
 */
_buildAttachmentUploadSection(messageId) {
  try {
    const attachmentService = this.container.resolve('attachmentService');
    const last = attachmentService.getLastUploadedAttachments();
    if (!last || !last.uploaded || last.uploaded.length === 0) return null;
    if (last.messageId && messageId && last.messageId !== messageId) return null;

    const section = CardService.newCardSection()
      .setHeader('📂 Uploaded Attachments');

    last.uploaded.forEach(file => {
      if (!file || !file.url) return;
      section.addWidget(
        CardService.newTextParagraph()
          .setText(`<a href="${file.url}">${file.name || 'Attachment'}</a>`)
      );
    });

    return section;
  } catch (error) {
    this.logger.warn('Attachment upload section failed', error);
    return null;
  }
}

/**
 * Get attachments for a message, with fallback to GmailApp
 * @private
 * @param {string} messageId
 * @param {EmailData|null} emailData
 * @returns {Array}
 */
    _getAttachmentsForMessage(messageId, emailData) {
      const fallback = emailData && Array.isArray(emailData.attachments) ? emailData.attachments : [];
      try {
        const attachmentService = this.container.resolve('attachmentService');
        return attachmentService.getAttachmentsForMessage(messageId, fallback);
      } catch (error) {
        this.logger.debug('Attachment service fetch failed', error.message);
        return fallback;
      }
    }

    /**
     * Normalize selection key for attachment selection storage
     * @private
     * @param {string} messageId
     * @param {EmailData|null} emailData
     * @returns {string}
     */
    _getSelectionKey(messageId, emailData) {
        if (emailData && emailData.messageId) return emailData.messageId;
        return messageId;
    }

/**
 * Find mapping for attachment field
 * @private
 */
_findAttachmentMapping(mappings, fieldName) {
  const entries = Object.values(mappings || {});
  return entries.find(m => m && m.emailField === fieldName && (m.enabled || m.isRequired));
}

/**
 * Build a Notion filter for equals on a mapping type
 * @private
 */
_buildEqualsFilter(mapping, value) {
  if (!mapping || !mapping.notionPropertyName) return null;

  switch (mapping.type) {
    case 'title':
      return { property: mapping.notionPropertyName, title: { equals: String(value) } };
    case 'rich_text':
      return { property: mapping.notionPropertyName, rich_text: { equals: String(value) } };
    case 'url':
      return { property: mapping.notionPropertyName, url: { equals: String(value) } };
    case 'number':
      return { property: mapping.notionPropertyName, number: { equals: Number(value) } };
    default:
      return null;
  }
}

/**
 * Build attachment duplicate warning section
 * @private
 * @param {Array<{name: string, url: string}>} duplicates
 * @returns {CardService.CardSection}
 */
_buildAttachmentDuplicateWarning(duplicates) {
  const section = CardService.newCardSection();

  section.addWidget(
    CardService.newDecoratedText()
      .setText('<b style="color: #d93025;">⚠️ DUPLICATE ATTACHMENTS DETECTED</b>')
      .setTopLabel('Some attachments already exist in the attachment database')
      .setWrapText(true)
  );

  const names = duplicates.map(d => d.name).join('<br/>');
  section.addWidget(
    CardService.newTextParagraph()
      .setText(`<b>Duplicates:</b><br/>${names}`)
  );

  const firstUrl = duplicates[0]?.url;
  if (firstUrl) {
    section.addWidget(
      CardService.newButtonSet()
        .addButton(
          CardService.newTextButton()
            .setText('📄 View Existing')
            .setBackgroundColor('#4285F4')
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOpenLink(
              CardService.newOpenLink()
                .setUrl(firstUrl)
                .setOpenAs(CardService.OpenAs.FULL_SIZE)
            )
        )
    );
  }

  return section;
}

/**
 * Build warning section when attachment duplicate check cannot run
 * @private
 */
_buildAttachmentCheckUnavailable(reason) {
  const section = CardService.newCardSection();
  section.addWidget(
    CardService.newDecoratedText()
      .setText('<b style="color: #f4b400;">⚠️ Attachment Duplicate Check Unavailable</b>')
      .setTopLabel('Warning')
      .setWrapText(true)
  );
  section.addWidget(
    CardService.newTextParagraph()
      .setText(`Attachments cannot be checked for duplicates. ${reason}`)
  );
  return section;
}

/**
 * Extract message ID from various input formats
 * @private
 */
_extractMessageIdFromInput(input) {
  if (!input) return null;
  
  // Handle "msg-f:" format
  if (input.includes(':')) {
    return input.split(':').pop();
  }
  
  // Handle URL format
  if (input.includes('mail.google.com')) {
    return this._extractMessageIdFromUrl(input);
  }
  
  // Assume it's already a message ID
  return input;
}

/**
 * Clean Gmail URL for consistent comparison
 * @private
 * @param {string} url - Gmail URL
 * @returns {string} Cleaned URL
 */
_cleanGmailUrlForComparison(url) {
  if (!url) return '';
  
  try {
    // Remove tracking parameters and fragments
    const urlObj = new URL(url);
    
    // Keep only essential parts
    return `https://${urlObj.hostname}${urlObj.pathname}${urlObj.hash || ''}`;
  } catch (e) {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Check if two URLs match (loose comparison)
 * @private
 * @param {string} url1 - First URL
 * @param {string} url2 - Second URL
 * @returns {boolean} True if URLs match
 */
_urlsMatch(url1, url2) {
  if (!url1 || !url2) return false;
  
  // Extract message IDs from both URLs
  const msgId1 = this._extractMessageIdFromUrl(url1);
  const msgId2 = this._extractMessageIdFromUrl(url2);
  
  // If we can extract message IDs, compare them
  if (msgId1 && msgId2) {
    return msgId1 === msgId2;
  }
  
  // Fallback to substring matching
  return url1.includes(url2) || url2.includes(url1);
}

/**
 * Extract message ID from Gmail URL
 * @private
 * @param {string} url - Gmail URL
 * @returns {string|null} Message ID or null
 */
_extractMessageIdFromUrl(url) {
  if (!url) return null;
  
  try {
    // Common patterns in Gmail URLs
    const patterns = [
      /\/#inbox\/([a-zA-Z0-9]+)/,                     // /#inbox/123abc
      /#inbox\/([a-zA-Z0-9]+)/,                       // #inbox/123abc
      /\?[^#]*#inbox\/([a-zA-Z0-9]+)/,                // ?tab=rm#inbox/123abc
      /\/label\/[^\/]+\/([a-zA-Z0-9]+)/,              // /label/Work/123abc
      /\/([a-zA-Z0-9]{12,20})(?:[?\/]|$)/             // Standalone ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Try to find any alphanumeric sequence that looks like an ID
    const allMatches = url.match(/[a-zA-Z0-9]{12,20}/g);
    if (allMatches && allMatches.length > 0) {
      // Return the longest match (most likely to be the message ID)
      return allMatches.sort((a, b) => b.length - a.length)[0];
    }
    
    return null;
  } catch (e) {
    this.logger.warn('Error extracting message ID from URL', {
      url: url.substring(0, 30) + '...',
      error: e.message
    });
    return null;
  }
}

/**
 * Ensure the current database has a URL property to hold Gmail links.
 * Tries to:
 *  1) Use an existing "Gmail Link" URL property,
 *  2) Use the first existing URL property,
 *  3) Create "Gmail Link" if none exist.
 *
 * @private
 * @param {string} [propertyName='Gmail Link'] - Preferred property name
 * @returns {Promise<string>} Resolved property name to use for Gmail links
 */
async _ensureGmailUrlProperty(propertyName = 'Gmail Link') {
  const config = this.configRepo.getAll();
  const notionAdapter = this.container.resolve('notionAdapter');

  try {
    const dbSchema = notionAdapter.getDatabase(config.databaseId, config.apiKey);
    const propsArray = Array.isArray(dbSchema.properties) ? dbSchema.properties : [];

    // 1) Check for exact "Gmail Link" URL property
    const gmailLinkProp = propsArray.find(
      p => p.name === propertyName && p.type === 'url'
    );
    if (gmailLinkProp) {
      return propertyName;
    }

    // 2) Use the first existing URL property if any
    const existingUrlProp = propsArray.find(p => p.type === 'url');
    if (existingUrlProp) {
      this.logger.info('Using existing URL property for Gmail links', {
        propertyName: existingUrlProp.name
      });
      return existingUrlProp.name;
    }

    // 3) No URL properties: create "Gmail Link"
    this.logger.info(`Creating URL property: ${propertyName}`);
    notionAdapter.ensureUrlProperty(config.databaseId, propertyName, config.apiKey);
    return propertyName;
  } catch (error) {
    this.logger.warn('Failed to ensure URL property', error);
    // Return the preferred name anyway; PageService will also attempt creation
    return propertyName;
  }
}

/**
 * Find or create a URL property for Gmail links
 * @private
 * @returns {Object|null} URL property info or null
 */
_findOrCreateGmailUrlProperty() {
  try {
    const config = this.configRepo.getAll();
    if (!config.apiKey || !config.databaseId) {
      this.logger.warn('Missing API key or database ID');
      return null;
    }

    // Get database schema
    const dbSchema = this.notionService.adapter.getDatabase(config.databaseId, config.apiKey);
    const properties = dbSchema.properties || {};

    // First, check if we already have a "Gmail Link" property
    if (properties['Gmail Link'] && properties['Gmail Link'].type === 'url') {
      this.logger.info('Found existing "Gmail Link" URL property');
      return {
        name: 'Gmail Link',
        type: 'url',
        id: properties['Gmail Link'].id
      };
    }

    // Second, look for any URL property that contains Gmail links
    const urlProperties = Object.entries(properties)
      .filter(([name, prop]) => prop.type === 'url')
      .map(([name, prop]) => ({ name, type: prop.type, id: prop.id }));

    // Check each URL property to see if it contains Gmail links
    for (const urlProp of urlProperties) {
      this.logger.debug(`Checking URL property "${urlProp.name}" for Gmail links`);
      
      // Sample recent pages to see what's in this property
      const recentPages = this.notionService.adapter.queryDatabase(
        config.databaseId,
        { page_size: 10 },
        config.apiKey
      );

      for (const page of recentPages) {
        const pageProps = page.properties || {};
        const propValue = pageProps[urlProp.name];
        
        if (propValue && propValue.type === 'url' && propValue.url) {
          if (propValue.url.includes('mail.google.com')) {
            this.logger.info(`Found existing URL property with Gmail links: "${urlProp.name}"`);
            return urlProp;
          }
        }
      }
    }

    // Third, check if any URL property has "gmail" in its name
    for (const urlProp of urlProperties) {
      if (urlProp.name.toLowerCase().includes('gmail') || 
          urlProp.name.toLowerCase().includes('link') ||
          urlProp.name.toLowerCase().includes('url')) {
        this.logger.info(`Found URL property with relevant name: "${urlProp.name}"`);
        return urlProp;
      }
    }

    // Fourth, if we found any URL property at all, use the first one
    if (urlProperties.length > 0) {
      this.logger.info(`Using first available URL property: "${urlProperties[0].name}"`);
      return urlProperties[0];
    }

    // Fifth, create a new "Gmail Link" URL property
    this.logger.info('No suitable URL property found, creating "Gmail Link"');
    try {
      const updatedDb = this.notionService.adapter.ensureUrlProperty(
        config.databaseId,
        'Gmail Link',
        config.apiKey
      );
      
      if (updatedDb && updatedDb.properties && updatedDb.properties['Gmail Link']) {
        this.logger.info('Successfully created "Gmail Link" URL property');
        return {
          name: 'Gmail Link',
          type: 'url',
          id: updatedDb.properties['Gmail Link'].id
        };
      }
    } catch (createError) {
      this.logger.warn('Failed to create URL property', createError.message);
    }

    // If all else fails, return null
    return null;

  } catch (error) {
    this.logger.error('Error finding/creating Gmail URL property', error);
    return null;
  }
}

    /**
     * Extract title from a Notion page
     * @private
     * @param {Object} page - Notion page object
     * @returns {string} Page title or "Untitled"
     */
    _extractPageTitle(page) {
      try {
        if (!page || !page.properties) return 'Untitled';
        
        // Find the title property
        const titleProp = Object.values(page.properties).find(p => p && p.type === 'title');
        
        if (titleProp && titleProp.title && Array.isArray(titleProp.title)) {
          // Combine all text parts
          return titleProp.title.map(t => t.plain_text || '').join('') || 'Untitled';
        }
        
        return 'Untitled';
      } catch (e) {
        this.logger.debug('Error extracting page title', e);
        return 'Untitled';
      }
    }

/**
 * Build duplicate warning section
 * @private
 * @param {Object} existingPage - Existing Notion page
 * @param {string} messageId - Gmail message ID
 * @returns {CardService.CardSection} Duplicate warning section
 */
_buildDuplicateWarningSection(existingPage, messageId) {
  this.logger.info('Building duplicate warning UI', {
    pageTitle: existingPage.title,
    property: existingPage.property
  });

  const section = CardService.newCardSection();

  // Warning header
  section.addWidget(
    CardService.newDecoratedText()
      .setText('<b style="color: #d93025;">⚠️ DUPLICATE EMAIL DETECTED</b>')
      .setTopLabel('This email is already saved in Notion')
      .setWrapText(true)
  );

  // Existing page info
  section.addWidget(
    CardService.newKeyValue()
      .setTopLabel('Existing Page')
      .setContent(existingPage.title || 'Untitled Page')
      .setMultiline(true)
  );

  // Match details
  section.addWidget(
    CardService.newTextParagraph()
      .setText(`<font color="#666666"><i>Found in property: <b>${existingPage.property}</b></i></font>`)
  );

  // Link to existing page
  const buttonSet = CardService.newButtonSet();
  
  buttonSet.addButton(
    CardService.newTextButton()
      .setText('📄 View in Notion')
      .setBackgroundColor('#4285F4')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOpenLink(
        CardService.newOpenLink()
          .setUrl(existingPage.url)
          .setOpenAs(CardService.OpenAs.FULL_SIZE)
      )
  );

  // Save anyway button
  buttonSet.addButton(
    CardService.newTextButton()
      .setText('💾 Save Anyway')
      .setBackgroundColor('#0F9D58')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('quickG2NSaveEmail')
          .setParameters({
            messageId: messageId,
            skipDuplicateCheck: 'true'
          })
      )
  );

  section.addWidget(buttonSet);

  return section;
}

    /**
     * Build check failure warning - shown when duplicate check fails
     * @private
     * @param {string} errorMessage - Error message
     * @returns {CardService.CardSection} Warning section
     */
    _buildCheckFailureWarning(errorMessage) {
        const section = CardService.newCardSection();
        
        section.addWidget(
            CardService.newDecoratedText()
                .setText('<b style="color: #f4b400;">⚠️ Duplicate Check Failed</b>')
                .setTopLabel('Warning')
                .setWrapText(true)
        );
        
        section.addWidget(
            CardService.newTextParagraph()
                .setText(`Could not verify if this email already exists in Notion.\n\n<i>${errorMessage}</i>`)
        );
        
        return section;
    }

/**
 * Extract email data for preview and duplicate checking.
 * Returns a wrapper containing the immutable EmailData and a normalized Gmail URL.
 *
 * @private
 * @param {string} messageId - Gmail message ID
 * @returns {{ emailData: EmailData, gmailLinkUrl: string } | null}
 */
_extractEmailData(messageId) {
  try {
    const gmailAdapter = this.container.resolve('gmailAdapter');
    const emailRaw = gmailAdapter.getMessage(messageId);

    if (!emailRaw) {
      this.logger.warn('Gmail adapter returned null', { messageId });
      return null;
    }

    const emailData = new EmailData(emailRaw);
    const normalizedUrl = emailData.gmailLinkUrl
      ? this._normalizeGmailUrl(emailData.gmailLinkUrl)
      : '';

    this.logger.debug('Email extracted for preview', {
      subject: emailData.subject,
      hasUrl: !!normalizedUrl,
      urlSample: normalizedUrl ? normalizedUrl.substring(0, 50) + '...' : 'N/A'
    });

    return { emailData, gmailLinkUrl: normalizedUrl };
  } catch (error) {
    this.logger.error('Failed to extract email data', error.message || error);
    return null;
  }
}

/**
 * Normalize Gmail URL to a consistent format
 * @private
 * @param {string} url - Original Gmail URL
 * @returns {string} Normalized URL
 */
_normalizeGmailUrl(url) {
  if (!url) return '';
  
  try {
    // Extract the message ID
    const messageId = this._extractMessageIdFromUrl(url);
    if (!messageId) return url;
    
    // Create a standardized URL format
    return `https://mail.google.com/mail/u/0/#inbox/${messageId}`;
  } catch (e) {
    this.logger.warn('Error normalizing Gmail URL', { 
      url: url.substring(0, 30) + '...', 
      error: e.message 
    });
    return url;
  }
}

/**
 * Build warning section when the database has no URL properties at all.
 * Informs the user that a "Gmail Link" URL field will be created automatically.
 *
 * @private
 * @returns {CardService.CardSection}
 */
_buildNoUrlPropertyWarning() {
  const section = CardService.newCardSection();

  section.addWidget(
    CardService.newDecoratedText()
      .setText('<b style="color: #f4b400;">⚠️ No URL property found</b>')
      .setTopLabel('Info')
      .setWrapText(true)
  );

  section.addWidget(
    CardService.newTextParagraph()
      .setText(
        'No URL properties were found in the selected Notion database. ' +
        'A <b>"Gmail Link"</b> URL property will be created automatically when you save this email, ' +
        'so future duplicate checks can work.'
      )
  );

  return section;
}

/**
 * Build warning section when the current email has no Gmail link URL.
 *
 * @private
 * @returns {CardService.CardSection}
 */
_buildNoLinkFoundWarning() {
  const section = CardService.newCardSection();

  section.addWidget(
    CardService.newDecoratedText()
      .setText('<b style="color: #f4b400;">⚠️ Gmail link not available</b>')
      .setTopLabel('Info')
      .setWrapText(true)
  );

  section.addWidget(
    CardService.newTextParagraph()
      .setText(
        'This email does not have a detectable Gmail URL. Duplicate detection is not possible for this message. ' +
        'If you save it, a Gmail Link will be stored in Notion so future checks can detect duplicates.'
      )
  );

  return section;
}

    /**
     * Build email details section
     * @private
     * @param {string} messageId - Gmail message ID
     * @param {Object} status - Database status
     * @returns {CardService.CardSection} Email details section
     */
_buildEmailDetailsSection(messageId, status) {
  const section = this.sectionWithHeader('📧 Email Preview');
  
  section.addWidget(
    this.keyValue('Saving to', status.databaseName || 'Not Selected')
  );

  if (messageId) {
    try {
      // ✅ FIX C: Use gmailAdapter for consistency with other parts of the app
      let emailData = null;
      let subject = 'Could not load subject';
      let from = 'Unknown';
      let date = 'Unknown';
      
      try {
        // Try to use gmailAdapter first (consistent with other parts)
        const gmailAdapter = this.container.resolve('gmailAdapter');
        const rawEmail = gmailAdapter.getMessage(messageId);
        
        if (rawEmail) {
          emailData = new EmailData(rawEmail);
          subject = emailData.subject || '(No Subject)';
          from = emailData.from || 'Unknown';
          date = emailData.date ? emailData.date.toLocaleString() : 'Unknown';
        } else {
          // Fallback to GmailApp directly
          this.logger.debug('gmailAdapter returned null, falling back to GmailApp');
          throw new Error('gmailAdapter returned null');
        }
      } catch (adapterError) {
        // Fallback: use GmailApp directly with ID normalization
        this.logger.debug('Using GmailApp fallback for preview', { 
          error: adapterError.message 
        });
        
        // Normalize message ID format (handle msg-f: prefix)
        let actualId = messageId;
        if (actualId.includes(':')) {
          actualId = actualId.split(':').pop();
        }
        
        const msg = GmailApp.getMessageById(actualId);
        if (msg) {
          subject = msg.getSubject() || '(No Subject)';
          from = msg.getFrom() || 'Unknown';
          date = msg.getDate() ? msg.getDate().toLocaleString() : 'Unknown';
        }
      }
      
      section.addWidget(this.keyValue('Subject', subject, true));
      section.addWidget(this.keyValue('From', from));
      section.addWidget(this.keyValue('Date', date));
      
    } catch (e) {
      this.logger.warn('Could not load email details', { 
        messageId, 
        error: e.message 
      });
      section.addWidget(
        this.textParagraph("<font color='#ea4335'>⚠️ Could not load email details</font>")
      );
    }
  }
  
  return section;
}

    /**
     * Build mapping summary section
     * @private
     * @returns {CardService.CardSection} Mapping summary section
     */
    _buildMappingSummarySection(messageId) {
        const section = this.sectionWithHeader('📋 Email Mappings');
        const enabledMappings = this.mappingRepo.getEnabled();
        const mappingKeys = Object.keys(enabledMappings);
        const extracted = messageId ? this._extractEmailData(messageId) : null;
        const emailData = extracted ? extracted.emailData : null;

        if (mappingKeys.length > 0) {
            let html = '<b>Enabled Mappings:</b><br/>';
            mappingKeys.forEach(id => {
                const m = enabledMappings[id];
                const value = this._getMappingValueSnippet(m, emailData, null);
                const display = value ? `<font color="#34a853">${value}</font>` : '<i>Value</i>';
                html += `• <b>${m.notionPropertyName}</b> ← ${display}<br/>`;
            });
            section.addWidget(this.textParagraph(html));
        } else {
            section.addWidget(this.textParagraph('<i>No fields mapped yet.</i>'));
        }

        return section;
    }

    /**
     * Build attachment mapping summary section
     * @private
     * @param {string} messageId
     * @returns {CardService.CardSection|null}
     */
    _buildAttachmentMappingSummarySection(messageId) {
        try {
            const config = this.configRepo.getAll();
            if (!config.attachmentUseSeparateDatabase) {
                return null;
            }
            const extracted = this._extractEmailData(messageId);
            const emailData = extracted ? extracted.emailData : null;
            const selectionKey = this._getSelectionKey(messageId, emailData);
            const attachmentService = this.container.resolve('attachmentService');
            const selectedNames = attachmentService.getSelectedAttachmentNames(selectionKey);
            if (selectedNames === null || selectedNames.length === 0) {
                return null;
            }

            const section = this.sectionWithHeader('📋 Attachment Mappings');
            const attachmentMappingRepo = this.container.resolve('attachmentMappingRepo');
            const enabledMappings = attachmentMappingRepo.getEnabled();
            const mappingKeys = Object.keys(enabledMappings);

            const attachmentDbName = config.attachmentDatabaseName || config.databaseName || 'Attachment DB';
            section.addWidget(this.textParagraph(`Database: <b>${attachmentDbName}</b>`));

            if (mappingKeys.length > 0) {
                let html = '<b>Enabled Mappings:</b><br/>';
                mappingKeys.forEach(id => {
                    const m = enabledMappings[id];
                    const sourceValue = this._getAttachmentMappingValueSnippet(
                        m,
                        messageId
                      );
                    const display = sourceValue
                      ? `<font color="#34a853">${sourceValue}</font>`
                      : '<i>Value</i>';
                    html += `• <b>${m.notionPropertyName}</b> ← ${display}<br/>`;
                });
                section.addWidget(this.textParagraph(html));
            } else {
                section.addWidget(this.textParagraph('<i>No attachment fields mapped yet.</i>'));
            }

            return section;
        } catch (error) {
            this.logger.warn('Failed to build attachment mapping summary', error);
            return null;
        }
    }

    /**
     * Format mapping source label for preview
     * @private
     */
    _formatMappingSourceLabel(fieldValue, registry, isAttachmentField) {
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
     * Get mapping value snippet for preview
     * @private
     */
    _getMappingValueSnippet(mapping, emailData, attachmentData) {
        if (mapping.isStaticOption && mapping.selectedOption) {
            return mapping.selectedOption;
        }

        if (mapping.type === 'people' && Array.isArray(mapping.selectedUserIds)) {
            return `People (${mapping.selectedUserIds.length})`;
        }

        if (mapping.type === 'relation' && Array.isArray(mapping.selectedPages)) {
            const names = mapping.selectedPages.map(p => p.title).filter(Boolean);
            return names.length > 0 ? names.slice(0, 3).join(', ') : 'Relation';
        }

        const sourceData = attachmentData || emailData;
        if (!sourceData || !mapping.emailField) return '';

        const value = sourceData.getValue(mapping.emailField);
        return this._formatValueSnippet(value);
    }

    /**
     * Get attachment mapping value snippet using selected attachment
     * @private
     */
    _getAttachmentMappingValueSnippet(mapping, messageId) {
        const extracted = messageId ? this._extractEmailData(messageId) : null;
        const emailData = extracted ? extracted.emailData : null;
        if (!emailData) return this._getMappingValueSnippet(mapping, null, null);

        const selectionKey = this._getSelectionKey(messageId, emailData);
        const attachments = this._getAttachmentsForMessage(messageId, emailData);
        const attachmentService = this.container.resolve('attachmentService');
        const selectedNames = attachmentService.getSelectedAttachmentNames(selectionKey);
        const selected = selectedNames && selectedNames.length > 0
            ? attachments.find(att => selectedNames.includes(att.getName()))
            : (selectedNames === null ? null : attachments[0]);

        const attachmentData = selected ? new AttachmentData(emailData, selected, { attachmentIndex: 0 }) : null;
        return this._getMappingValueSnippet(mapping, emailData, attachmentData);
    }

    /**
     * Format value snippet for preview
     * @private
     */
    _formatValueSnippet(value) {
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value.toLocaleString();

        if (Array.isArray(value)) {
            const items = value.map(v => {
                if (v && typeof v.getName === 'function') return v.getName();
                return String(v);
            }).filter(Boolean);
            return items.slice(0, 3).join(', ');
        }

        if (typeof value === 'object') {
            try {
                const text = JSON.stringify(value);
                return text.length > 60 ? text.substring(0, 57) + '...' : text;
            } catch (e) {
                return '';
            }
        }

        const text = String(value);
        return text.length > 60 ? text.substring(0, 57) + '...' : text;
    }

    /**
     * Build action section
     * @private
     * @param {Object} status - Database status
     * @param {string} messageId - Gmail message ID
     * @returns {CardService.CardSection} Action section
     */
    _buildActionSection(status, messageId) {
        const section = this.sectionWithHeader('🚀 Save to Notion');
        
        if (status.hasApiKey && status.hasDatabaseId && messageId) {
            section.addWidget(
                this.buttonSet(
                    this.newButton('💾 Save Now', 'quickG2NSaveEmail', 
                        { messageId }, {
                            backgroundColor: '#0F9D58',
                            filled: true
                        }
                    ),
                    this.newButton('✉️ Email Mappings', 'showMappingsConfiguration')
                )
            );
        } else {
            section.addWidget(this.newButton('⚙️ Finish Setup', 'showG2NSettings'));
        }
        
        return section;
    }
}
