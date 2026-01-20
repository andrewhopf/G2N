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
    this._maxParagraphs = 60;
    /** @private */
    this._maxBodyBlocks = 120;
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

    // Body content
    const htmlBody = emailData.body && emailData.body.trim().length > 0 ? emailData.body : '';
    const plainBody = emailData.plainBody && emailData.plainBody.trim().length > 0
      ? emailData.plainBody
      : '';

    blocks.push(this._createHeading3('📄 Email Body'));

    if (htmlBody) {
      const htmlBlocks = this._buildBodyBlocksFromHtml(htmlBody);
      if (htmlBlocks.length > 0) {
        blocks.push(...htmlBlocks);
      } else {
        const fallback = this._stripPlainContent(plainBody || this._extractBodyContent(emailData) || '');
        blocks.push(...this._createBodyBlocks(fallback));
      }
    } else {
      const bodyContent = this._stripPlainContent(plainBody || this._extractBodyContent(emailData) || '');
      if (bodyContent) {
        blocks.push(...this._createBodyBlocks(bodyContent));
      } else {
        blocks.push(this._createParagraph('(No email body content available)'));
      }
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
   * Build attachment file blocks
   * @param {Array} processedFiles
   * @param {string} headingText
   * @returns {Array}
   */
  buildAttachmentFileBlocks(processedFiles, headingText) {
    if (!Array.isArray(processedFiles) || processedFiles.length === 0) {
      return [];
    }

    const blocks = [];
    blocks.push(this._createDivider());
    if (headingText) {
      blocks.push(this._createHeading3(headingText));
    }

    processedFiles.forEach(file => {
      const block = this._createFileBlock(file);
      if (block) blocks.push(block);
    });

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
   * Build formatted blocks from HTML content
   * @private
   * @param {string} html
   * @returns {Array}
   */
  _buildBodyBlocksFromHtml(html) {
    if (!html || typeof html !== 'string') return [];

    let cleaned = this._stripQuotedHtml(html);
    cleaned = this._stripSignatureHtml(cleaned);
    cleaned = cleaned.replace(/\r/g, '');

    const imageMarkers = [];
    cleaned = cleaned.replace(/<img\b[^>]*>/gi, (tag) => {
      const srcMatch = tag.match(/src\s*=\s*["']([^"']+)["']/i);
      if (!srcMatch || !srcMatch[1]) return '';
      const src = srcMatch[1].trim();
      if (!src || /^cid:/i.test(src)) return '';
      imageMarkers.push(src);
      return `\n[[IMG|${src}]]\n`;
    });

    cleaned = cleaned
      .replace(/<h1\b[^>]*>/gi, '\n[[H1]]')
      .replace(/<\/h1>/gi, '[[/H1]]\n')
      .replace(/<h2\b[^>]*>/gi, '\n[[H2]]')
      .replace(/<\/h2>/gi, '[[/H2]]\n')
      .replace(/<h3\b[^>]*>/gi, '\n[[H3]]')
      .replace(/<\/h3>/gi, '[[/H3]]\n')
      .replace(/<table\b[^>]*>/gi, '\n[[P]]')
      .replace(/<\/table>/gi, '[[/P]]\n')
      .replace(/<tr\b[^>]*>/gi, '\n[[P]]')
      .replace(/<\/tr>/gi, '[[/P]]\n')
      .replace(/<td\b[^>]*>/gi, '\n[[P]]')
      .replace(/<\/td>/gi, '[[/P]]\n')
      .replace(/<ul\b[^>]*>/gi, '\n[[UL]]\n')
      .replace(/<\/ul>/gi, '\n[[/UL]]\n')
      .replace(/<ol\b[^>]*>/gi, '\n[[OL]]\n')
      .replace(/<\/ol>/gi, '\n[[/OL]]\n')
      .replace(/<li\b[^>]*>/gi, '[[LI]]')
      .replace(/<\/li>/gi, '[[/LI]]\n')
      .replace(/<p\b[^>]*>/gi, '\n[[P]]')
      .replace(/<\/p>/gi, '[[/P]]\n')
      .replace(/<div\b[^>]*>/gi, '\n[[P]]')
      .replace(/<\/div>/gi, '[[/P]]\n')
      .replace(/<br\s*\/?>/gi, '\n');

    cleaned = cleaned.replace(/<(?!\/?(b|strong|i|em|a)\b)[^>]+>/gi, '');

    if (cleaned.indexOf('<') === -1 && (cleaned.indexOf('&gt;') !== -1 || /(^|\n)\s*>/.test(cleaned))) {
      cleaned = this._normalizeForwardedText(cleaned);
    }

    const tokens = cleaned.split(/(\[\[[^\]]+\]\])/);
    const blocks = [];
    let currentType = null;
    let buffer = '';
    let listType = null;

    const flushBuffer = () => {
      const text = buffer.trim();
      if (!text) {
        buffer = '';
        return;
      }
      if (currentType === 'h1') {
        blocks.push(this._createHeading1Rich(text));
      } else if (currentType === 'h2') {
        blocks.push(this._createHeading2Rich(text));
      } else if (currentType === 'h3') {
        blocks.push(this._createHeading3Rich(text));
      } else if (currentType === 'li') {
        blocks.push(this._createListItemRich(text, listType));
      } else {
        blocks.push(this._createParagraphRich(text));
      }
      buffer = '';
    };

    for (const token of tokens) {
      if (!token) continue;
      const markerMatch = token.match(/^\[\[([A-Z0-9|\/:_-]+)\]\]$/);
      if (markerMatch) {
        const marker = markerMatch[1];
        if (marker.startsWith('IMG|')) {
          flushBuffer();
          const src = marker.substring(4);
          const imageBlock = this._createImageBlock(src);
          if (imageBlock) blocks.push(imageBlock);
          continue;
        }
        switch (marker) {
          case 'H1':
            flushBuffer();
            currentType = 'h1';
            break;
          case '/H1':
            flushBuffer();
            currentType = null;
            break;
          case 'H2':
            flushBuffer();
            currentType = 'h2';
            break;
          case '/H2':
            flushBuffer();
            currentType = null;
            break;
          case 'H3':
            flushBuffer();
            currentType = 'h3';
            break;
          case '/H3':
            flushBuffer();
            currentType = null;
            break;
          case 'P':
            flushBuffer();
            currentType = 'p';
            break;
          case '/P':
            flushBuffer();
            currentType = null;
            break;
          case 'UL':
            flushBuffer();
            listType = 'bulleted';
            break;
          case '/UL':
            flushBuffer();
            listType = null;
            break;
          case 'OL':
            flushBuffer();
            listType = 'numbered';
            break;
          case '/OL':
            flushBuffer();
            listType = null;
            break;
          case 'LI':
            flushBuffer();
            currentType = 'li';
            break;
          case '/LI':
            flushBuffer();
            currentType = null;
            break;
          default:
            break;
        }
      } else {
        buffer += token;
      }

      if (blocks.length >= this._maxBodyBlocks) {
        break;
      }
    }

    if (blocks.length < this._maxBodyBlocks) {
      flushBuffer();
    }

    if (blocks.length >= this._maxBodyBlocks) {
      blocks.push(this._createParagraph('... [Content truncated] ...'));
    }

    return this._expandImageMarkersInBlocks(blocks);
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
   * Strip quoted replies from HTML
   * @private
   */
  _stripQuotedHtml(html) {
    const markers = [
      /<div[^>]*class=["'][^"']*gmail_quote[^"']*["'][^>]*>/i,
      /<blockquote\b[^>]*class=["'][^"']*gmail_quote[^"']*["'][^>]*>/i,
      /<blockquote\b[^>]*>/i,
      /<hr\b[^>]*class=["'][^"']*gmail_quote[^"']*["'][^>]*>/i
    ];
    for (const regex of markers) {
      const match = html.match(regex);
      if (match && match.index !== undefined) {
        const prefix = html.substring(0, match.index);
        const prefixText = this._htmlToPlainText(prefix).trim();
        if (prefixText.length > 20) {
          return html.substring(0, match.index);
        }
      }
    }
    return html;
  }

  /**
   * Strip signatures from HTML
   * @private
   */
  _stripSignatureHtml(html) {
    let cleaned = html;
    cleaned = cleaned.replace(
      /<div[^>]*class=["'][^"']*gmail_signature[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      ''
    );
    cleaned = cleaned.replace(
      /<span[^>]*class=["'][^"']*gmail_signature[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
      ''
    );
    return cleaned;
  }

  /**
   * Strip quoted replies and signatures from plain text
   * @private
   */
  _stripPlainContent(text) {
    if (!text) return '';
    let cleaned = this._decodeHtmlEntities(String(text));
    const quoteMarkers = [
      /\nOn .+ wrote:\s*/i,
      /\nFrom:\s+/i,
      /\nSent:\s+/i,
      /\n-----Original Message-----/i
    ];
    const lines = cleaned.split(/\r?\n/);
    const forwardLinePattern = /^(Begin forwarded message:|[-]{2,}\s*Forwarded message[-]{2,}|[-]{2,}\s*Original Message[-]{2,})/i;
    const headerPattern = /^(From:|Subject:|Date:|To:|Cc:|Reply-To:)/i;
    let firstContentLine = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        firstContentLine = trimmed;
        break;
      }
    }

    const isForwardedOnly = forwardLinePattern.test(firstContentLine) || headerPattern.test(firstContentLine);
    if (isForwardedOnly) {
      cleaned = this._normalizeForwardedText(cleaned);
    } else {
      let cutIndex = -1;
      quoteMarkers.forEach(regex => {
        const match = cleaned.search(regex);
        if (match !== -1 && (cutIndex === -1 || match < cutIndex)) {
          cutIndex = match;
        }
      });

      let lineStart = 0;
      let sawContent = false;
      let firstQuotedStart = -1;
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          if (forwardLinePattern.test(trimmed)) {
            if (cutIndex === -1 || lineStart < cutIndex) {
              cutIndex = lineStart;
            }
            break;
          }
          if (/^>/.test(trimmed)) {
            if (firstQuotedStart === -1) firstQuotedStart = lineStart;
          } else {
            sawContent = true;
          }
        }
        lineStart += line.length + 1;
      }

      if (sawContent && firstQuotedStart !== -1) {
        if (cutIndex === -1 || firstQuotedStart < cutIndex) {
          cutIndex = firstQuotedStart;
        }
      }

      if (cutIndex !== -1) {
        cleaned = cleaned.substring(0, cutIndex);
      }
    }

    const signatureMarkers = [
      /\n--\s*\n/,
      /\n__\n/,
      /\nSent from my\s/i
    ];
    let sigIndex = -1;
    signatureMarkers.forEach(regex => {
      const match = cleaned.search(regex);
      if (match !== -1 && (sigIndex === -1 || match < sigIndex)) {
        sigIndex = match;
      }
    });
    if (sigIndex !== -1) {
      cleaned = cleaned.substring(0, sigIndex);
    }

    return cleaned.trim();
  }

  /**
   * Normalize forwarded plain text (remove quote prefixes)
   * @private
   */
  _normalizeForwardedText(text) {
    if (!text) return '';
    const raw = this._decodeHtmlEntities(String(text));
    const lines = raw.split(/\r?\n/);
    const forwardLinePattern = /^(Begin forwarded message:|[-]{2,}\s*Forwarded message[-]{2,}|[-]{2,}\s*Original Message[-]{2,})/i;
    const normalized = [];
    let removedForwardHeader = false;

    lines.forEach(line => {
      let cleanedLine = line.replace(/^\s*>+\s?/, '');
      const trimmed = cleanedLine.trim();
      if (!removedForwardHeader && forwardLinePattern.test(trimmed)) {
        removedForwardHeader = true;
        return;
      }
      normalized.push(cleanedLine);
    });

    return normalized.join('\n');
  }

  /**
   * Expand image markers left in paragraph blocks
   * @private
   */
  _expandImageMarkersInBlocks(blocks) {
    const expanded = [];
    if (!Array.isArray(blocks)) return expanded;

    blocks.forEach(block => {
      if (!block || block.type !== 'paragraph' || !block.paragraph || !block.paragraph.rich_text) {
        expanded.push(block);
        return;
      }

      const text = block.paragraph.rich_text.map(part => part.text && part.text.content ? part.text.content : '').join('');
      if (text.indexOf('[[IMG|') === -1) {
        expanded.push(block);
        return;
      }

      const segments = this._splitByImageMarkers(text);
      segments.forEach(segment => {
        if (segment.type === 'image') {
          const imageBlock = this._createImageBlock(segment.value);
          if (imageBlock) expanded.push(imageBlock);
        } else if (segment.value && segment.value.trim()) {
          expanded.push(this._createParagraphRich(segment.value));
        }
      });
    });

    return expanded;
  }

  /**
   * Split text by image markers
   * @private
   */
  _splitByImageMarkers(text) {
    const segments = [];
    const regex = /\[\[IMG\|([^\]]+)\]\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', value: text.substring(lastIndex, match.index) });
      }
      segments.push({ type: 'image', value: match[1] });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      segments.push({ type: 'text', value: text.substring(lastIndex) });
    }

    return segments;
  }

  /**
   * Decode HTML entities
   * @private
   */
  _decodeHtmlEntities(text) {
    return String(text || '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#39;/g, "'");
  }

  /**
   * Parse inline HTML to Notion rich_text
   * @private
   */
  _parseInlineHtml(text) {
    const rich = [];
    if (!text) return rich;

    const tokens = String(text).split(/(<\/?[^>]+>)/);
    let bold = false;
    let italic = false;
    let link = null;
    let totalLength = 0;

    const pushText = (value) => {
      let decoded = this._decodeHtmlEntities(value);
      if (!decoded) return;
      if (totalLength >= this._maxBlockTextLength) return;
      if (totalLength + decoded.length > this._maxBlockTextLength) {
        decoded = decoded.substring(0, this._maxBlockTextLength - totalLength);
      }
      const last = rich[rich.length - 1];
      const annotations = { bold, italic, code: false };
      const linkObj = link ? { url: link } : undefined;

      if (
        last &&
        last.type === 'text' &&
        JSON.stringify(last.annotations) === JSON.stringify(annotations) &&
        ((last.text.link && linkObj && last.text.link.url === linkObj.url) ||
          (!last.text.link && !linkObj))
      ) {
        last.text.content += decoded;
      } else {
        rich.push({
          type: 'text',
          text: { content: decoded, link: linkObj },
          annotations: annotations
        });
      }
      totalLength += decoded.length;
    };

    tokens.forEach(token => {
      if (!token) return;
      const tagMatch = token.match(/^<\s*\/?\s*([a-z0-9]+)([^>]*)>$/i);
      if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        if (tag === 'b' || tag === 'strong') {
          bold = !/^<\s*\//.test(token);
        } else if (tag === 'i' || tag === 'em') {
          italic = !/^<\s*\//.test(token);
        } else if (tag === 'a') {
          if (!/^<\s*\//.test(token)) {
            const hrefMatch = token.match(/href\s*=\s*["']([^"']+)["']/i);
            link = hrefMatch ? hrefMatch[1] : null;
          } else {
            link = null;
          }
        } else if (tag === 'br') {
          pushText('\n');
        }
      } else {
        pushText(token);
      }
    });

    return rich;
  }

  /**
   * Create a Notion file block
   * @private
   * @param {Object} file
   * @returns {Object|null}
   */
  _createFileBlock(file) {
    if (!file) return null;

    const name = String(file.name || '').substring(0, 2000);
    const caption = name
      ? [{ type: 'text', text: { content: name } }]
      : [];

    if (file.notionUploadId) {
      return {
        object: 'block',
        type: 'file',
        file: {
          type: 'file_upload',
          file_upload: { id: file.notionUploadId }
        }
      };
    }

    const externalUrl = file.downloadUrl || file.url || '';
    const fileName = file.sourceName || file.name || '';
    const isPdf = /\.pdf$/i.test(fileName) || String(file.type || '').toLowerCase() === 'application/pdf';
    if (externalUrl && isPdf) {
      return {
        object: 'block',
        type: 'pdf',
        pdf: {
          type: 'external',
          external: { url: externalUrl }
        }
      };
    }
    if (externalUrl) {
      return {
        object: 'block',
        type: 'file',
        file: {
          type: 'external',
          external: { url: externalUrl }
        }
      };
    }

    return null;
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
   * Create heading_1 block
   * @private
   */
  _createHeading1(text) {
    return {
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{ type: 'text', text: { content: text } }]
      }
    };
  }

  /**
   * Create heading_1 block with inline formatting
   * @private
   */
  _createHeading1Rich(text) {
    return {
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: this._parseInlineHtml(text)
      }
    };
  }

  /**
   * Create heading_2 block with inline formatting
   * @private
   */
  _createHeading2Rich(text) {
    return {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: this._parseInlineHtml(text)
      }
    };
  }

  /**
   * Create heading_3 block with inline formatting
   * @private
   */
  _createHeading3Rich(text) {
    return {
      object: 'block',
      type: 'heading_3',
      heading_3: {
        rich_text: this._parseInlineHtml(text)
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
   * Create paragraph block with inline formatting
   * @private
   */
  _createParagraphRich(text) {
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: this._parseInlineHtml(text)
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

  /**
   * Create list item with inline formatting
   * @private
   */
  _createListItemRich(text, listType) {
    const richText = this._parseInlineHtml(text);
    if (listType === 'numbered') {
      return {
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: richText }
      };
    }
    return {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: { rich_text: richText }
    };
  }

  /**
   * Create image block
   * @private
   */
  _createImageBlock(url) {
    if (!url || !/^https?:\/\//i.test(url)) return null;
    return {
      object: 'block',
      type: 'image',
      image: {
        type: 'external',
        external: { url: url }
      }
    };
  }
}
