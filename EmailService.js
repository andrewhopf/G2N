// EmailService.gs 
// =============================================================================
// EMAIL SERVICE WITH BLOCK CHILDREN SUPPORT
// =============================================================================

class EmailService {
  constructor() {
    this.constants = this.getConstants();
  }

  /**
   * Safe constants getter
   */
  getConstants() {
    try {
      if (typeof getAppConstants === 'function') {
        return getAppConstants();
      }
      return null;
    } catch (error) {
      console.error('Error loading constants: ' + error);
      return null;
    }
  }

  /**
   * Save email to Notion with optional body content and attachments as blocks
   */
  saveEmailToNotion(email, databaseId, saveMode, includeBody, selectedAttachments, gmailMessage) {
    try {
      console.log('💾 Saving email to Notion (database: ' + databaseId + ', includeBody: ' + includeBody + ', attachments: ' + (selectedAttachments ? selectedAttachments.length : 0) + ')...');
      
      const notionService = new NotionService();
      const propertyMapper = new PropertyMapper();
      
      // First, get the database properties using your existing debug function
      let databaseProperties = {};
      try {
        databaseProperties = propertyMapper.debugDatabaseProperties(databaseId);
        console.log('📋 Available database properties: ' + Object.keys(databaseProperties));
      } catch (error) {
        console.error('❌ Failed to get database properties: ' + error);
        throw new Error('Cannot access database properties: ' + error.message);
      }
      
      // ✅ FIXED: Pass databaseId to buildDynamicProperties to use configured mappings
      const properties = this.buildDynamicProperties(email, databaseProperties, databaseId);
      
      console.log('📤 Creating page with properties: ' + Object.keys(properties));
      
      // Create the page first (this creates the database entry)
      const pageResult = notionService.createPageInDatabase(databaseId, properties);
      
      if (pageResult && pageResult.id) {
        console.log('✅ Page created successfully: ' + pageResult.id);
        
        let blocksAdded = 0;
        let attachmentBlocksAdded = 0;
        
        // ONLY add email body as block children if user wants it
        if (includeBody && email.body && email.body.length > 10 && !email.body.includes('unavailable')) {
          console.log('📝 Adding email body as block children...');
          const bodyBlocksAdded = this.addEmailBodyAsBlocks(pageResult.id, email.body);
          blocksAdded += bodyBlocksAdded;
          console.log('✅ Added ' + bodyBlocksAdded + ' content blocks to page');
        } else if (!includeBody) {
          console.log('⏭️  Skipping email body - user chose not to include content');
        } else {
          console.log('⚠️ No email body content to add as blocks');
        }
        
        // ADD ATTACHMENTS AS BLOCKS if any are selected
        if (selectedAttachments && selectedAttachments.length > 0) {
          console.log('📎 Adding selected attachments as blocks...');
          attachmentBlocksAdded = this.addAttachmentsAsBlocks(pageResult.id, selectedAttachments, gmailMessage);
          blocksAdded += attachmentBlocksAdded;
          console.log('✅ Added ' + attachmentBlocksAdded + ' attachment blocks to page');
        } else {
          console.log('⏭️  No attachments selected to embed');
        }
        
        // Build success message based on what was saved
        let message = '';
        if (includeBody && selectedAttachments.length > 0) {
          message = 'Email saved to Notion successfully with content and ' + selectedAttachments.length + ' attachment(s)';
        } else if (includeBody) {
          message = 'Email saved to Notion successfully with content blocks';
        } else if (selectedAttachments.length > 0) {
          message = 'Email saved to Notion successfully (content excluded) with ' + selectedAttachments.length + ' attachment(s)';
        } else {
          message = 'Email saved to Notion successfully (content excluded)';
        }
        
        return {
          success: true,
          pageId: pageResult.id,
          url: pageResult.url,
          message: message,
          blocksAdded: blocksAdded,
          attachmentsAdded: selectedAttachments.length,
          filesEmbedded: attachmentBlocksAdded || 0
        };
      } else {
        throw new Error('Failed to create page in Notion');
      }
      
    } catch (error) {
      console.error('❌ Failed to save email to Notion: ' + error);
      return {
        success: false,
        error: error.message,
        pageId: null
      };
    }
  }

