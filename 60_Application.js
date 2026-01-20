/**
 * @fileoverview Main application class
 * @description Coordinates all application components
 */

/**
 * Main Application
 * @class Application
 * @description Central controller orchestrating UI navigation and business logic workflows.
 */
class Application {
  /**
   * @param {ServiceContainer} container - DI container
   */
  constructor(container) {
    /** @private */
    this._container = container;
    /** @private */
    this._cardFactory = new CardFactory(container);
    /** @private */
    this._logger = container.resolve('logger');
    /** @private */
    this._events = container.resolve('events');

    this._initialize();
  }

  /**
   * Initialize application
   * @private
   */
  _initialize() {
    this._logger.info('Application initializing...');
    this._events.emit(AppEvents.APP_INITIALIZED);
    this._logger.info('Application initialized');
  }

/**
 * Quick save email - with optional skipDuplicateCheck flag
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse}
 */
quickG2NSaveEmail(event) {
  const messageId = event?.gmail?.messageId || event?.parameters?.messageId;
  const skipDuplicateCheck = event?.parameters?.skipDuplicateCheck === 'true';
  
  this._logger.info('Quick save requested', { messageId, skipDuplicateCheck });

  if (!messageId) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('❌ Error: No email message identified.'))
      .build();
  }

  try {
    const result = this._saveEmailOnly(messageId);

    if (result.success) {
      const configRepo = this._container.resolve('configRepo');
      const config = configRepo.getAll();
      const useSeparateDb = config.attachmentUseSeparateDatabase === true;

      if (useSeparateDb) {
        const attachmentService = this._container.resolve('attachmentService');
        const selectionKey = (result.emailData && result.emailData.messageId) || messageId;
        const selectedNames = attachmentService.getSelectedAttachmentNames(selectionKey);
        const hasSelection = Array.isArray(selectedNames) && selectedNames.length > 0;

        if (!hasSelection) {
          const successCard = buildSuccessCard({
            emailId: messageId,
            selectionKey: selectionKey,
            subject: result.emailData.subject,
            pageUrl: result.page.url,
            attachmentsSaved: 0
          });
          return CardService.newActionResponseBuilder()
            .setNotification(
              CardService.newNotification().setText('✅ Saved to Notion!')
            )
            .setNavigation(
              CardService.newNavigation().pushCard(successCard)
            )
            .build();
        }

        configRepo.set({
          pendingAttachmentEmail: {
            messageId: messageId,
            pageId: result.page.id,
            pageUrl: result.page.url,
            subject: result.emailData.subject,
            savedAt: new Date().toISOString()
          }
        });

        const attachmentMappingsCard = this._buildAttachmentMappingsCard(0);
        return CardService.newActionResponseBuilder()
          .setNotification(
            CardService.newNotification().setText('✅ Email saved. Configure attachment mappings to finish.')
          )
          .setNavigation(
            CardService.newNavigation().pushCard(attachmentMappingsCard)
          )
          .build();
      }

        const attachmentService = this._container.resolve('attachmentService');
        const selectionKey = (result.emailData && result.emailData.messageId) || messageId;
        const sourceAttachments = attachmentService.getAttachmentsForMessage(
          messageId,
          result.emailData ? result.emailData.attachments : []
        );
        const selected = attachmentService.filterSelectedAttachments(sourceAttachments, selectionKey);
        const processed = attachmentService.getLastProcessedAttachments(selectionKey);
        const savedCount = processed && Array.isArray(processed.processed) && processed.processed.length > 0
          ? processed.processed.length
          : selected.length;
        const attachmentsSavedText = savedCount > 0 ? `${savedCount} to Email Page` : 'None saved';

        const successCard = buildSuccessCard({
          emailId: messageId,
          selectionKey: selectionKey,
          subject: result.emailData.subject,
          pageUrl: result.page.url,
          attachmentsSavedText: attachmentsSavedText
        });
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText('✅ Saved to Notion!')
        )
        .setNavigation(
          CardService.newNavigation().pushCard(successCard)
        )
        .build();
    }

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(`❌ Save failed: ${result.message || 'Unknown error'}`)
      )
      .build();
  } catch (error) {
    this._logger.error('Quick save fatal error', error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('❌ Fatal error: Check Cloud logs.'))
      .build();
  }
}

/**
 * Internal wrapper for the Workflow Executor
 * @param {string} messageId - Gmail message ID
 * @param {boolean} skipDuplicateCheck - Skip duplicate check (allow re-save)
 * @returns {WorkflowResult}
 */
saveEmail(messageId, skipDuplicateCheck = false) {
  this._logger.info('Invoking workflow executor', { messageId, skipDuplicateCheck });
  const workflow = this._container.resolve('workflowExecutor');
  // Note: skipDuplicateCheck is not used here because duplicate check is in preview only
  return workflow.execute(messageId);
}

