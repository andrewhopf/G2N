/**
 * @fileoverview Files property handler
 * @description Handles files/attachments property type
 */

/**
 * Files Property Handler
 * @class FilesPropertyHandler
 * @extends BasePropertyHandler
 */
class FilesPropertyHandler extends BasePropertyHandler {
  /**
   * @param {AttachmentService} attachmentService - Attachment service
   */
  constructor(attachmentService) {
    super('files');
    /** @private */
    this._attachments = attachmentService;
  }

  /**
   * @inheritdoc
   */
  buildUI(property, currentConfig) {
    const widgets = [];
    const propId = property.id;

    // Header
    widgets.push(this._createHeader(property));

    // Required indicator
    if (property.isRequired) {
      widgets.push(this._createRequiredIndicator());
    }

    // Enable checkbox
    if (!property.isRequired) {
      const isEnabled = currentConfig.enabled === true || currentConfig.enabled === 'true';
      widgets.push(
        this._createEnableCheckbox(`enabled_${propId}`, isEnabled, 'Include attachments')
      );
    }

    // File handling options
    const handlingDropdown = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName(`fileHandling_${propId}`)
      .setTitle('Attachment Handling');

    const currentHandling = currentConfig.fileHandling || 'upload_to_drive';
    handlingDropdown.addItem('Upload to Google Drive', 'upload_to_drive', currentHandling === 'upload_to_drive');
    handlingDropdown.addItem('Link only (no upload)', 'link_only', currentHandling === 'link_only');
    handlingDropdown.addItem('Skip attachments', 'skip', currentHandling === 'skip');

    widgets.push(handlingDropdown);

    // Info text
    widgets.push(
      CardService.newTextParagraph()
        .setText('<i>Email attachments will be uploaded to Google Drive and linked in Notion.</i>')
    );

    // Size warning
    widgets.push(
      CardService.newTextParagraph()
        .setText("<font color='#5F6368'><i>⚠️ Large attachments may take longer to process.</i></font>")
    );

    return widgets;
  }

  /**
   * @inheritdoc
   */
  processConfiguration(property, formInput) {
    const propId = property.id;
    const isEnabled = property.isRequired || this._isEnabled(formInput, `enabled_${propId}`);

    return {
      type: 'files',
      notionPropertyName: property.name,
      enabled: isEnabled,
      emailField: 'attachments',
      fileHandling: formInput[`fileHandling_${propId}`] || 'upload_to_drive',
      isStaticOption: false,
      isRequired: property.isRequired || false
    };
  }

  /**
   * @inheritdoc
   */
  processForNotion(mapping, emailData, apiKey) {
    if (!mapping.enabled) {
      console.log('Files mapping disabled, skipping');
      return null;
    }
    if (mapping.fileHandling === 'skip') {
      console.log('Files mapping skipped by fileHandling');
      return null;
    }
    if (mapping.fileHandling === 'link_only') {
      console.log('Files mapping skipped by link_only');
      return null;
    }
    try {
      const sourceAttachments = this._attachments.getAttachmentsForMessage(
        emailData.messageId,
        emailData.attachments
      );
      const attachments = this._attachments.filterSelectedAttachments(
        sourceAttachments,
        emailData.messageId
      );

      if (attachments.length === 0) {
        console.log('No selected attachments, skipping files mapping');
        return null;
      }

      // Process attachments using the attachment service
      const processedFiles = this._attachments.processAttachments(
        attachments,
        emailData.subject,
        mapping.fileHandling
      );

      if (processedFiles.length === 0) return null;

      // Save upload info for preview/success display
      const uploadedSummary = processedFiles.map(file => ({
        name: file.name,
        url: file.url,
        driveId: file.driveId || ''
      }));
      this._attachments.setLastUploadedAttachments(emailData.messageId, uploadedSummary);

      // Format for Notion files property
      return {
        files: processedFiles.map(file => ({
          name: file.name,
          type: 'external',
          external: { url: file.url }
        }))
      };

    } catch (error) {
      console.error('Error processing attachments:', error);
      return null;
    }
  }
}
