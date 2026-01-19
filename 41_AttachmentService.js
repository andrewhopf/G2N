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
        name: this._truncateFileName(name),
        url: '', // No URL for link_only
        size: size,
        type: contentType,
        uploaded: false
      };
    }

    // Upload to Google Drive
    const file = this._uploadToDrive(attachment, emailSubject, folder);
    
    return {
      name: this._truncateFileName(file.getName()),
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
    
    try {
      // Create file in folder (DriveApp path)
      const file = this._withDriveRetry(
        () => folder.createFile(blob),
        'createFile'
      );
      this._withDriveRetry(() => file.setName(safeName), 'setName');
      this._withDriveRetry(() => file.setDescription(`Uploaded from Gmail: ${emailSubject}`), 'setDescription');
      
      // Set sharing to anyone with link can view
      this._withDriveRetry(
        () => file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW),
        'setSharing'
      );
      
      this._logger.info('File uploaded to Drive', { 
        name: safeName, 
        id: file.getId(), 
        url: file.getUrl(),
        folderId: folder.getId()
      });
      
      return file;
    } catch (error) {
      this._logger.warn('DriveApp upload failed, falling back to Advanced Drive API', {
        name: safeName,
        error: error.message
      });
      return this._uploadToDriveAdvanced(blob, safeName, emailSubject, folder.getId());
    }
  }

  /**
   * Get or create attachments folder
   * @private
   */
  _getOrCreateFolder() {
    try {
      const folders = this._withDriveRetry(
        () => DriveApp.getFoldersByName(this._folderName),
        'getFoldersByName'
      );
      
      if (folders.hasNext()) {
        const existing = folders.next();
        this._withDriveRetry(
          () => existing.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW),
          'setFolderSharing'
        );
        this._logger.info('Using existing attachments folder', { 
          name: this._folderName, 
          id: existing.getId() 
        });
        return existing;
      }
      
      // Create new folder
      const folder = this._withDriveRetry(
        () => DriveApp.createFolder(this._folderName),
        'createFolder'
      );
      this._withDriveRetry(
        () => folder.setDescription('Attachments uploaded by Gmail to Notion add-on'),
        'setFolderDescription'
      );
      this._withDriveRetry(
        () => folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW),
        'setFolderSharing'
      );
      
      this._logger.info('Created attachments folder', { 
        name: this._folderName, 
        id: folder.getId(),
        url: folder.getUrl()
      });
      
      return folder;
    } catch (error) {
      this._logger.warn('DriveApp folder operation failed, falling back to Advanced Drive API', {
        error: error.message
      });
      return this._getOrCreateFolderAdvanced();
    }
  }

  /**
   * Get or create folder using Advanced Drive API
   * @private
   */
  _getOrCreateFolderAdvanced() {
    const escapedName = this._folderName.replace(/'/g, "\\'");
    const query = `mimeType = 'application/vnd.google-apps.folder' and title = '${escapedName}' and trashed = false`;
    const result = Drive.Files.list({ q: query, maxResults: 1 });
    if (result.items && result.items.length > 0) {
      const existing = result.items[0];
      try {
        Drive.Permissions.insert(
          { role: 'reader', type: 'anyone' },
          existing.id
        );
      } catch (e) {
        // Permission may already exist; ignore.
      }
      this._logger.info('Using existing attachments folder (Advanced)', {
        name: this._folderName,
        id: existing.id
      });
      return DriveApp.getFolderById(existing.id);
    }

    const created = Drive.Files.insert({
      title: this._folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Attachments uploaded by Gmail to Notion add-on'
    });

    Drive.Permissions.insert(
      { role: 'reader', type: 'anyone' },
      created.id
    );

    const folder = DriveApp.getFolderById(created.id);
    this._logger.info('Created attachments folder (Advanced)', {
      name: this._folderName,
      id: created.id,
      url: folder.getUrl()
    });
    return folder;
  }

  /**
   * Upload attachment using Advanced Drive API
   * @private
   */
  _uploadToDriveAdvanced(blob, safeName, emailSubject, folderId) {
    const resource = {
      title: safeName,
      description: `Uploaded from Gmail: ${emailSubject}`,
      parents: [{ id: folderId }]
    };

    const created = Drive.Files.insert(resource, blob);

    // Set sharing to anyone with link can view
    Drive.Permissions.insert(
      {
        role: 'reader',
        type: 'anyone'
      },
      created.id
    );

    const file = DriveApp.getFileById(created.id);
    this._logger.info('File uploaded via Advanced Drive API', {
      name: safeName,
      id: created.id,
      url: file.getUrl(),
      folderId: folderId
    });

    return file;
  }

  /**
   * Retry DriveApp calls to mitigate transient server errors
   * @private
   */
  _withDriveRetry(fn, label) {
    const attempts = 3;
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return fn();
      } catch (error) {
        lastError = error;
        this._logger.warn('Drive operation failed, retrying', {
          label,
          attempt: i + 1,
          error: error.message
        });
        Utilities.sleep(500 * (i + 1));
      }
    }
    throw lastError;
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
   * Truncate file name to Notion limits
   * @private
   */
  _truncateFileName(name) {
    if (!name) return '';
    return name.length > 100 ? name.substring(0, 100) : name;
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

  /**
   * Get selected attachment names for a message
   * @param {string} messageId
   * @returns {Array<string>}
   */
  getSelectedAttachmentNames(messageId) {
    if (!messageId) return [];
    try {
      const props = PropertiesService.getUserProperties();
      const raw = props.getProperty(`G2N_ATTACHMENT_SELECTION_${messageId}`) || '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      this._logger.warn('Failed to read attachment selection', { messageId, error: error.message });
      return [];
    }
  }

  /**
   * Save selected attachment names for a message
   * @param {string} messageId
   * @param {Array<string>} names
   */
  setSelectedAttachmentNames(messageId, names) {
    if (!messageId) return;
    try {
      const props = PropertiesService.getUserProperties();
      const safeNames = Array.isArray(names) ? names : [];
      props.setProperty(`G2N_ATTACHMENT_SELECTION_${messageId}`, JSON.stringify(safeNames));
    } catch (error) {
      this._logger.warn('Failed to save attachment selection', { messageId, error: error.message });
    }
  }

  /**
   * Save last attachment selection summary for homepage display
   * @param {string} messageId
   * @param {number} selectedCount
   * @param {number} totalCount
   */
  setLastSelectionSummary(messageId, selectedCount, totalCount) {
    try {
      const props = PropertiesService.getUserProperties();
      const payload = {
        messageId: messageId || '',
        selectedCount: Number(selectedCount) || 0,
        totalCount: Number(totalCount) || 0
      };
      props.setProperty('G2N_LAST_ATTACHMENT_SELECTION', JSON.stringify(payload));
    } catch (error) {
      this._logger.warn('Failed to save attachment selection summary', { error: error.message });
    }
  }

  /**
   * Save last uploaded attachments for preview/success display
   * @param {string} messageId
   * @param {Array<{name: string, url: string, driveId: string}>} uploaded
   */
  setLastUploadedAttachments(messageId, uploaded = []) {
    try {
      const props = PropertiesService.getUserProperties();
      const payload = {
        messageId: messageId || '',
        uploaded: Array.isArray(uploaded) ? uploaded : []
      };
      props.setProperty('G2N_LAST_UPLOADED_ATTACHMENTS', JSON.stringify(payload));
    } catch (error) {
      this._logger.warn('Failed to save uploaded attachments summary', { error: error.message });
    }
  }

  /**
   * Get last uploaded attachments summary
   * @returns {{messageId: string, uploaded: Array}|null}
   */
  getLastUploadedAttachments() {
    try {
      const props = PropertiesService.getUserProperties();
      const raw = props.getProperty('G2N_LAST_UPLOADED_ATTACHMENTS');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        messageId: parsed.messageId || '',
        uploaded: Array.isArray(parsed.uploaded) ? parsed.uploaded : []
      };
    } catch (error) {
      this._logger.warn('Failed to read uploaded attachments summary', { error: error.message });
      return null;
    }
  }

  /**
   * Get last attachment selection summary
   * @returns {{messageId: string, selectedCount: number, totalCount: number}|null}
   */
  getLastSelectionSummary() {
    try {
      const props = PropertiesService.getUserProperties();
      const raw = props.getProperty('G2N_LAST_ATTACHMENT_SELECTION');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        messageId: parsed.messageId || '',
        selectedCount: Number(parsed.selectedCount) || 0,
        totalCount: Number(parsed.totalCount) || 0
      };
    } catch (error) {
      this._logger.warn('Failed to read attachment selection summary', { error: error.message });
      return null;
    }
  }

  /**
   * Filter attachments based on selection for the given message
   * @param {Array} attachments
   * @param {string} messageId
   * @returns {Array}
   */
  filterSelectedAttachments(attachments, messageId) {
    if (!attachments || attachments.length === 0) return [];
    const selectedNames = this.getSelectedAttachmentNames(messageId);
    if (!selectedNames || selectedNames.length === 0) return attachments;
    return attachments.filter(att => selectedNames.includes(att.getName()));
  }

  /**
   * Get attachments for a message, with optional fallback list
   * @param {string} messageId
   * @param {Array} fallbackAttachments
   * @returns {Array}
   */
  getAttachmentsForMessage(messageId, fallbackAttachments = []) {
    if (Array.isArray(fallbackAttachments) && fallbackAttachments.length > 0) {
      return fallbackAttachments;
    }
    if (!messageId) return [];
    try {
      const message = GmailApp.getMessageById(messageId);
      return message ? (message.getAttachments() || []) : [];
    } catch (error) {
      this._logger.warn('Failed to fetch attachments from GmailApp', { messageId, error: error.message });
      return [];
    }
  }
}
