/**
 * @fileoverview Attachment field registry
 * @description Available fields for attachment mapping (email + attachment metadata)
 */

/**
 * Attachment Field Registry
 * @class AttachmentFieldRegistry
 */
class AttachmentFieldRegistry {
  constructor() {
    /** @private */
    this._fields = this._buildFields();
    /** @private */
    this._compatibility = this._buildCompatibility();
    /** @private */
    this._recommendations = this._buildRecommendations();
  }

  /**
   * Get all available fields
   * @returns {Array<{label: string, value: string, category: string}>}
   */
  getAllFields() {
    return this._fields;
  }

  /**
   * Get fields compatible with a Notion property type.
   * @param {string} propertyType - Notion property type
   * @returns {Array<{label: string, value: string}>}
   */
  getFieldsForType(propertyType) {
    const compatibleValues = this._compatibility[propertyType] || [];

    return this._fields
      .filter(f => compatibleValues.includes(f.value))
      .filter(f => f.value !== 'gmailLinkUrl');
  }

  /**
   * Get recommended field for property type
   * @param {string} propertyType - Notion property type
   * @returns {string}
   */
  getRecommendedField(propertyType) {
    return this._recommendations[propertyType] || 'attachmentName';
  }

  /**
   * Check if field is compatible with type
   * @param {string} fieldName - Field name
   * @param {string} propertyType - Notion property type
   * @returns {boolean}
   */
  isCompatible(fieldName, propertyType) {
    const compatible = this._compatibility[propertyType] || [];
    return compatible.includes(fieldName);
  }

  /**
   * Build field definitions
   * @private
   */
  _buildFields() {
    return [
      // Email fields
      { label: '📝 Subject', value: 'subject', category: 'basic' },
      { label: '👤 From', value: 'from', category: 'basic' },
      { label: '📧 From (Email only)', value: 'fromEmail', category: 'basic' },
      { label: '👤 From (Name only)', value: 'fromName', category: 'basic' },
      { label: '📨 To', value: 'to', category: 'basic' },
      { label: '📋 CC', value: 'cc', category: 'basic' },
      { label: '📅 Date', value: 'date', category: 'basic' },
      { label: '🔗 Gmail Link', value: 'gmailLinkUrl', category: 'links' },
      { label: '🆔 Message ID', value: 'messageId', category: 'links' },
      { label: '🧵 Thread ID', value: 'threadId', category: 'links' },
      { label: '🏷️ Labels', value: 'labels', category: 'status' },
      { label: '⭐ Starred', value: 'starred', category: 'status' },
      { label: '📥 In Inbox', value: 'inInbox', category: 'status' },
      { label: '📬 Unread', value: 'unread', category: 'status' },
      { label: '📎 Has Attachments', value: 'hasAttachments', category: 'attachments' },
      { label: '🔢 Attachment Count', value: 'attachmentCount', category: 'attachments' },
      { label: '📁 Attachments', value: 'attachments', category: 'attachments' },

      // Attachment-specific fields
      { label: '📎 Attachment Name', value: 'attachmentName', category: 'attachment_meta' },
      { label: '📦 Attachment Size (bytes)', value: 'attachmentSize', category: 'attachment_meta' },
      { label: '🧾 Attachment Type', value: 'attachmentType', category: 'attachment_meta' },
      { label: '🔢 Attachment Index', value: 'attachmentIndex', category: 'attachment_meta' },
      { label: '🔗 Attachment URL', value: 'attachmentUrl', category: 'attachment_meta' },
      { label: '🆔 Attachment Drive ID', value: 'attachmentDriveId', category: 'attachment_meta' }
    ];
  }

  /**
   * Build type compatibility map
   * @private
   */
  _buildCompatibility() {
    return {
      title: ['attachmentName', 'subject', 'from', 'fromName', 'snippet'],
      rich_text: [
        'attachmentName', 'attachmentType', 'attachmentDriveId',
        'subject', 'from', 'fromName', 'to', 'cc', 'plainBody', 'body', 'snippet', 'labels'
      ],
      email: ['from', 'fromEmail', 'to', 'cc', 'replyTo'],
      url: ['gmailLinkUrl', 'messageId', 'threadId', 'attachmentUrl'],
      date: ['date'],
      number: ['attachmentSize', 'attachmentIndex', 'attachmentCount'],
      checkbox: ['starred', 'inInbox', 'unread', 'hasAttachments'],
      multi_select: ['labels'],
      select: ['labels'],
      files: ['attachments']
    };
  }

  /**
   * Build recommendations map
   * @private
   */
  _buildRecommendations() {
    return {
      title: 'attachmentName',
      rich_text: 'attachmentName',
      email: 'fromEmail',
      url: 'attachmentUrl',
      date: 'date',
      number: 'attachmentSize',
      checkbox: 'hasAttachments',
      multi_select: 'labels',
      select: 'labels',
      files: 'attachments'
    };
  }
}
