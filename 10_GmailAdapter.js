/**
 * @fileoverview Gmail API adapter
 * @description Wraps Gmail APIs for email access
 */

/**
 * Gmail Adapter
 * @class GmailAdapter
 */
class GmailAdapter {
  /**
   * @param {Logger} logger - Logger instance
   */
  constructor(logger) {
    /** @private */
    this._logger = logger;
  }

  /**
   * Get message by ID
   * @param {string} messageId - Gmail message ID
   * @returns {Object|null}
   */
  getMessage(messageId) {
    // Try GmailApp first (simpler API)
    const gmailAppResult = this._getViaGmailApp(messageId);
    if (gmailAppResult) return gmailAppResult;

    // Fallback to Advanced Gmail API
    const advancedResult = this._getViaAdvancedAPI(messageId);
    if (advancedResult) return advancedResult;

    this._logger.warn('Could not retrieve message', { messageId });
    return null;
  }

  /**
   * Get message using GmailApp
   * @private
   */
  _getViaGmailApp(messageId) {
    try {
      // Handle various ID formats
      let actualId = messageId;
      if (messageId.includes(':')) {
        actualId = messageId.split(':').pop();
      }

      const message = GmailApp.getMessageById(actualId);
      if (!message) return null;

      const thread = message.getThread();
      const attachments = message.getAttachments();

      return {
        id: message.getId(),
        threadId: thread ? thread.getId() : '',
        subject: message.getSubject() || '(No Subject)',
        from: message.getFrom() || '',
        to: message.getTo() || '',
        cc: message.getCc() || '',
        bcc: message.getBcc() || '',
        replyTo: message.getReplyTo() || '',
        date: message.getDate() || new Date(),
        body: message.getBody() || '',
        plainBody: message.getPlainBody() || '',
        snippet: message.getSnippet ? message.getSnippet() : '',
        labels: this._getLabels(message),
        starred: message.isStarred ? message.isStarred() : false,
        inInbox: message.isInInbox ? message.isInInbox() : false,
        unread: message.isUnread ? message.isUnread() : false,
        attachments: attachments,
        attachmentCount: attachments.length,
        hasAttachments: attachments.length > 0,
        _source: 'GmailApp'
      };
    } catch (error) {
      this._logger.debug('GmailApp retrieval failed', error.message);
      return null;
    }
  }

  /**
   * Get message using Advanced Gmail API
   * @private
   */
  _getViaAdvancedAPI(messageId) {
    try {
      if (typeof Gmail === 'undefined') {
        return null;
      }

      const message = Gmail.Users.Messages.get('me', messageId, { format: 'full' });
      if (!message) return null;

      const headers = this._parseHeaders(message.payload.headers);
      const body = this._extractBody(message.payload);

      return {
        id: message.id,
        threadId: message.threadId,
        subject: headers.subject || '(No Subject)',
        from: headers.from || '',
        to: headers.to || '',
        cc: headers.cc || '',
        bcc: headers.bcc || '',
        replyTo: headers['reply-to'] || '',
        date: headers.date ? new Date(headers.date) : new Date(),
        body: body.html || '',
        plainBody: body.text || '',
        snippet: message.snippet || '',
        labels: message.labelIds || [],
        starred: (message.labelIds || []).includes('STARRED'),
        inInbox: (message.labelIds || []).includes('INBOX'),
        unread: (message.labelIds || []).includes('UNREAD'),
        attachments: [],
        attachmentCount: 0,
        hasAttachments: false,
        internalDate: message.internalDate,
        historyId: message.historyId,
        _source: 'AdvancedAPI'
      };
    } catch (error) {
      this._logger.debug('Advanced API retrieval failed', error.message);
      return null;
    }
  }

  /**
   * Parse headers into object
   * @private
   */
  _parseHeaders(headers) {
    if (!headers) return {};
    
    return headers.reduce((acc, header) => {
      acc[header.name.toLowerCase()] = header.value;
      return acc;
    }, {});
  }

  /**
   * Extract body from message parts
   * @private
   */
  _extractBody(payload) {
    const result = { html: '', text: '' };

    const extractFromParts = (parts) => {
      if (!parts) return;

      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body && part.body.data) {
          result.html = this._decodeBase64(part.body.data);
        } else if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          result.text = this._decodeBase64(part.body.data);
        }

        if (part.parts) {
          extractFromParts(part.parts);
        }
      }
    };

    if (payload.parts) {
      extractFromParts(payload.parts);
    } else if (payload.body && payload.body.data) {
      const decoded = this._decodeBase64(payload.body.data);
      if (payload.mimeType === 'text/html') {
        result.html = decoded;
      } else {
        result.text = decoded;
      }
    }

    return result;
  }

  /**
   * Decode base64 encoded string
   * @private
   */
  _decodeBase64(data) {
    try {
      const decoded = Utilities.base64Decode(data, Utilities.Charset.UTF_8);
      return Utilities.newBlob(decoded).getDataAsString();
    } catch (error) {
      this._logger.warn('Base64 decode failed', error.message);
      return '';
    }
  }

  /**
   * Get labels from message
   * @private
   */
  _getLabels(message) {
    try {
      if (message.getLabels) {
        return message.getLabels().map(label => label.getName());
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get currently selected messages
   * @returns {Array}
   */
  getSelectedMessages() {
    try {
      return GmailApp.getSelectedMessages() || [];
    } catch (error) {
      this._logger.debug('Could not get selected messages', error.message);
      return [];
    }
  }
}