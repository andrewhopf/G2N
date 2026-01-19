/**
 * @fileoverview Attachment data wrapper
 * @description Provides attachment-level fields with EmailData compatibility
 */

/**
 * Attachment Data Value Object
 * @class AttachmentData
 */
class AttachmentData {
  /**
   * @param {EmailData} emailData - Base email data
   * @param {GmailAttachment} attachment - Gmail attachment
   * @param {Object} [options] - Optional attachment metadata
   */
  constructor(emailData, attachment, options = {}) {
    this._email = emailData;
    this._attachment = attachment;
    this._attachmentIndex = options.attachmentIndex || 0;
    this._attachmentUrl = options.attachmentUrl || '';
    this._attachmentDriveId = options.attachmentDriveId || '';

    // Expose fields used directly by handlers
    this.subject = emailData.subject;
    this.attachments = attachment ? [attachment] : [];
    this.hasAttachments = Boolean(attachment);
    this.attachmentCount = attachment ? 1 : 0;
    this.gmailLinkUrl = emailData.gmailLinkUrl || '';
    this.messageId = emailData.messageId || '';
  }

  /**
   * Get value by field name
   * @param {string} field - Field name
   * @returns {*}
   */
  getValue(field) {
    switch (field) {
      case 'attachmentName':
        return this._attachment?.getName ? this._attachment.getName() : '';
      case 'attachmentSize':
        return this._attachment?.getSize ? this._attachment.getSize() : 0;
      case 'attachmentType':
        return this._attachment?.getContentType ? this._attachment.getContentType() : '';
      case 'attachmentIndex':
        return this._attachmentIndex;
      case 'attachmentUrl':
        return this._attachmentUrl;
      case 'attachmentDriveId':
        return this._attachmentDriveId;
      case 'attachments':
        return this._attachment ? [this._attachment] : [];
      case 'attachmentCount':
        return 1;
      case 'hasAttachments':
        return true;
      default:
        return this._email.getValue(field);
    }
  }

  /**
   * Provide access to the base email data
   * @returns {EmailData}
   */
  getEmailData() {
    return this._email;
  }
}