  /**
   * Create a new property in a Notion database
   */
  createNotionProperty(databaseId, propertyName, propertyType) {
    try {
      console.log('🆕 Creating new property: ' + propertyName + ' (' + propertyType + ')');
      
      const notionService = new NotionService();
      const url = 'https://api.notion.com/v1/databases/' + databaseId;
      const headers = notionService.getNotionHeaders();
      
      // Build the property configuration based on type
      let propertyConfig = {};
      
      switch (propertyType) {
        case 'title':
          propertyConfig = { title: {} };
          break;
        case 'rich_text':
          propertyConfig = { rich_text: {} };
          break;
        case 'number':
          propertyConfig = { number: { format: 'number' } };
          break;
        case 'select':
          propertyConfig = { 
            select: { 
              options: [{ name: 'Option 1' }] 
            } 
          };
          break;
        case 'multi_select':
          propertyConfig = { 
            multi_select: { 
              options: [{ name: 'Option 1' }] 
            } 
          };
          break;
        case 'date':
          propertyConfig = { date: {} };
          break;
        case 'url':
          propertyConfig = { url: {} };
          break;
        case 'email':
          propertyConfig = { email: {} };
          break;
        case 'checkbox':
          propertyConfig = { checkbox: {} };
          break;
        case 'phone_number':
          propertyConfig = { phone_number: {} };
          break;
        default:
          propertyConfig = { rich_text: {} }; // Default fallback
      }
      
      const payload = {
        properties: {
          [propertyName]: propertyConfig
        }
      };
      
      console.log('🚀 Creating property with payload: ' + JSON.stringify(payload));
      
      const optionsConfig = {
        method: 'PATCH',
        headers: headers,
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };
      
      const response = UrlFetchApp.fetch(url, optionsConfig);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      if (responseCode === 200) {
        console.log('✅ Successfully created property: ' + propertyName);
        return {
          success: true,
          propertyName: propertyName,
          propertyType: propertyType
        };
      } else {
        console.error('❌ Failed to create property: ' + responseText);
        return {
          success: false,
          error: 'Notion API error: ' + responseText
        };
      }
      
    } catch (error) {
      console.error('❌ Property creation failed: ' + error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Suggest property names based on email field
   */
  suggestPropertyName(emailFieldId) {
    const suggestions = {
      'subject': 'Email Subject',
      'from': 'Sender Email', 
      'to': 'Recipient Email',
      'dateSent': 'Date Received',
      'body': 'Email Content',
      'gmailLink': 'Gmail Link',
      'messageId': 'Message ID'
    };
    
    return suggestions[emailFieldId] || 'Email Field';
  }

  /**
   * Format property type for display
   */
  formatPropertyType(type) {
    const typeNames = {
      'title': 'Title',
      'rich_text': 'Text',
      'number': 'Number', 
      'select': 'Select',
      'multi_select': 'Multi-select',
      'date': 'Date',
      'url': 'URL',
      'email': 'Email',
      'checkbox': 'Checkbox',
      'phone_number': 'Phone'
    };
    
    return typeNames[type] || type;
  }

  /**
   * Get compatible property types for each email field
   */
  getCompatiblePropertyTypes(emailField) {
    const compatibilityMap = {
      'subject': ['title', 'rich_text'],
      'from': ['email', 'rich_text'],
      'to': ['email', 'rich_text'], 
      'dateSent': ['date'],
      'body': ['rich_text'],
      'gmailLink': ['url'],
      'messageId': ['rich_text']
    };
    
    return compatibilityMap[emailField] || ['rich_text'];
  }

  /**
   * Build properties using configured mappings - NOT hardcoded
   */
  buildDynamicProperties(email, databaseProperties, databaseId) {
    const properties = {};
    const availableProps = Object.keys(databaseProperties);
    
    console.log('🔍 Building dynamic properties for database: ' + databaseId);
    console.log('📋 Available properties: ' + availableProps);
    
    if (availableProps.length === 0) {
      throw new Error('No properties found in database.');
    }
    
    // ✅ Get ACTUAL configured mappings for this database
    const config = getEnhancedG2NConfig();
    const configuredMappings = (config.PROPERTY_MAPPINGS && config.PROPERTY_MAPPINGS.mappings && config.PROPERTY_MAPPINGS.mappings[databaseId]) ? config.PROPERTY_MAPPINGS.mappings[databaseId] : {};
    
    console.log('🎯 Using configured mappings: ' + JSON.stringify(configuredMappings));
    
    // If no mappings configured, use auto-detection
    if (Object.keys(configuredMappings).length === 0) {
      console.log('⚠️ No custom mappings, using auto-detection');
      return this.buildAutoDetectedProperties(email, databaseProperties);
    }
    
    // ✅ Use the ACTUAL mappings from your Advanced Mapping configuration
    for (const emailField in configuredMappings) {
      if (configuredMappings.hasOwnProperty(emailField)) {
        const notionProperty = configuredMappings[emailField];
        if (!notionProperty || !databaseProperties[notionProperty]) {
          console.warn('⚠️ Mapping skipped: ' + emailField + ' -> ' + notionProperty + ' (not in database)');
          continue;
        }
        
        try {
          const propertyValue = this.mapEmailFieldToNotionProperty(email, emailField, notionProperty, databaseProperties[notionProperty]);
          if (propertyValue !== null) {
            properties[notionProperty] = propertyValue;
            console.log('✅ Mapped: ' + emailField + ' -> ' + notionProperty);
          }
        } catch (error) {
          console.error('❌ Failed to map ' + emailField + ' to ' + notionProperty + ': ' + error);
        }
      }
    }
    
    // Ensure we have at least a title property
    if (Object.keys(properties).length === 0) {
      console.log('🔄 No mappings worked, falling back to auto-detection');
      return this.buildAutoDetectedProperties(email, databaseProperties);
    }
    
    console.log('🎉 Final properties: ' + Object.keys(properties));
    return properties;
  }

  /**
   * Auto-detect properties as fallback
   */
  buildAutoDetectedProperties(email, databaseProperties) {
    const properties = {};
    const availableProps = Object.keys(databaseProperties);
    
    console.log('🤖 Auto-detecting property mappings...');
    
    // Simple auto-detection logic
    for (let i = 0; i < availableProps.length; i++) {
      const propName = availableProps[i];
      const prop = databaseProperties[propName];
      
      // Look for title property for subject
      if (prop.type === 'title' && !properties[propName]) {
        properties[propName] = {
          title: [{ text: { content: email.subject || 'No Subject' } }]
        };
        console.log('✅ Auto-mapped subject to: ' + propName);
        break;
      }
    }
    
    return properties;
  }

  /**
   * Map email field to Notion property value
   */
  mapEmailFieldToNotionProperty(email, emailField, notionProperty, propertyDefinition) {
    const value = email[emailField];
    
    if (!value) {
      return null;
    }
    
    const propertyType = propertyDefinition.type;
    
    switch (propertyType) {
      case 'title':
        return {
          title: [{ type: 'text', text: { content: String(value).substring(0, 2000) } }]
        };
        
      case 'rich_text':
        return {
          rich_text: [{ type: 'text', text: { content: String(value).substring(0, 2000) } }]
        };
        
      case 'url':
        let urlValue = String(value);
        if (!urlValue.startsWith('http://') && !urlValue.startsWith('https://') && urlValue.includes('.')) {
          urlValue = 'https://' + urlValue;
        }
        return { url: urlValue };
        
      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : { date: { start: date.toISOString() } };
        
      case 'number':
        const num = Number(value);
        return isNaN(num) ? null : { number: num };
        
      case 'select':
        return { select: { name: String(value).substring(0, 100) } };
        
      case 'multi_select':
        const options = Array.isArray(value) ? value : [value];
        const selectOptions = options.map(opt => ({ name: String(opt).substring(0, 100) }));
        return { multi_select: selectOptions };
        
      default:
        // Default to rich_text for unknown types
        return {
          rich_text: [{ type: 'text', text: { content: String(value).substring(0, 2000) } }]
        };
    }
  }

  /**
   * Create data URL for file - SIMPLIFIED
   */
  uploadFileToNotion(fileName, fileBytes, mimeType) {
    try {
      console.log('📤 Creating data URL for: ' + fileName);
      
      const base64Content = Utilities.base64Encode(fileBytes);
      const dataUrl = 'data:' + mimeType + ';base64,' + base64Content;
      
      console.log('✅ Created data URL for: ' + fileName + ' (' + fileBytes.length + ' bytes)');
      return dataUrl;
      
    } catch (error) {
      console.error('❌ Error creating data URL: ' + error);
      return null;
    }
  }

  /**
   * Get MIME type from file extension
   */
  getMimeTypeFromFileName(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'txt': 'text/plain',
      'zip': 'application/zip'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  /**
   * Get ACTUAL file bytes from Gmail attachment
   */
  getActualAttachmentContent(attachment, emailMessage) {
    try {
      if (!emailMessage) {
        console.warn('❌ No Gmail message provided for file access');
        return null;
      }
      
      console.log('🔍 Looking for actual attachment: ' + attachment.name);
      const gmailAttachments = emailMessage.getAttachments();
      console.log('📎 Found ' + gmailAttachments.length + ' attachments in Gmail message');
      
      const gmailAttachment = gmailAttachments.find(function(att) {
        const nameMatch = att.getName() === attachment.name;
        if (nameMatch) {
          console.log('✅ Found matching Gmail attachment: ' + att.getName());
        }
        return nameMatch;
      });
      
      if (gmailAttachment) {
        console.log('📦 Getting bytes for: ' + attachment.name);
        const fileBytes = gmailAttachment.getBytes();
        console.log('✅ Retrieved ' + fileBytes.length + ' bytes for: ' + attachment.name);
        return fileBytes;
      } else {
        console.warn('❌ Could not find actual attachment: ' + attachment.name);
        console.log('🔍 Available attachments: ' + gmailAttachments.map(function(att) { return att.getName(); }));
        return null;
      }
      
    } catch (error) {
      console.error('❌ Error getting actual attachment content: ' + error);
      return null;
    }
  }

  /**
   * Add actual file attachments as Notion block children - FIXED TO KEEP TEXT FALLBACK
   */
  addAttachmentsAsBlocks(pageId, attachments, emailMessage) {
    try {
      console.log('🚀 START: addAttachmentsAsBlocks - EMBEDDING ACTUAL FILES');
      console.log('📄 Page ID: ' + pageId);
      console.log('📎 Attachments to embed: ' + (attachments ? attachments.length : 0));
      
      if (!pageId) {
        throw new Error('No page ID provided for attachment addition');
      }
      
      if (!attachments || attachments.length === 0) {
        console.log('⚠️ No attachments to embed');
        return 0;
      }
      
      const blocks = [];
      let filesEmbedded = 0;
      
      // Add a header for attachments
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{
            type: 'text',
            text: { content: '📎 Email Attachments' }
          }]
        }
      });
      
      // Add a divider
      blocks.push({
        object: 'block',
        type: 'divider',
        divider: {}
      });
      
      // Process each attachment to embed the actual file - SYNCHRONOUSLY
      for (let i = 0; i < attachments.length; i++) {
        const attachment = attachments[i];
        try {
          console.log('📎 Processing attachment: ' + attachment.name);
          
          // Try to get the actual file content and upload to Notion - SYNCHRONOUS
          const fileBlock = this.createFileBlock(attachment, emailMessage);
          if (fileBlock) {
            blocks.push(fileBlock);
            filesEmbedded++;
            console.log('✅ Created file block for: ' + attachment.name);
          } else {
            // Fallback to text if file embedding fails
            console.warn('⚠️ File embedding failed for ' + attachment.name + ', using text fallback');
            blocks.push(this.createAttachmentTextBlock(attachment));
          }
          
        } catch (attachmentError) {
          console.error('❌ Error processing attachment ' + attachment.name + ': ' + attachmentError);
          // Fallback to text block
          blocks.push(this.createAttachmentTextBlock(attachment));
        }
      }
      
      // FIX: Don't remove blocks if file embedding fails - keep text representation
      if (filesEmbedded === 0) {
        console.log('⚠️ No files could be embedded, but keeping text representation');
        // DON'T remove the header and divider - keep the text blocks
      }
      
      console.log('📦 Created ' + blocks.length + ' blocks, embedded ' + filesEmbedded + ' files');
      
      if (blocks.length === 0) {
        console.log('⚠️ No attachment blocks generated');
        return 0;
      }
      
      console.log('🚀 Calling appendBlockChildren for file attachments...');
      const notionService = new NotionService();
      const result = notionService.appendBlockChildren(pageId, blocks);
      console.log('✅ File attachment blocks appended successfully');
      
      return blocks.length; // Return total blocks added (not just files embedded)
      
    } catch (error) {
      console.error('❌ FAILED: addAttachmentsAsBlocks');
      console.error('Error message: ' + error.message);
      console.error('Error stack: ' + error.stack);
      return 0;
    }
  }

