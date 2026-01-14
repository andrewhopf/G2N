/**
 * @fileoverview Page content builder
 * @description Builds Notion page content blocks from email data
 */

/**
 * Page Content Builder
 * @class PageContentBuilder
 */
class PageContentBuilder {
  constructor() {
    /** @private */
    this._maxBlockTextLength = 2000;
    /** @private */
    this._maxParagraphs = 20;
  }

  /**
   * Build email content blocks
   * @param {EmailData} emailData - Email data
   * @returns {Array} Notion block objects
   */
  buildEmailContent(emailData) {
    const blocks = [];

    // Header
    blocks.push(this._createHeading2('📧 Email Details'));

    // Metadata section
    blocks.push(...this._createMetadataBlocks(emailData));

    // Divider before body
    blocks.push(this._createDivider());

    // Body content - ENHANCED EXTRACTION
    const bodyContent = this._extractBodyContent(emailData);
    if (bodyContent) {
      blocks.push(this._createHeading3('📄 Email Body'));
      blocks.push(...this._createBodyBlocks(bodyContent));
    } else {
      // Fallback if no body found
      blocks.push(this._createHeading3('📄 Email Body'));
      blocks.push(this._createParagraph('(No email body content available)'));
    }

    // Attachments section (if any)
    if (emailData.hasAttachments) {
      blocks.push(this._createDivider());
      blocks.push(this._createHeading3('📎 Attachments'));
      blocks.push(this._createParagraph(`${emailData.attachmentCount} attachment(s)`));
    }

    return blocks;
  }

  /**
   * Extract body content with multiple fallbacks
   * @private
   * @param {EmailData} emailData - Email data
   * @returns {string|null} Extracted body text
   */
  _extractBodyContent(emailData) {
    // Priority 1: Plain text body
    if (emailData.plainBody && emailData.plainBody.trim().length > 0) {
      return emailData.plainBody;
    }

    // Priority 2: Convert HTML body to plain text
    if (emailData.body && emailData.body.trim().length > 0) {
      return this._htmlToPlainText(emailData.body);
    }

    // Priority 3: Use snippet
    if (emailData.snippet && emailData.snippet.trim().length > 0) {
      return emailData.snippet;
    }

    // No content found
    return null;
  }

  /**
   * Convert HTML to plain text
   * @private
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  _htmlToPlainText(html) {
    if (!html || typeof html !== 'string') return '';
    
    return html
      // Replace <br> tags with newlines
      .replace(/<br\s*\/?>/gi, '\n')
      // Replace </p> and </div> with double newlines
      .replace(/<\/(p|div)>/gi, '\n\n')
      // Remove all other HTML tags
      .replace(/<[^>]*>/g, ' ')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Clean up multiple newlines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Create metadata blocks
   * @private
   */
  _createMetadataBlocks(emailData) {
    const blocks = [];

    // From
    if (emailData.from) {
      blocks.push(this._createRichTextBlock([
        { text: 'From: ', bold: true },
        { text: emailData.from }
      ]));
    }

    // To
    if (emailData.to) {
      blocks.push(this._createRichTextBlock([
        { text: 'To: ', bold: true },
        { text: emailData.to }
      ]));
    }

    // CC
    if (emailData.cc) {
      blocks.push(this._createRichTextBlock([
        { text: 'CC: ', bold: true },
        { text: emailData.cc }
      ]));
    }

    // Date
    if (emailData.date) {
      blocks.push(this._createRichTextBlock([
        { text: 'Date: ', bold: true },
        { text: emailData.date.toLocaleString() }
      ]));
    }

    // Subject
    blocks.push(this._createRichTextBlock([
      { text: 'Subject: ', bold: true },
      { text: emailData.subject }
    ]));

    return blocks;
  }

  /**
   * Create body content blocks
   * @private
   * @param {string} body - Body text
   * @returns {Array} Array of block objects
   */
  _createBodyBlocks(body) {
    const blocks = [];
    
    // Guard: Empty body
    if (!body || body.trim().length === 0) {
      blocks.push(this._createParagraph('(Empty email body)'));
      return blocks;
    }
    
    // Split by double newlines (paragraphs)
    const paragraphs = body
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    // If no paragraphs found, treat entire body as one paragraph
    if (paragraphs.length === 0) {
      const text = body.trim().substring(0, this._maxBlockTextLength);
      blocks.push(this._createParagraph(text));
      return blocks;
    }
    
    // Limit to max paragraphs to avoid API limits
    const limitedParagraphs = paragraphs.slice(0, this._maxParagraphs);

    limitedParagraphs.forEach(para => {
      // Truncate long paragraphs to Notion's limit
      const text = para.substring(0, this._maxBlockTextLength);
      blocks.push(this._createParagraph(text));
    });

    // Add truncation notice if needed
    if (paragraphs.length > this._maxParagraphs) {
      blocks.push(this._createParagraph(
        `... [Content truncated - ${paragraphs.length - this._maxParagraphs} more paragraphs] ...`
      ));
    }

    return blocks;
  }

  /**
   * Create heading_2 block
   * @private
   */
  _createHeading2(text) {
    return {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: text } }]
      }
    };
  }

  /**
   * Create heading_3 block
   * @private
   */
  _createHeading3(text) {
    return {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: [{ type: 'text', text: { content: text } }]
      }
    };
  }

  /**
   * Create paragraph block
   * @private
   */
  _createParagraph(text) {
    // Ensure text is not null/undefined
    const safeText = text || '';
    
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ 
          type: 'text', 
          text: { content: safeText } 
        }]
      }
    };
  }

  /**
   * Create rich text block with formatting
   * @private
   */
  _createRichTextBlock(parts) {
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: parts.map(part => ({
          type: 'text',
          text: { content: part.text || '' },
          annotations: {
            bold: part.bold || false,
            italic: part.italic || false,
            code: part.code || false
          }
        }))
      }
    };
  }

  /**
   * Create divider block
   * @private
   */
  _createDivider() {
    return {
      object: 'block',
      type: 'divider',
      divider: {}
    };
  }

  /**
   * Create callout block
   * @param {string} text - Callout text
   * @param {string} emoji - Emoji icon
   * @returns {Object}
   */
  createCallout(text, emoji = '💡') {
    return {
      object: 'block',
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: emoji },
        rich_text: [{ type: 'text', text: { content: text || '' } }]
      }
    };
  }

  /**
   * Create bulleted list item
   * @param {string} text - Item text
   * @returns {Object}
   */
  createBulletItem(text) {
    return {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: text || '' } }]
      }
    };
  }
}