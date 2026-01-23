/**
 * SaveToNotionCard - heavy preview with mappings and attachments selection
 */
class SaveToNotionCard extends EmailPreviewCard {
  /**
   * @constructor
   * @param {ServiceContainer} container
   */
  constructor(container) {
    super(container);
    this.container = container;
  }

  /**
   * Build save-to-Notion card
   * @param {Object} event
   * @returns {CardService.Card}
   */
  build(event = {}) {
    try {
      const startedAt = Date.now();
      const status = this.databaseService.getStatus();
      const messageId = event?.gmail?.messageId || event?.parameters?.messageId;

      this.logger.info('Building save-to-Notion card', {
        messageId,
        configured: status.isReady
      });

      const header = this.buildHeader('💾 Save to Notion', 'Review mappings and attachments');
      const sections = [];

      if (typeof getTrialNoticeSection_ === 'function') {
        const trialSection = getTrialNoticeSection_();
        if (trialSection) sections.push(trialSection);
      }

      // Basic email details
      sections.push(this._buildEmailDetailsSection(messageId, status));

      // Attachment selection
      const attachmentSection = this._buildAttachmentSelectionSection(messageId);
      if (attachmentSection) sections.push(attachmentSection);

      // Email mappings summary
      sections.push(this._buildMappingSummarySection(messageId));

      // Attachment mappings summary
      const attachmentMappingSection = this._buildAttachmentMappingSummarySection(messageId);
      if (attachmentMappingSection) sections.push(attachmentMappingSection);

      // Actions
      const actionSection = this.sectionWithHeader('🚀 Save');
      if (status.hasApiKey && status.hasDatabaseId && messageId) {
        actionSection.addWidget(
          this.buttonSet(
            this.newButton('💾 Save Now', 'quickG2NSaveEmail', { messageId }, { filled: true }),
            this.newButton('🔙 Back to Preview', 'showEmailPreview', { messageId }),
            this.newButton('⚙️ Settings', 'showG2NSettings')
          )
        );
      } else {
        actionSection.addWidget(this.newButton('⚙️ Finish Setup', 'showG2NSettings'));
      }
      sections.push(actionSection);

      const card = this.buildCard(header, sections);
      this.logger.info('Save-to-Notion card timing', {
        messageId: messageId,
        durationMs: Date.now() - startedAt,
        sectionCount: sections.length
      });
      return card;
    } catch (error) {
      this.logger.error('Save-to-Notion build failed', error);
      return this.buildCard(
        this.buildHeader('Error'),
        [
          this.sectionWithHeader('Save to Notion failed').addWidget(
            this.textParagraph(error.message || 'Unknown error')
          )
        ]
      );
    }
  }
}