  /**
   * Create file block using base64 data URL - SINGLE IMPLEMENTATION
   */
  createFileBlock(attachment, emailMessage) {
    try {
      console.log('📤 Creating file block for: ' + attachment.name);
      
      // 1. Get actual file content from Gmail
      const fileContent = this.getActualAttachmentContent(attachment, emailMessage);
      if (!fileContent) {
        console.warn('⚠️ Could not get file content for: ' + attachment.name);
        return this.createAttachmentTextBlock(attachment);
      }
      
      console.log('✅ Retrieved ' + fileContent.length + ' bytes for: ' + attachment.name);
      
      // 2. Get MIME type and create data URL
      const mimeType = this.getMimeTypeFromFileName(attachment.name);
      const base64Content = Utilities.base64Encode(fileContent);
      const dataUrl = 'data:' + mimeType + ';base64,' + base64Content;
      
      console.log('📊 Created data URL for: ' + attachment.name + ' (MIME: ' + mimeType + ')');
      
      // 3. Create file block with data URL - USE THIS EXACT STRUCTURE
      const fileBlock = {
        object: 'block',
        type: 'file',
        file: {
          type: 'external',
          external: {
            url: dataUrl
          }
        }
      };
      
      console.log('✅ SUCCESS: File block created for: ' + attachment.name);
      return fileBlock;
      
    } catch (error) {
      console.error('❌ FAILED: Error creating file block for ' + attachment.name + ': ' + error);
      return this.createAttachmentTextBlock(attachment);
    }
  }

