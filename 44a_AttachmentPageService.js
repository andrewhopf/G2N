/**
 * @fileoverview Attachment page service
 * @description Creates attachment pages in the attachment database
 */

/**
 * Attachment Page Service
 * @class AttachmentPageService
 */
class AttachmentPageService {
  /**
   * @param {NotionAdapter} notionAdapter
   * @param {MappingService} mappingService
   * @param {AttachmentDatabaseService} databaseService
   * @param {AttachmentService} attachmentService
   * @param {ConfigRepository} configRepo
   * @param {Logger} logger
   */
  constructor(notionAdapter, mappingService, databaseService, attachmentService, configRepo, logger) {
    this._notion = notionAdapter;
    this._mapping = mappingService;
    this._database = databaseService;
    this._attachments = attachmentService;
    this._config = configRepo;
    this._logger = logger;
  }

  /**
   * Create attachment pages for an email
   * @param {EmailData} emailData
   * @returns {{created: number, skipped: number, pages: Array}}
   */
  createPagesFromEmail(emailData) {
    const config = this._config.getAll();

    if (!config.apiKey || !config.attachmentDatabaseId) {
      this._logger.debug('Attachment save skipped - no attachment database configured');
      return { created: 0, skipped: 0, pages: [] };
    }

    if (!emailData) {
      this._logger.info('Attachment save skipped - no email data');
      return { created: 0, skipped: 0, pages: [] };
    }

    if (config.fileHandling === 'skip') {
      this._logger.info('Attachment save skipped by settings');
      return { created: 0, skipped: emailData.attachmentCount || 0, pages: [] };
    }

    const schema = this._database.getCurrentSchema();
    if (!schema) {
      this._logger.warn('Attachment schema unavailable, skipping attachment save');
      return { created: 0, skipped: emailData.attachmentCount || 0, pages: [] };
    }

    const createdPages = [];
    const sourceAttachments = this._attachments.getAttachmentsForMessage(
      emailData.messageId,
      emailData.attachments || []
    );
    const attachments = this._attachments.filterSelectedAttachments(
      sourceAttachments,
      emailData.messageId
    );

    this._logger.info('Attachment selection summary', {
      messageId: emailData.messageId,
      total: sourceAttachments.length,
      selected: attachments.length
    });

    if (attachments.length === 0) {
      this._logger.info('Attachment save skipped - no attachments available', {
        messageId: emailData.messageId
      });
      return { created: 0, skipped: emailData.attachmentCount || 0, pages: [] };
    }

    attachments.forEach((attachment, index) => {
      try {
        const attachmentData = new AttachmentData(emailData, attachment, {
          attachmentIndex: index
        });

        const mappingResult = this._mapping.applyMappings(attachmentData, config.apiKey);
        let properties = mappingResult.properties || {};

        properties = this._filterPropertiesBySchema(properties, schema);
        properties = this._ensureTitle(properties, schema, attachmentData);
        properties = this._ensureGmailLinkProperty(properties, schema, emailData.gmailLinkUrl, config);

        this._logger.debug('Attachment page properties', {
          attachment: attachmentData.getValue('attachmentName'),
          propertyNames: Object.keys(properties)
        });

        const page = this._notion.createPage(
          config.attachmentDatabaseId,
          properties,
          [],
          config.apiKey
        );

        createdPages.push(page);
      } catch (error) {
        this._logger.warn('Attachment page creation failed', {
          name: attachment?.getName ? attachment.getName() : 'Unknown',
          error: error.message
        });
      }
    });

    return {
      created: createdPages.length,
      skipped: attachments.length - createdPages.length,
      pages: createdPages
    };
  }

  /**
   * Filter properties to those in schema
   * @private
   */
  _filterPropertiesBySchema(properties, schema) {
    try {
      const propNames = (schema.properties || []).map(p => p.name);
      const allowedNames = new Set(propNames);
      const filtered = {};

      Object.entries(properties).forEach(([propName, propValue]) => {
        if (allowedNames.has(propName)) {
          filtered[propName] = propValue;
        }
      });

      return filtered;
    } catch (e) {
      return properties;
    }
  }

  /**
   * Ensure a title property exists
   * @private
   */
  _ensureTitle(properties, schema, attachmentData) {
    if (Object.values(properties).some(p => p && p.title)) {
      return properties;
    }

    const titleProp = (schema.properties || []).find(p => p.type === 'title');
    if (!titleProp || !titleProp.name) {
      return properties;
    }

    const titleText = attachmentData.getValue('attachmentName') || 'Attachment';
    return {
      ...properties,
      [titleProp.name]: {
        title: [
          {
            type: 'text',
            text: { content: String(titleText).substring(0, 2000) }
          }
        ]
      }
    };
  }

  /**
   * Add Gmail link if the database has a matching URL property
   * @private
   */
  _maybeAddGmailLink(properties, schema, gmailLinkUrl) {
    if (!gmailLinkUrl) return properties;

    const urlProp = (schema.properties || []).find(
      p => p.type === 'url' && p.name === 'Gmail Link'
    );
    if (!urlProp) return properties;

    return {
      ...properties,
      [urlProp.name]: { url: gmailLinkUrl }
    };
  }

  /**
   * Ensure Gmail Link URL property exists, then add value
   * @private
   */
  _ensureGmailLinkProperty(properties, schema, gmailLinkUrl, config) {
    if (!gmailLinkUrl) return properties;

    const urlProp = (schema.properties || []).find(
      p => p.type === 'url' && p.name === 'Gmail Link'
    );
    if (urlProp && urlProp.name) {
      return {
        ...properties,
        [urlProp.name]: { url: gmailLinkUrl }
      };
    }

    try {
      const updated = this._notion.ensureUrlProperty(
        config.attachmentDatabaseId,
        'Gmail Link',
        config.apiKey
      );
      if (updated) {
        return {
          ...properties,
          ['Gmail Link']: { url: gmailLinkUrl }
        };
      }
    } catch (error) {
      this._logger.warn('Failed to ensure Gmail Link property for attachments', error.message);
    }

    return properties;
  }
}
