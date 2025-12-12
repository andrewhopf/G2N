// GmailService.gs
// =============================================================================
// GMAIL API SERVICE - SIMPLIFIED VERSION
// =============================================================================

class GmailService {
  constructor() {
    console.log('📧 GmailService initialized');
  }

  /**
   * Get email data by message ID - SIMPLE IMPLEMENTATION
   */
  getEmailData(messageId) {
    try {
      console.log('📧 GmailService.getEmailData called for:', messageId);
      
      if (!messageId) {
        throw new Error('Message ID is required');
      }
      
      const message = GmailApp.getMessageById(messageId);
      if (!message) {
        throw new Error('Message not found: ' + messageId);
      }
      
      const emailData = {
        id: messageId,
        subject: message.getSubject() || 'No Subject',
        sender: message.getFrom() || 'Unknown Sender',
        from: message.getFrom() || 'Unknown Sender', // Add 'from' for compatibility
        body: message.getPlainBody() || '',
        dateSent: message.getDate() || new Date(),
        threadId: message.getThread().getId() || '',
        gmailLink: `https://mail.google.com/mail/u/0/#inbox/${messageId}`,
        messageId: messageId,
        to: message.getTo() || '',
        cc: message.getCc() || '',
        bcc: message.getBcc() || ''
      };
      
      console.log('✅ GmailService.getEmailData success:', {
        subject: emailData.subject,
        sender: emailData.sender
      });
      
      return emailData;
      
    } catch (error) {
      console.error('❌ GmailService.getEmailData failed:', error);
      throw new Error('Gmail API error: ' + error.message);
    }
  }

  /**
   * Get selected email with recovery fallbacks
   */
  getSelectedEmailWithRecovery(e) {
    try {
      console.log('📧 GmailService.getSelectedEmailWithRecovery called');
      
      let messageId;
      
      // Method 1: From Gmail add-on context
      if (e && e.gmail && e.gmail.messageId) {
        messageId = e.gmail.messageId;
        console.log('✅ Using message ID from Gmail context:', messageId);
      }
      // Method 2: From parameters
      else if (e && e.parameters && e.parameters.messageId) {
        messageId = e.parameters.messageId;
        console.log('✅ Using message ID from parameters:', messageId);
      }
      // Method 3: Fallback to current message
      else {
        console.warn('⚠️ No context, trying GmailApp.getCurrentMessage');
        try {
          const message = GmailApp.getCurrentMessage();
          if (message) {
            messageId = message.getId();
            console.log('✅ Using current message:', messageId);
          }
        } catch (error) {
          console.error('❌ GmailApp.getCurrentMessage failed:', error);
        }
      }
      
      if (!messageId) {
        throw new Error('No email message accessible. Please open an email in Gmail and use the add-on from there.');
      }
      
      return this.getEmailData(messageId);
      
    } catch (error) {
      console.error('❌ GmailService.getSelectedEmailWithRecovery failed:', error);
      throw error;
    }
  }
}

// =============================================================================
// GLOBAL FUNCTIONS
// =============================================================================

/**
 * Get GmailService instance
 */
function getGmailService() {
  return new GmailService();
}

/**
 * Global wrapper for getEmailData
 */
function getEmailData(messageId) {
  const service = getGmailService();
  return service.getEmailData(messageId);
}