  /**
   * Create text fallback block when file embedding fails
   */
  createAttachmentTextBlock(attachment) {
    const fileName = attachment.name || 'Unnamed file';
    const fileSize = attachment.size ? this.formatFileSize(attachment.size) : 'Size unknown';
    
    return {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { 
            content: '📄 ' + fileName + ' (' + fileSize + ') - File could not be embedded' 
          }
        }]
      }
    };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Find the best property match based on type and name keywords
   */
  findBestPropertyMatch(databaseProperties, allowedTypes, keywords) {
    var availableProps = Object.keys(databaseProperties);
    
    // First pass: exact keyword matches
    for (var i = 0; i < availableProps.length; i++) {
      var propName = availableProps[i];
      var prop = databaseProperties[propName];
      
      // Check if property type matches
      if (allowedTypes.indexOf(prop.type) === -1) {
        continue;
      }
      
      // Check if property name contains any keywords
      var propNameLower = propName.toLowerCase();
      for (var j = 0; j < keywords.length; j++) {
        if (propNameLower.indexOf(keywords[j].toLowerCase()) !== -1) {
          return propName;
        }
      }
    }
    
    // Second pass: first property of allowed type
    for (var k = 0; k < availableProps.length; k++) {
      var propName = availableProps[k];
      var prop = databaseProperties[propName];
      if (allowedTypes.indexOf(prop.type) !== -1) {
        return propName;
      }
    }
    
    return null;
  }

  /**
   * Format property value for Notion API
   */
  formatPropertyValue(value, propertyType) {
    if (!value) return null;
    
    const stringValue = String(value);
    
    switch (propertyType) {
      case 'title':
        return { title: [{ text: { content: stringValue.substring(0, 2000) } }] };
      
      case 'rich_text':
        return { rich_text: [{ text: { content: stringValue.substring(0, 2000) } }] };
      
      case 'url':
        let urlValue = stringValue;
        if (!urlValue.startsWith('http://') && !urlValue.startsWith('https://') && urlValue.includes('.')) {
          urlValue = 'https://' + urlValue;
        }
        return { url: urlValue };
      
      case 'date':
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : { date: { start: date.toISOString() } };
      
      case 'number':
        const num = Number(value);
        return isNaN(num) ? null : { number: num };
      
      case 'select':
        return { select: { name: stringValue.substring(0, 100) } };
      
      case 'multi_select':
        const options = Array.isArray(value) ? value : [value];
        const selectOptions = options.map(function(opt) { return { name: String(opt).substring(0, 100) }; });
        return { multi_select: selectOptions };
      
      default:
        // Default to rich_text for unknown types
        return { rich_text: [{ text: { content: stringValue.substring(0, 2000) } }] };
    }
  }

  /**
   * Add email body as Notion block children - WITH COMPREHENSIVE DEBUGGING
   */
  addEmailBodyAsBlocks(pageId, emailBody) {
    try {
      console.log('🚀 START: addEmailBodyAsBlocks');
      console.log('📄 Page ID: ' + pageId);
      console.log('📝 Email body length: ' + (emailBody ? emailBody.length : 0));
      
      if (!pageId) {
        throw new Error('No page ID provided for block addition');
      }
      
      if (!emailBody || emailBody.trim().length === 0) {
        console.log('⚠️ No email body content to add as blocks');
        return 0;
      }
      
      const notionService = new NotionService();
      const blocks = this.convertEmailBodyToBlocks(emailBody);
      
      console.log('📦 Created ' + blocks.length + ' blocks from email body');
      
      if (blocks.length === 0) {
        console.log('⚠️ No blocks generated from email body');
        return 0;
      }
      
      console.log('🔍 Blocks to append: ' + JSON.stringify(blocks.slice(0, 2), null, 2)); // Log first 2 blocks
      
      console.log('🚀 Calling appendBlockChildren...');
      const result = notionService.appendBlockChildren(pageId, blocks);
      console.log('✅ Blocks appended successfully');
      console.log('📊 Append result: ' + JSON.stringify(result));
      
      return blocks.length;
      
    } catch (error) {
      console.error('❌ FAILED: addEmailBodyAsBlocks');
      console.error('Error message: ' + error.message);
      console.error('Error stack: ' + error.stack);
      return 0;
    }
  }

  /**
   * Convert email body text to Notion block objects
   */
  convertEmailBodyToBlocks(emailBody) {
    const blocks = [];
    
    if (!emailBody || emailBody.trim().length === 0) {
      return blocks;
    }
    
    // Clean the email body first
    const cleanBody = this.cleanEmailBody(emailBody);
    
    // Add a header block first
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{
          type: 'text',
          text: { content: '📧 Email Content' }
        }]
      }
    });
    
    // Add a divider
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });
    
    // Split into paragraphs (empty lines indicate paragraph breaks)
    const paragraphs = cleanBody.split(/\n\s*\n/);
    
    console.log('📝 Processing ' + paragraphs.length + ' paragraphs from email body');
    
    // Convert each paragraph to a block
    paragraphs.forEach(function(paragraph, index) {
      const trimmedParagraph = paragraph.trim();
      
      if (trimmedParagraph.length > 0) {
        // Skip very short paragraphs that are likely artifacts
        if (trimmedParagraph.length < 10 && 
            (trimmedParagraph === '--' || trimmedParagraph === '---' || trimmedParagraph.includes('wrote:'))) {
          return;
        }
        
        // Create a paragraph block for each meaningful paragraph
        blocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: trimmedParagraph }
            }]
          }
        });
      }
    });
    
    // If we have no meaningful blocks (only header and divider), create at least one
    if (blocks.length <= 2 && cleanBody.length > 0) {
      const content = cleanBody.substring(0, 2000);
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: content }
          }]
        }
      });
    }
    
    console.log('✅ Created ' + blocks.length + ' total blocks (including header and divider)');
    return blocks;
  }

  /**
   * Enhanced email body cleaning for block conversion
   */
  cleanEmailBody(body) {
    if (!body) return '';
    
    let cleanBody = body
      // Remove Gmail-specific artifacts
      .replace(/msg-a:r\d+/g, '')
      // Remove email headers and quotes (but be less aggressive)
      .replace(/On\s+.+?wrote:.*$/gs, '')
      .replace(/^>+/gm, '') // Remove quote markers
      // Remove signatures (but keep important content)
      .replace(/--\s*$/m, '')
      .replace(/^\s*--\s*$/m, '')
      // Clean up whitespace
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    
    return cleanBody;
  }

 /**
 * Enhanced email data retrieval - UNCOMMENT THIS METHOD
 */
