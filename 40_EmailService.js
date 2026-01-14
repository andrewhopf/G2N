/**
 * @fileoverview Email extraction service
 * @description Extracts and processes email data
 */

/**
 * Email Service
 * @class EmailService
 */
class EmailService {
  /**
   * @param {GmailAdapter} gmailAdapter - Gmail adapter
   * @param {Logger} logger - Logger instance
   */
  constructor(gmailAdapter, logger) {
    /** @private */
    this._gmail = gmailAdapter;
    /** @private */
    this._logger = logger;
  }

  /**
   * Extract email data by message ID
   * @param {string} messageId - Gmail message ID
   * @returns {EmailData|null}
   */
  extractById(messageId) {
    this._logger.debug('Extracting email', { messageId });

    const rawData = this._gmail.getMessage(messageId);
    if (!rawData) {
      this._logger.warn('Could not retrieve email', { messageId });
      return null;
    }

    return new EmailData(rawData);
  }

  /**
   * Extract from GmailMessage object
   * @param {GmailMessage} message - Gmail message
   * @returns {EmailData}
   */
  extractFromMessage(message) {
    return EmailData.fromGmailMessage(message);
  }

  /**
   * Get currently selected email
   * @returns {EmailData|null}
   */
  getSelectedEmail() {
    const messages = this._gmail.getSelectedMessages();
    if (messages.length === 0) {
      return null;
    }

    return this.extractFromMessage(messages[0]);
  }

  /**
   * Validate email data
   * @param {EmailData} emailData - Email data to validate
   * @returns {Object} Validation result
   */
  validate(emailData) {
    const errors = [];
    const warnings = [];

    if (!emailData.messageId) {
      errors.push('Missing message ID');
    }

    if (!emailData.subject && emailData.subject !== '') {
      warnings.push('Missing subject');
    }

    if (!emailData.from) {
      warnings.push('Missing sender');
    }

    if (!emailData.hasContent()) {
      warnings.push('Missing body content');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}