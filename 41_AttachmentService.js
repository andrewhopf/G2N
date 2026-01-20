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
   * @param {NotionAdapter} notionAdapter - Notion adapter
   * @param {ConfigRepository} configRepo - Config repository
   */
  constructor(logger, notionAdapter, configRepo) {
    /** @private */
    this._logger = logger;
    /** @private */
    this._notion = notionAdapter;
    /** @private */
    this._configRepo = configRepo;
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

    const startedAt = Date.now();
    this._logger.info('Processing attachments', { count: attachments.length, handling });

    const processed = [];
    const folder = handling === 'upload_to_notion' ? null : this._getOrCreateFolder();

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
      processed: processed.length,
      durationMs: Date.now() - startedAt
    });

    return processed;
  }

  /**
   * Normalize attachment filename for matching
   * @param {string} name
   * @returns {string}
   */
  normalizeFileName(name) {
    return this._truncateFileName(String(name || ''));
  }

  /**
   * Save last processed attachments for reuse
   * @param {string} messageId
   * @param {Array} processed
   * @param {string} handling
   */
  setLastProcessedAttachments(messageId, processed = [], handling = 'upload_to_drive') {
    try {
      const props = PropertiesService.getUserProperties();
      const payload = {
        messageId: messageId || '',
        handling: handling || 'upload_to_drive',
        processed: Array.isArray(processed) ? processed.map(file => ({
          name: file.name || '',
          sourceName: file.sourceName || '',
          url: file.url || '',
          downloadUrl: file.downloadUrl || '',
          size: Number(file.size) || 0,
          type: file.type || '',
          driveId: file.driveId || '',
          notionUploadId: file.notionUploadId || ''
        })) : []
      };
      props.setProperty('G2N_LAST_PROCESSED_ATTACHMENTS', JSON.stringify(payload));
    } catch (error) {
      this._logger.warn('Failed to save processed attachments', { error: error.message });
    }
  }

  /**
   * Get last processed attachments for a message
   * @param {string} messageId
   * @returns {{messageId: string, handling: string, processed: Array}|null}
   */
  getLastProcessedAttachments(messageId) {
    try {
      const props = PropertiesService.getUserProperties();
      const raw = props.getProperty('G2N_LAST_PROCESSED_ATTACHMENTS');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (messageId && parsed.messageId !== messageId) return null;
      return {
        messageId: parsed.messageId || '',
        handling: parsed.handling || 'upload_to_drive',
        processed: Array.isArray(parsed.processed) ? parsed.processed : []
      };
    } catch (error) {
      this._logger.warn('Failed to read processed attachments', { error: error.message });
      return null;
    }
  }

  /**
   * Find a processed attachment that matches name and size
   * @param {Array} processed
   * @param {string} name
   * @param {number} size
   * @returns {Object|null}
   */
  findProcessedAttachment(processed, name, size) {
    if (!Array.isArray(processed)) return null;
    const normalized = this.normalizeFileName(name);
    const targetSize = Number(size) || 0;
    return processed.find(file => {
      const matchName = file.sourceName || file.name || '';
      const fileName = this.normalizeFileName(matchName);
      const fileSize = Number(file.size) || 0;
      return fileName === normalized && fileSize === targetSize;
    }) || null;
  }

  /**
   * Process single attachment
   * @private
   */
  _processAttachment(attachment, emailSubject, folder, handling) {
    const startedAt = Date.now();
    const name = attachment.getName();
    const size = attachment.getSize();
    const contentType = attachment.getContentType();
    const sourceName = name;

    // Check file size
    if (size > this._maxFileSize) {
      this._logger.warn('Attachment too large, skipping', { name, size });
      return null;
    }

    if (handling === 'link_only') {
      // Just return metadata without uploading
      return {
        name: this._truncateFileName(name),
        sourceName: sourceName,
        url: '', // No URL for link_only
        size: size,
        type: contentType,
        uploaded: false
      };
    }

    if (handling === 'upload_to_notion') {
      const uploadId = this._uploadToNotion(attachment);
      return {
        name: this._truncateFileName(name),
        sourceName: sourceName,
        url: '',
        size: size,
        type: contentType,
        notionUploadId: uploadId,
        uploaded: true
      };
    }

    // Upload to Google Drive
    const file = this._uploadToDrive(attachment, emailSubject, folder);
    
    this._logger.info('Attachment processed timing', {
      name: name,
      size: size,
      durationMs: Date.now() - startedAt
    });

    return {
      name: this._truncateFileName(file.getName()),
      sourceName: sourceName,
      url: file.getUrl(),
      downloadUrl: this._getDriveDownloadUrl(file.getId()),
      size: size,
      type: contentType,
      driveId: file.getId(),
      uploaded: true
    };
  }

  /**
   * Build a direct download URL for Drive files
   * @private
   * @param {string} driveId
   * @returns {string}
   */
  _getDriveDownloadUrl(driveId) {
    if (!driveId) return '';
    return `https://drive.google.com/uc?export=download&id=${driveId}`;
  }

  /**
   * Upload attachment to Google Drive
   * @private
   */
  _uploadToDrive(attachment, emailSubject, folder) {
    const startedAt = Date.now();
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
        () => file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT),
        'setSharing'
      );
      
      this._logger.info('File uploaded to Drive', { 
        name: safeName, 
        id: file.getId(), 
        url: file.getUrl(),
        folderId: folder.getId()
      });
      this._logger.info('Drive upload timing', {
        name: safeName,
        durationMs: Date.now() - startedAt,
        method: 'driveapp'
      });
      
      return file;
    } catch (error) {
      this._logger.warn('DriveApp upload failed, falling back to Advanced Drive API', {
        name: safeName,
        error: error.message
      });
      const file = this._uploadToDriveAdvanced(blob, safeName, emailSubject, folder.getId());
      this._logger.info('Drive upload timing', {
        name: safeName,
        durationMs: Date.now() - startedAt,
        method: 'advanced'
      });
      return file;
    }
  }

  /**
   * Get or create attachments folder
   * @private
   */
  _getOrCreateFolder() {
    const startedAt = Date.now();
    const cachedFolder = this._getCachedFolder();
    if (cachedFolder) {
      this._logger.info('Using cached attachments folder', {
        name: cachedFolder.getName(),
        id: cachedFolder.getId()
      });
      this._logger.info('Drive folder timing', {
        name: cachedFolder.getName(),
        durationMs: Date.now() - startedAt,
        result: 'cached'
      });
      return cachedFolder;
    }
    try {
      const folders = this._withDriveRetry(
        () => DriveApp.getFoldersByName(this._folderName),
        'getFoldersByName'
      );
      
      if (folders.hasNext()) {
        const existing = folders.next();
        this._withDriveRetry(
          () => existing.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT),
          'setFolderSharing'
        );
        this._cacheFolderId(existing.getId());
        this._logger.info('Using existing attachments folder', { 
          name: this._folderName, 
          id: existing.getId() 
        });
        this._logger.info('Drive folder timing', {
          name: this._folderName,
          durationMs: Date.now() - startedAt,
          result: 'existing'
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
        () => folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT),
        'setFolderSharing'
      );
      this._cacheFolderId(folder.getId());
      
      this._logger.info('Created attachments folder', { 
        name: this._folderName, 
        id: folder.getId(),
        url: folder.getUrl()
      });
      this._logger.info('Drive folder timing', {
        name: this._folderName,
        durationMs: Date.now() - startedAt,
        result: 'created'
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
    const cachedFolder = this._getCachedFolder();
    if (cachedFolder) return cachedFolder;
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
      this._cacheFolderId(existing.id);
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
    this._cacheFolderId(created.id);
    return folder;
  }

  /**
   * Read cached attachments folder
   * @private
   * @returns {Folder|null}
   */
  _getCachedFolder() {
    try {
      const config = this._configRepo.getAll();
      const folderId = config.attachmentsFolderId;
      if (!folderId) return null;
      const folder = DriveApp.getFolderById(folderId);
      if (!folder) return null;
      return folder;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache attachments folder ID
   * @private
   * @param {string} folderId
   */
  _cacheFolderId(folderId) {
    if (!folderId) return;
    try {
      this._configRepo.set({ attachmentsFolderId: folderId });
    } catch (error) {
      // Ignore cache errors
    }
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
   * Upload attachment to Notion (hosted)
   * @private
   */
  _uploadToNotion(attachment) {
    const config = this._configRepo.getAll();
    if (!config.apiKey) {
      throw new Error('Notion API key not configured');
    }

    const blob = attachment.copyBlob();
    const filename = attachment.getName();
    const contentType = attachment.getContentType();
    const size = blob.getBytes().length;

    const uploadTicket = this._notion.createFileUpload(filename, contentType, size, config.apiKey);
    if (!uploadTicket || !uploadTicket.id || !uploadTicket.upload_url) {
      throw new Error('Failed to create Notion upload');
    }

    this._notion.sendFileUpload(uploadTicket.upload_url, blob);
    return uploadTicket.id;
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
      const raw = props.getProperty(`G2N_ATTACHMENT_SELECTION_${messageId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      this._logger.warn('Failed to read attachment selection', { messageId, error: error.message });
      return null;
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
   * Clear selected attachments for a message
   * @param {string} messageId
   */
  clearSelectedAttachmentNames(messageId) {
    if (!messageId) return;
    try {
      const props = PropertiesService.getUserProperties();
      props.deleteProperty(`G2N_ATTACHMENT_SELECTION_${messageId}`);
    } catch (error) {
      this._logger.warn('Failed to clear attachment selection', { messageId, error: error.message });
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
   * Clear last uploaded attachments summary
   */
  clearLastUploadedAttachments() {
    try {
      const props = PropertiesService.getUserProperties();
      props.deleteProperty('G2N_LAST_UPLOADED_ATTACHMENTS');
    } catch (error) {
      this._logger.warn('Failed to clear uploaded attachments summary', { error: error.message });
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
    if (selectedNames === null) return attachments;
    if (selectedNames.length === 0) return [];
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