getSelectedEmailWithRecovery(e) {  // Remove the comment block starting at line 453
  try {
    console.log('📧 Retrieving email data...');
    
    if (!e || !e.gmail) {
      throw new Error('No Gmail context available');
    }

    const messageId = e.gmail.messageId;
    if (!messageId) {
      throw new Error('No message ID found');
    }

    console.log('🔍 Fetching message: ' + messageId);
    
    let message;
    try {
      // Use GmailApp directly (most reliable method)
      message = GmailApp.getMessageById(messageId);
    } catch (error) {
      console.error('❌ GmailApp failed: ' + error);
      throw new Error('Cannot access this email. Please ensure the add-on has Gmail permissions.');
    }

    if (!message) {
      throw new Error('Email message not found');
    }

    // Extract email data
    const emailData = {
      id: messageId,
      subject: message.getSubject() || 'No Subject',
      from: message.getFrom() || 'Unknown Sender',
      to: message.getTo() || '',
      cc: message.getCc() || '',
      dateSent: message.getDate() || new Date(),
      body: this.extractEmailBody(message),
      attachments: this.extractAttachments(message),
      threadId: message.getThread().getId(),
      gmailLink: this.getGmailLink(messageId)
    };

    console.log('✅ Email data retrieved:', {
      subject: emailData.subject.substring(0, 50),
      bodyLength: emailData.body ? emailData.body.length : 0,
      hasBody: !!emailData.body && emailData.body.length > 10
    });

    return emailData;

  } catch (error) {
    console.error('❌ Email retrieval failed: ' + error);
    return this.createFallbackEmailData(e, error.message);
  }
}
 
  /**
   * Extract email body
   */
  extractEmailBody(message) {
    try {
      let body = '';
      
      // Try plain body first
      try {
        body = message.getPlainBody();
        if (body && body.trim().length > 10) {
          console.log('✅ Using plain body, length: ' + body.length);
          return body;
        }
      } catch (error) {
        console.log('Plain body failed: ' + error.message);
      }
      
      // Try HTML body as fallback
      try {
        body = message.getBody();
        if (body && body.trim().length > 10) {
          console.log('✅ Using HTML body, length: ' + body.length);
          const plainBody = body
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          return plainBody;
        }
      } catch (error) {
        console.log('HTML body failed: ' + error.message);
      }
      
      console.log('⚠️ No email body content could be extracted');
      return 'Email content extracted but empty. This email may have no body content.';
      
    } catch (error) {
      console.error('Body extraction failed completely: ' + error);
      return 'Email content unavailable due to technical issues.';
    }
  }

  /**
   * Get Gmail link
   */
  getGmailLink(messageId) {
    try {
      // Try to use constants if available
      if (this.constants && this.constants.GMAIL && this.constants.GMAIL.GMAIL_LINK_BASE) {
        return this.constants.GMAIL.GMAIL_LINK_BASE + messageId;
      }
    } catch (error) {
      console.log('Could not load constants for Gmail link, using fallback');
    }
    
    // Fallback
    return 'https://mail.google.com/mail/u/0/#inbox/' + messageId;
  }

  /**
   * Extract attachments
   */
  extractAttachments(message) {
    try {
      const attachments = message.getAttachments();
      return attachments.map(function(att) {
        return {
          name: att.getName(),
          size: att.getSize()
        };
      });
    } catch (error) {
      console.error('Error extracting attachments: ' + error);
      return [];
    }
  }

  /**
   * Create fallback data with sample attachments for testing
   */
  createFallbackEmailData(e, errorMessage) {
    console.log('🔄 Creating enhanced fallback email data with sample attachments...');
    
    const fallbackData = {
      id: (e && e.gmail && e.gmail.messageId) ? e.gmail.messageId : 'unknown',
      subject: (e && e.gmail && e.gmail.subject) ? e.gmail.subject : 'Test Email with Attachments',
      from: (e && e.gmail && e.gmail.from) ? e.gmail.from : 'test@example.com',
      to: '',
      cc: '',
      dateSent: new Date(),
      body: 'Email content unavailable: ' + errorMessage + '. This is using fallback data with sample attachments for testing.',
      attachments: [
        { name: 'HouseCheck Banner jpeg.jpg', size: 1500000 },
        { name: 'Document.pdf', size: 2500000 },
        { name: 'Spreadsheet.xlsx', size: 1800000 },
        { name: 'Presentation.pptx', size: 3200000 }
      ],
      threadId: (e && e.gmail && e.gmail.threadId) ? e.gmail.threadId : 'unknown',
      gmailLink: this.getGmailLink((e && e.gmail && e.gmail.messageId) ? e.gmail.messageId : '')
    };
    
    console.log('✅ Created fallback data with ' + fallbackData.attachments.length + ' sample attachments');
    return fallbackData;
  }

  /**
   * Legacy method for compatibility
   */
  getSelectedEmail(e) {
    return this.getSelectedEmailWithRecovery(e);
  }

  /**
   * Legacy method for compatibility
   */
  getSelectedEmailSafe(e) {
    return this.getSelectedEmailWithRecovery(e);
  }
}

