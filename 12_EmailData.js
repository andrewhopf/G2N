/**
 * Email Data Value Object
 * @class EmailData
 */
class EmailData {
  /**
   * @param {Object} data - Raw email data
   */
  constructor(data) {
    // FIX: Ensure we pick up 'id' if 'messageId' is missing (common in GAS adapters)
    /** @readonly */
    this.messageId = data.messageId || data.id || '';
    
    /** @readonly */
    this.threadId = data.threadId || '';
    /** @readonly */
    this.subject = data.subject || '(No Subject)';
    /** @readonly */
    this.from = data.from || '';
    /** @readonly */
    this.to = data.to || '';
    /** @readonly */
    this.cc = data.cc || '';
    /** @readonly */
    this.bcc = data.bcc || '';
    /** @readonly */
    this.replyTo = data.replyTo || '';
    
    // Improved Date parsing
    const dateInput = data.date || data.internalDate;
    /** @readonly */
    this.date = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
    
    /** @readonly */
    this.body = data.body || '';
    /** @readonly */
    this.plainBody = data.plainBody || '';
    /** @readonly */
    this.snippet = data.snippet || '';
    /** @readonly */
    this.labels = Array.isArray(data.labels) ? data.labels : [];
    /** @readonly */
    this.starred = Boolean(data.starred);
    /** @readonly */
    this.inInbox = Boolean(data.inInbox);
    /** @readonly */
    this.unread = Boolean(data.unread);
    /** @readonly */
    this.hasAttachments = Boolean(data.hasAttachments);
    /** @readonly */
    this.attachments = data.attachments || [];
    /** @readonly */
    this.attachmentCount = data.attachmentCount || this.attachments.length;

    // Computed properties
    // FIX: Using u/0/ is standard, but we ensure the messageId exists before building
    /** @readonly */
    this.gmailLinkUrl = this.messageId ? `https://mail.google.com/mail/u/0/#inbox/${this.messageId}` : '';
    
    /** @readonly */
    this.fromEmail = this._extractEmail(this.from);
    /** @readonly */
    this.fromName = this._extractName(this.from);

    // Freeze to make immutable
    Object.freeze(this);
  }

  /**
   * Get value by field name
   * @param {string} field - Field name
   * @returns {*} Field value
   */
  getValue(field) {
    const fieldMap = {
      'subject': this.subject,
      'from': this.from,
      'fromEmail': this.fromEmail,
      'fromName': this.fromName,
      'to': this.to,
      'cc': this.cc,
      'bcc': this.bcc,
      'replyTo': this.replyTo,
      'date': this.date,
      'body': this.body,
      'plainBody': this.plainBody,
      'snippet': this.snippet,
      'labels': this.labels,
      'starred': this.starred,
      'inInbox': this.inInbox,
      'unread': this.unread,
      'hasAttachments': this.hasAttachments,
      'attachments': this.attachments,
      'attachmentCount': this.attachmentCount,
      'messageId': this.messageId,
      'threadId': this.threadId,
      'gmailLinkUrl': this.gmailLinkUrl
    };

    return fieldMap[field];
  }

  /**
   * Check if email has valid content
   * @returns {boolean}
   */
  hasContent() {
    return !!(this.body || this.plainBody || this.snippet);
  }

  /**
   * Get preview text
   * @param {number} maxLength - Maximum length
   * @returns {string}
   */
  getPreview(maxLength = 200) {
    const text = this.plainBody || this.snippet || '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      messageId: this.messageId,
      threadId: this.threadId,
      subject: this.subject,
      from: this.from,
      fromEmail: this.fromEmail,
      fromName: this.fromName,
      to: this.to,
      cc: this.cc,
      bcc: this.bcc,
      replyTo: this.replyTo,
      date: this.date.toISOString(),
      body: this.body,
      plainBody: this.plainBody,
      snippet: this.snippet,
      labels: this.labels,
      starred: this.starred,
      inInbox: this.inInbox,
      unread: this.unread,
      hasAttachments: this.hasAttachments,
      attachmentCount: this.attachmentCount,
      gmailLinkUrl: this.gmailLinkUrl
    };
  }

  /**
   * Extract email address from string
   * @private
   */
  _extractEmail(text) {
    if (!text) return '';
    const match = text.match(/[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/);
    return match ? match[0] : '';
  }

  /**
   * Extract name from email string
   * @private
   */
  _extractName(text) {
    if (!text) return '';
    // Format: "Name <email@domain.com>"
    const match = text.match(/^"?(.*?)"?\s*<.*?>/);
    if (match) return match[1].trim();
    
    // If no brackets, return the part before @
    if (text.includes('@')) return text.split('@')[0];
    
    return text;
  }

  /**
   * Create from GmailMessage object
   * @static
   * @param {GmailMessage} message - Gmail message
   * @returns {EmailData}
   */
  static fromGmailMessage(message) {
    // Helper to get labels safely
    let labels = [];
    try {
      const thread = message.getThread();
      labels = thread.getLabels().map(l => l.getName());
    } catch (e) {
      // Labels might not be accessible in some contexts
    }

    const attachments = message.getAttachments() || [];

    return new EmailData({
      messageId: message.getId(),
      threadId: message.getThread().getId(),
      subject: message.getSubject(),
      from: message.getFrom(),
      to: message.getTo(),
      cc: message.getCc(),
      bcc: message.getBcc(),
      replyTo: message.getReplyTo(),
      date: message.getDate(),
      body: message.getBody(),
      plainBody: message.getPlainBody(),
      snippet: message.getSnippet ? message.getSnippet() : '',
      labels: labels,
      starred: message.isStarred(),
      inInbox: message.isInInbox(),
      unread: message.isUnread(),
      hasAttachments: attachments.length > 0,
      attachments: attachments,
      attachmentCount: attachments.length
    });
  }
}