/**
 * Save email without processing attachments
 * @private
 * @param {string} messageId
 * @returns {{success: boolean, message?: string, page?: Object, emailData?: Object}}
 */
_saveEmailOnly(messageId) {
  try {
    this._logger.info('Saving email only', { messageId });
    const emailService = this._container.resolve('emailService');
    const pageService = this._container.resolve('pageService');

    const emailData = emailService.extractById(messageId);
    if (!emailData) {
      return { success: false, message: 'Failed to extract email data' };
    }

    const page = pageService.createPageFromEmail(emailData);
    if (!page || !page.id) {
      return { success: false, message: 'Failed to create Notion page' };
    }

    return { success: true, page, emailData };
  } catch (error) {
    this._logger.error('Save email only failed', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
}

/**
 * Build attachment mappings card
 * @private
 * @param {number} page
 * @returns {CardService.Card}
 */
_buildAttachmentMappingsCard(page = 0) {
  const mappingCard = new MappingCard(
    this._container.resolve('attachmentDatabaseService'),
    this._container.resolve('attachmentMappingRepo'),
    this._container.resolve('attachmentHandlerFactory'),
    this._logger,
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

  return mappingCard.build(page);
}

  /**
   * Show homepage
   * @param {Object} event - GAS event
   * @returns {CardService.Card}
   */
  showHomepage(event) {
    this._logger.debug('Showing homepage');
    return this._cardFactory.createHomepage();
  }

/**
 * Show email preview
 * @param {Object} event - GAS event with gmail data
 * @returns {CardService.Card}
 */
showEmailPreview(event) {
  this._logger.debug('Showing email preview', { messageId: event?.gmail?.messageId });
  
  // ✅ Use the NEW EmailPreviewCard that has duplicate detection
  try {
    const emailPreviewCard = new EmailPreviewCard(this._container);
    return emailPreviewCard.build(event);
  } catch (error) {
    this._logger.error('EmailPreviewCard build failed', error);
    return buildErrorCard('Preview Error', error.message);
  }
}

  /**
   * Show settings
   * @param {Object} event - GAS event
   * @returns {CardService.Card}
   */
  showSettings(event) {
    this._logger.debug('Showing settings');
    return this._cardFactory.createSettings();
  }

  /**
   * Show database selection
   * @returns {CardService.Card}
   */
  showDatabaseSelection() {
    this._logger.debug('Showing database selection');
    return this._cardFactory.createDatabaseSelection();
  }

/**
 * Show mappings configuration
 * Directly builds the MappingCard to avoid circular dependency with global buildMappingsCard().
 * 
 * @param {number} [page=0] - Page number (0-indexed)
 * @returns {CardService.Card} Mappings configuration card
 */
showMappings(page = 0) {
  this._logger.debug('Showing mappings', { page });
  
  try {
    // Directly instantiate MappingCard to avoid recursion
    const mappingCard = new MappingCard(
      this._container.resolve('databaseService'),
      this._container.resolve('mappingRepo'),
      this._container.resolve('handlerFactory'),
      this._logger
    );
    
    return mappingCard.build(page);
  } catch (error) {
    this._logger.error('Failed to build mappings card', error);
    return _buildErrorCardSafely('Mappings Error', error.message || 'Unknown error');
  }
}


  /**
   * Test Notion connection
   * @returns {Object} Test result
   */
  testConnection() {
    this._logger.debug('Testing connection');
    const notionService = this._container.resolve('notionService');
    return notionService.testConnection();
  }

  /**
   * Get current configuration status
   * @returns {Object}
   */
  getStatus() {
    const databaseService = this._container.resolve('databaseService');
    return databaseService.getStatus();
  }

  /**
   * Reset all configuration
   */
  reset() {
    this._logger.warn('Resetting all configuration');
    const configRepo = this._container.resolve('configRepo');
    const mappingRepo = this._container.resolve('mappingRepo');
    
    configRepo.reset();
    mappingRepo.clear();
    
    this._events.emit(AppEvents.CONFIG_RESET);
    this._logger.info('Configuration reset complete');
  }

  /**
   * Get container for advanced usage
   * @returns {ServiceContainer}
   */
  getContainer() {
    return this._container;
  }
}

// Global helper functions for entry points

/**
 * Build homepage card
 * @returns {CardService.Card}
 */
function buildHomepageCard() {
  return app.showSettings();
}

/**
 * Build settings card
 * @returns {CardService.Card}
 */
function buildSettingsCard() {
  return app.showSettings();
}

/**
 * Build database selection card
 * @returns {CardService.Card}
 */
function buildDatabaseSelectionCard() {
  return app.showDatabaseSelection();
}

/**
 * Build email preview card
 * @param {Object} event - Event
 * @returns {CardService.Card}
 */
function buildEmailPreviewCard(event) {
  return app.showEmailPreview(event);
}