// =============================================================================
// GLOBAL WRAPPER FUNCTIONS
// =============================================================================

let emailServiceInstance = null;

/**
 * Get EmailService instance (singleton pattern)
 */
function getEmailService() {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

/**
 * Get GmailService for backward compatibility
 */
function getGmailService() {
  return getEmailService();
}


/**
 * Get selected email safe (legacy)
 */
function getSelectedEmailSafe(e) {
  const service = getEmailService();
  return service.getSelectedEmailSafe(e);
}

/**
 * Get selected email (legacy)
 */
function getSelectedEmail(e) {
  const service = getEmailService();
  return service.getSelectedEmail(e);
}

/**
 * Comprehensive debug for database and mapping issues
 */
function debugDatabaseAndMappings() {
  try {
    const config = getEnhancedG2NConfig();
    const notionService = new NotionService();
    
    console.log('🔍 COMPREHENSIVE DEBUG - Database & Mappings:');
    
    // Current configuration
    const currentDb = {
      id: config.DATABASES.gmail.id,
      name: config.DATABASES.gmail.name
    };
    
    // Get actual database info from Notion
    let actualDbInfo = {};
    try {
      const database = notionService.verifyG2NDatabaseAccess(currentDb.id);
      actualDbInfo = {
        name: (database.title && database.title[0] && database.title[0].plain_text) ? database.title[0].plain_text : 'Unknown',
        properties: Object.keys(database.properties || {}),
        propertyCount: Object.keys(database.properties || {}).length
      };
    } catch (error) {
      actualDbInfo = { error: error.message };
    }
    
    // Mapping analysis
    const mappings = (config.PROPERTY_MAPPINGS && config.PROPERTY_MAPPINGS.mappings) ? config.PROPERTY_MAPPINGS.mappings : {};
    const mappingAnalysis = {};
    
    for (const dbId in mappings) {
      if (mappings.hasOwnProperty(dbId)) {
        const dbMappings = mappings[dbId];
        mappingAnalysis[dbId] = {
          mappingCount: Object.keys(dbMappings).length,
          mappings: dbMappings
        };
      }
    }
    
    const debugInfo = {
      currentConfiguredDb: currentDb,
      actualDbFromNotion: actualDbInfo,
      allMappings: mappingAnalysis,
      mappingsForCurrentDb: mappings[currentDb.id] || 'none',
      hasMappingsForCurrentDb: !!mappings[currentDb.id]
    };
    
    console.log('📊 DEBUG INFO: ' + JSON.stringify(debugInfo));
    
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('🔍 Database & Mappings Debug'))
      .addSection(CardService.newCardSection()
        .setHeader('Current Configuration')
        .addWidget(CardService.newKeyValue()
          .setTopLabel("Configured Database")
          .setContent(currentDb.name + ' (' + currentDb.id + ')'))
        .addWidget(CardService.newKeyValue()
          .setTopLabel("Actual Database Name")
          .setContent(actualDbInfo.name || 'Error'))
        .addWidget(CardService.newKeyValue()
          .setTopLabel("Database Properties")
          .setContent((actualDbInfo.propertyCount || 0) + ' properties'))
        .addWidget(CardService.newKeyValue()
          .setTopLabel("Mappings Configured")
          .setContent(debugInfo.hasMappingsForCurrentDb ? '✅ Yes' : '❌ No')))
      .addSection(CardService.newCardSection()
        .setHeader('Actions')
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText('📧 Test Save')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('quickG2NSaveEmail')))
          .addButton(CardService.newTextButton()
            .setText('⚙️ Configure Mappings')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('showG2NAdvancedMapping')))
          .addButton(CardService.newTextButton()
            .setText('🔄 Refresh Debug')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('debugDatabaseAndMappings')))))
      .build();
      
  } catch (error) {
    console.error('Debug failed: ' + error);
    return CardService.newCardBuilder()
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Debug error: ' + error.message)))
      .build();
  }
}

