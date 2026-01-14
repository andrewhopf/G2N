/**
 * @fileoverview Gmail field registry
 * @description Manages available Gmail fields and type compatibility
 */

/**
 * Gmail Field Registry
 * @class GmailFieldRegistry
 */
class GmailFieldRegistry {
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
 * The internal Gmail link field (gmailLinkUrl) is excluded so it is not user-mappable.
 *
 * @param {string} propertyType - Notion property type (e.g., "title", "url")
 * @returns {Array<{label: string, value: string}>}
 */
getFieldsForType(propertyType) {
  const compatibleValues = this._compatibility[propertyType] || [];

  return this._fields
    .filter(f => compatibleValues.includes(f.value))
    // Business rule: do NOT allow users to map the internal Gmail link field
    .filter(f => f.value !== 'gmailLinkUrl');
}

  /**
   * Get recommended field for property type
   * @param {string} propertyType - Notion property type
   * @returns {string}
   */
  getRecommendedField(propertyType) {
    return this._recommendations[propertyType] || 'subject';
  }

  /**
   * Check if field is compatible with type
   * @param {string} fieldName - Gmail field name
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
      // Basic fields
      { label: '📝 Subject', value: 'subject', category: 'basic' },
      { label: '👤 From', value: 'from', category: 'basic' },
      { label: '📧 From (Email only)', value: 'fromEmail', category: 'basic' },
      { label: '👤 From (Name only)', value: 'fromName', category: 'basic' },
      { label: '📨 To', value: 'to', category: 'basic' },
      { label: '📋 CC', value: 'cc', category: 'basic' },
      { label: '📅 Date', value: 'date', category: 'basic' },
      
      // Content fields
      { label: '📄 Body (Plain)', value: 'plainBody', category: 'content' },
      { label: '📄 Body (HTML)', value: 'body', category: 'content' },
      { label: '📝 Snippet', value: 'snippet', category: 'content' },
      
      // Links and IDs
      { label: '🔗 Gmail Link', value: 'gmailLinkUrl', category: 'links' },
      { label: '🆔 Message ID', value: 'messageId', category: 'links' },
      { label: '🧵 Thread ID', value: 'threadId', category: 'links' },
      
      // Status fields
      { label: '🏷️ Labels', value: 'labels', category: 'status' },
      { label: '⭐ Starred', value: 'starred', category: 'status' },
      { label: '📥 In Inbox', value: 'inInbox', category: 'status' },
      { label: '📬 Unread', value: 'unread', category: 'status' },
      
      // Attachment fields
      { label: '📎 Has Attachments', value: 'hasAttachments', category: 'attachments' },
      { label: '🔢 Attachment Count', value: 'attachmentCount', category: 'attachments' },
      { label: '📁 Attachments', value: 'attachments', category: 'attachments' }
    ];
  }

  /**
   * Build type compatibility map
   * @private
   */
  _buildCompatibility() {
    return {
      title: ['subject', 'from', 'fromName', 'snippet'],
      rich_text: ['subject', 'from', 'fromName', 'to', 'cc', 'plainBody', 'body', 'snippet', 'labels'],
      email: ['from', 'fromEmail', 'to', 'cc', 'replyTo'],
      url: ['gmailLinkUrl', 'messageId', 'threadId'],
      date: ['date'],
      number: ['attachmentCount'],
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
      title: 'subject',
      rich_text: 'plainBody',
      email: 'fromEmail',
      url: 'gmailLinkUrl',
      date: 'date',
      number: 'attachmentCount',
      checkbox: 'hasAttachments',
      multi_select: 'labels',
      select: 'labels',
      files: 'attachments'
    };
  }
}