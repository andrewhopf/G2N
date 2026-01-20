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
      fileHandling: 'upload_to_drive',
      isStaticOption: false,
      isRequired: property.isRequired || false
    };
  }

  /**
   * @inheritdoc
   */
  processForNotion(mapping, emailData, apiKey) {
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

      const handling = 'upload_to_drive';
      let processedFiles = [];
      let cachedFiles = [];
      const cached = this._attachments.getLastProcessedAttachments(emailData.messageId);
      if (cached && cached.handling === handling) {
        cachedFiles = Array.isArray(cached.processed) ? cached.processed : [];
      }

      if (cachedFiles.length > 0) {
        const matched = [];
        const missing = [];
        attachments.forEach(att => {
          const match = this._attachments.findProcessedAttachment(
            cachedFiles,
            att.getName(),
            att.getSize()
          );
          if (match) {
            matched.push(match);
          } else {
            missing.push(att);
          }
        });

        processedFiles = matched;

        if (missing.length > 0) {
          const newlyProcessed = this._attachments.processAttachments(
            missing,
            emailData.subject,
            handling
          );
          if (newlyProcessed && newlyProcessed.length > 0) {
            processedFiles = processedFiles.concat(newlyProcessed);
            const merged = cachedFiles.concat(newlyProcessed.filter(file => {
              return !this._attachments.findProcessedAttachment(cachedFiles, file.name, file.size);
            }));
            this._attachments.setLastProcessedAttachments(
              emailData.messageId,
              merged,
              handling
            );
          }
        }
      } else {
        // Process attachments using the attachment service
        processedFiles = this._attachments.processAttachments(
          attachments,
          emailData.subject,
          handling
        );
      }

      if (processedFiles.length === 0) return null;

      this._attachments.setLastProcessedAttachments(
        emailData.messageId,
        processedFiles,
        handling
      );

      // Save upload info for preview/success display
      const uploadedSummary = processedFiles.map(file => ({
        name: file.name,
        url: file.downloadUrl || file.url,
        driveId: file.driveId || ''
      }));
      this._attachments.setLastUploadedAttachments(emailData.messageId, uploadedSummary);

      // Format for Notion files property
      return {
        files: processedFiles.map(file => {
          const displayName = file.sourceName || file.name;
          if (mapping.fileHandling === 'upload_to_notion' && file.notionUploadId) {
            return {
              name: displayName,
              type: 'file',
              file: {
                type: 'file_upload',
                file_upload: { id: file.notionUploadId }
              }
            };
          }

          const externalUrl = file.downloadUrl || file.url || '';
          return {
            name: displayName,
            type: 'external',
            external: { url: externalUrl }
          };
        })
      };

    } catch (error) {
      console.error('Error processing attachments:', error);
      return null;
    }
  }
}