/**
 * Debug which database is actually being used for saving
 */
function debugSaveDatabase() {
  try {
    const config = getEnhancedG2NConfig();
    
    console.log('🔍 DEBUG - Current Database Configuration:', {
      configuredGmailDb: {
        id: config.DATABASES.gmail.id,
        name: config.DATABASES.gmail.name
      },
      propertyMappings: config.PROPERTY_MAPPINGS && config.PROPERTY_MAPPINGS.mappings ? 
        Object.keys(config.PROPERTY_MAPPINGS.mappings) : 'none',
      mappingsForCurrentDb: (config.PROPERTY_MAPPINGS && config.PROPERTY_MAPPINGS.mappings && config.PROPERTY_MAPPINGS.mappings[config.DATABASES.gmail.id]) ? config.PROPERTY_MAPPINGS.mappings[config.DATABASES.gmail.id] : 'none'
    });
    
    // Test which database the email would save to
    const notionService = new NotionService();
    const currentDb = notionService.verifyG2NDatabaseAccess(config.DATABASES.gmail.id);
    
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('🔍 Save Database Debug'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Configured Database: ' + config.DATABASES.gmail.name))
        .addWidget(CardService.newTextParagraph()
          .setText('Database ID: ' + config.DATABASES.gmail.id))
        .addWidget(CardService.newTextParagraph()
          .setText('Mappings exist: ' + !!(config.PROPERTY_MAPPINGS && config.PROPERTY_MAPPINGS.mappings && config.PROPERTY_MAPPINGS.mappings[config.DATABASES.gmail.id])))
        .addWidget(CardService.newTextParagraph()
          .setText('Actual DB name from Notion: ' + ((currentDb.title && currentDb.title[0] && currentDb.title[0].plain_text) ? currentDb.title[0].plain_text : 'Unknown'))))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText('📧 Test Save')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('quickG2NSaveEmail')))
          .addButton(CardService.newTextButton()
            .setText('⚙️ Check Mappings')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('showG2NAdvancedMapping')))))
      .build();
      
  } catch (error) {
    console.error('Debug failed: ' + error);
    return CardService.newCardBuilder()
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Debug error: ' + error.message)))
      .build();
  }
}

