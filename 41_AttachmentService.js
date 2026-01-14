/**
 * @fileoverview Attachment processing service
 * @description Handles email attachment upload and processing
 */

/**
 * Attachment Service
 * @class AttachmentService
 */
class AttachmentService {
  /**
   * @param {Logger} logger - Logger instance
   */
  constructor(logger) {
    /** @private */
    this._logger = logger;
    /** @private */
    this._folderName = 'Gmail-to-Notion Attachments';
    /** @private */
    this._maxFileSize = 25 * 1024 * 1024; // 25MB
  }

  /**
   * Process email attachments
   * @param {Array} attachments - GmailAttachment objects
   * @param {string} emailSubject - Email subject for naming
   * @param {string} handling - Handling method
   * @returns {Array<{name: string, url: string, size: number, type: string}>}
   */
  processAttachments(attachments, emailSubject, handling = 'upload_to_drive') {
    if (!attachments || attachments.length === 0) {
      return [];
    }

    if (handling === 'skip') {
      return [];
    }

    this._logger.info('Processing attachments', { count: attachments.length, handling });

    const processed = [];
    const folder = this._getOrCreateFolder();

    attachments.forEach((attachment, index) => {
      try {
        const result = this._processAttachment(attachment, emailSubject, folder, handling);
        if (result) {
          processed.push(result);
        }
      } catch (error) {
        this._logger.warn('Failed to process attachment', {
          name: attachment.getName(),
          error: error.message
        });
      }
    });

    this._logger.info('Attachments processed', { 
      total: attachments.length, 
      processed: processed.length 
    });

    return processed;
  }

  /**
   * Process single attachment
   * @private
   */
  _processAttachment(attachment, emailSubject, folder, handling) {
    const name = attachment.getName();
    const size = attachment.getSize();
    const contentType = attachment.getContentType();

    // Check file size
    if (size > this._maxFileSize) {
      this._logger.warn('Attachment too large, skipping', { name, size });
      return null;
    }

    if (handling === 'link_only') {
      // Just return metadata without uploading
      return {
        name: name,
        url: '', // No URL for link_only
        size: size,
        type: contentType,
        uploaded: false
      };
    }

    // Upload to Google Drive
    const file = this._uploadToDrive(attachment, emailSubject, folder);
    
    return {
      name: file.getName(),
      url: file.getUrl(),
      size: size,
      type: contentType,
      driveId: file.getId(),
      uploaded: true
    };
  }

  /**
   * Upload attachment to Google Drive
   * @private
   */
  _uploadToDrive(attachment, emailSubject, folder) {
    const blob = attachment.copyBlob();
    const originalName = attachment.getName();
    
    // Create safe filename
    const safeName = this._createSafeFilename(emailSubject, originalName);
    
    // Create file in folder
    const file = folder.createFile(blob);
    file.setName(safeName);
    file.setDescription(`Uploaded from Gmail: ${emailSubject}`);
    
    // Set sharing to anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    this._logger.debug('File uploaded to Drive', { name: safeName, id: file.getId() });
    
    return file;
  }

  /**
   * Get or create attachments folder
   * @private
   */
  _getOrCreateFolder() {
    const folders = DriveApp.getFoldersByName(this._folderName);
    
    if (folders.hasNext()) {
      return folders.next();
    }
    
    // Create new folder
    const folder = DriveApp.createFolder(this._folderName);
    folder.setDescription('Attachments uploaded by Gmail to Notion add-on');
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    this._logger.info('Created attachments folder', { name: this._folderName });
    
    return folder;
  }

  /**
   * Create safe filename
   * @private
   */
  _createSafeFilename(emailSubject, originalName) {
    // Sanitize subject for filename
    const safeSubject = (emailSubject || 'email')
      .replace(/[^\w\s-]/g, '_')
      .substring(0, 50)
      .trim();
    
    return `${safeSubject}_${originalName}`;
  }

  /**
   * Get attachment info without uploading
   * @param {Array} attachments - Attachments array
   * @returns {Array<{name: string, size: number, type: string}>}
   */
  getAttachmentInfo(attachments) {
    if (!attachments) return [];
    
    return attachments.map(att => ({
      name: att.getName(),
      size: att.getSize(),
      type: att.getContentType()
    }));
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}