/**
 * List all available databases
 */
function listAllDatabases() {
  try {
    console.log('🗄️ Fetching all databases...');
    
    const notionService = new NotionService();
    const databases = notionService.fetchG2NDatabasesWithCache();
    
    console.log('✅ Found ' + databases.length + ' databases:');
    
    databases.forEach(function(db, index) {
      const dbName = (db.title && db.title[0] && db.title[0].plain_text) ? db.title[0].plain_text : 'Untitled';
      console.log((index + 1) + '. ' + dbName + ' - ' + db.id);
    });
    
    // Build a card showing all databases
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('🗄️ Your Notion Databases'))
      .addSection(CardService.newCardSection()
        .setHeader('Found ' + databases.length + ' databases:'));
    
    databases.forEach(function(db, index) {
      const dbName = (db.title && db.title[0] && db.title[0].plain_text) ? db.title[0].plain_text : 'Untitled';
      card.addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('**' + dbName + '**'))
        .addWidget(CardService.newTextParagraph()
          .setText('ID: ' + db.id))
        .addWidget(CardService.newTextParagraph()
          .setText('URL: ' + (db.url ? db.url.replace('https://', '') : 'No URL'))));
    });
    
    card.addSection(CardService.newCardSection()
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('🔄 Refresh List')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('listAllDatabases')))));
    
    return card.build();
    
  } catch (error) {
    console.error('Failed to list databases: ' + error);
    return CardService.newCardBuilder()
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText('Error: ' + error.message)))
      .build();
  }
}