// PropertyMapper.gs - COMPLETE WORKING VERSION WITHOUT DUPLICATES
class PropertyMapper {
  constructor() {
    this.gmailFields = this.getAvailableGmailFields();
    this.constants = getAppConstants();
  }

  /**
   * Available Gmail fields for mapping
   */
  getAvailableGmailFields() {
    return [
      // === DIRECT MAPPINGS ===
      { label: 'Gmail Link', value: 'gmailLink', type: 'url', description: 'Direct link to email in Gmail' },
      { label: 'Message ID', value: 'messageId', type: 'rich_text', description: 'Unique Gmail message ID' },
      { label: 'Table ID', value: 'tableId', type: 'rich_text', description: 'Inbox/Sent identifier' },
      
      // === PAYLOAD FIELDS ===
      { label: 'Email Subject', value: 'subject', type: 'title', description: 'The email subject line' },
      { label: 'Email Body', value: 'body', type: 'rich_text', description: 'Full email content' },
      { label: 'Date Sent', value: 'dateSent', type: 'date', description: 'When the email was sent' },
      { label: 'To Recipients', value: 'to', type: 'rich_text', description: 'Who the email was sent to' },
      { label: 'From Sender', value: 'from', type: 'rich_text', description: 'Who sent the email' },
      { label: 'Sender Name', value: 'senderName', type: 'rich_text', description: 'Name of the sender' },
      { label: 'Sender Email', value: 'senderEmail', type: 'email', description: 'Email address of the sender' },
      { label: 'CC Recipients', value: 'cc', type: 'rich_text', description: 'CC recipients' },
      
      // === ATTACHMENTS FIELD ===
      { label: 'Attachments', value: 'attachments', type: 'files', description: 'Email attachments to embed' }
    ];
  }

  /**
   * Categorize Notion properties into three sections
   */
  categorizeProperties(properties) {
    const categorized = {
      mappable: [],    // Can be mapped to email fields
      selectable: [],  // User can select from existing options
      displayOnly: []  // Read-only, cannot be mapped
    };

    Object.entries(properties).forEach(([propName, prop]) => {
      const propertyInfo = {
        key: propName,
        name: prop.name || propName,
        type: prop.type,
        property: prop
      };

      switch (prop.type) {
        // === MAPPABLE FIELDS ===
        case 'title':
        case 'rich_text':
        case 'url':
        case 'email':
        case 'date':
        case 'number':
        case 'phone_number':
          categorized.mappable.push(propertyInfo);
          break;

        // === SELECTABLE FIELDS ===
        case 'select':
        case 'multi_select':
        case 'checkbox':
        case 'status':
        case 'people':
        case 'relation':
          categorized.selectable.push(propertyInfo);
          break;

        // === DISPLAY ONLY FIELDS ===
        case 'rollup':
        case 'formula':
        case 'created_by':
        case 'last_edited_by':
        case 'created_time':
        case 'last_edited_time':
        case 'unique_id':
          categorized.displayOnly.push(propertyInfo);
          break;

        default:
          categorized.displayOnly.push(propertyInfo);
          break;
      }
    });

    console.log('📊 Property categorization:', {
      mappable: categorized.mappable.length,
      selectable: categorized.selectable.length,
      displayOnly: categorized.displayOnly.length
    });

    return categorized;
  }

  /**
   * Group selectable fields by type for better organization
   */
  groupSelectableByType(selectableProperties) {
    const grouped = {
      relations: [],
      dropdowns: [],
      multiselect: [],
      status: [],
      people: []
    };

    selectableProperties.forEach(prop => {
      switch (prop.type) {
        case 'relation':
          grouped.relations.push(prop);
          break;
        case 'select':
          grouped.dropdowns.push(prop);
          break;
        case 'multi_select':
          grouped.multiselect.push(prop);
          break;
        case 'status':
        case 'checkbox':
          grouped.status.push(prop);
          break;
        case 'people':
          grouped.people.push(prop);
          break;
        default:
          grouped.dropdowns.push(prop);
          break;
      }
    });

    console.log('📊 Grouped selectable fields:', {
      relations: grouped.relations.length,
      dropdowns: grouped.dropdowns.length,
      multiselect: grouped.multiselect.length,
      status: grouped.status.length,
      people: grouped.people.length
    });

    return grouped;
  }

  /**
   * Create mapping interface - main method
   */
  createMappingInterface(databaseId, currentMappings = {}, emailAttachments = []) {
    console.log('🔧 Creating mapping interface for database:', databaseId);
    return this.createTabbedMappingInterface(databaseId, currentMappings, emailAttachments);
  }

  /**
   * Create tabbed mapping interface with categorized properties
   */
  createTabbedMappingInterface(databaseId, currentMappings = {}, emailAttachments = []) {
    try {
      console.log('🗂️ Creating tabbed mapping interface for database:', databaseId);
      
      if (!databaseId) {
        throw new Error('No database ID provided');
      }

      const notionService = new NotionService();
      let database;
      
      try {
        console.log('🔍 Attempting to access database...');
        database = notionService.verifyG2NDatabaseAccess(databaseId);
        const dbName = database.title?.[0]?.plain_text || 'Unknown Database';
        console.log('✅ Database access verified:', dbName);
      } catch (dbError) {
        console.error('❌ Database access failed:', dbError.message);
        throw new Error(`Cannot access database: ${dbError.message}. Please check database permissions.`);
      }

      const properties = database.properties || {};
      console.log('📋 Database properties found:', Object.keys(properties).length);

      // Categorize properties
      const categorizedProperties = this.categorizeProperties(properties);

      // Create main card
      const card = CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
          .setTitle('🗂️ Property Mapping Configuration'));

      // Add database info
      const dbName = database.title?.[0]?.plain_text || 'Unknown Database';
      card.addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText(`Mapping fields for: <b>${dbName}</b>`))
        .addWidget(CardService.newTextParagraph()
          .setText('Configure how email data maps to your Notion database properties:')));

      // =========================================================================
      // MAPPABLE FIELDS SECTION
      // =========================================================================
      const mappableSection = CardService.newCardSection()
        .setHeader('📋 Mappable Fields')
        .setCollapsible(true)
        .setNumUncollapsibleWidgets(2);

      mappableSection.addWidget(CardService.newTextParagraph()
        .setText('<i>Map email fields directly to database properties</i>'));

      if (categorizedProperties.mappable.length > 0) {
        this.gmailFields.forEach(gmailField => {
          if (gmailField.value !== 'attachments') {
            this.addPropertyMappingDropdown(mappableSection, gmailField, categorizedProperties.mappable, currentMappings);
          }
        });
      } else {
        mappableSection.addWidget(CardService.newTextParagraph()
          .setText('❌ No mappable properties found in this database.'));
      }

      card.addSection(mappableSection);

      // =========================================================================
      // ATTACHMENTS CONFIGURATION
      // =========================================================================
      if (emailAttachments && emailAttachments.length > 0) {
        const attachmentsSection = CardService.newCardSection()
          .setHeader('📎 Attachments Configuration')
          .setCollapsible(true)
          .setNumUncollapsibleWidgets(2);

        attachmentsSection.addWidget(CardService.newTextParagraph()
          .setText('<i>Select which attachments to embed in the Notion page</i>'));

        emailAttachments.forEach((attachment, index) => {
          attachmentsSection.addWidget(CardService.newSelectionInput()
            .setFieldName(`attachment_${index}`)
            .setTitle(`📎 ${attachment.name}`)
            .setType(CardService.SelectionInputType.CHECK_BOX)
            .addItem(`Embed this attachment (${this.formatFileSize(attachment.size)})`, 'embed', true));
        });

        card.addSection(attachmentsSection);
      }

      // =========================================================================
      // SELECTABLE FIELDS - GROUPED BY TYPE
      // =========================================================================
      if (categorizedProperties.selectable.length > 0) {
        const groupedSelectable = this.groupSelectableByType(categorizedProperties.selectable);

        // Relations
        if (groupedSelectable.relations && groupedSelectable.relations.length > 0) {
          const relationsSection = CardService.newCardSection()
            .setHeader('🔗 Relations')
            .setCollapsible(true)
            .setNumUncollapsibleWidgets(2);

          relationsSection.addWidget(CardService.newTextParagraph()
            .setText('<i>Link to related pages in other databases</i>'));

          groupedSelectable.relations.forEach(prop => {
            this.addSelectableFieldInput(relationsSection, prop, currentMappings);
          });

          card.addSection(relationsSection);
        }

        // Dropdowns & Selects
        if (groupedSelectable.dropdowns && groupedSelectable.dropdowns.length > 0) {
          const dropdownsSection = CardService.newCardSection()
            .setHeader('🔘 Dropdowns & Selects')
            .setCollapsible(true)
            .setNumUncollapsibleWidgets(2);

          dropdownsSection.addWidget(CardService.newTextParagraph()
            .setText('<i>Single-select dropdown fields</i>'));

          groupedSelectable.dropdowns.forEach(prop => {
            this.addSelectableFieldInput(dropdownsSection, prop, currentMappings);
          });

          card.addSection(dropdownsSection);
        }

        // Multi-Select & Tags
        if (groupedSelectable.multiselect && groupedSelectable.multiselect.length > 0) {
          const multiselectSection = CardService.newCardSection()
            .setHeader('🏷️ Multi-Select & Tags')
            .setCollapsible(true)
            .setNumUncollapsibleWidgets(2);

          multiselectSection.addWidget(CardService.newTextParagraph()
            .setText('<i>Multi-select tag fields</i>'));

          groupedSelectable.multiselect.forEach(prop => {
            this.addSelectableFieldInput(multiselectSection, prop, currentMappings);
          });

          card.addSection(multiselectSection);
        }

        // Status & Checkboxes
        if (groupedSelectable.status && groupedSelectable.status.length > 0) {
          const statusSection = CardService.newCardSection()
            .setHeader('🟡 Status & Checkboxes')
            .setCollapsible(true)
            .setNumUncollapsibleWidgets(2);

          statusSection.addWidget(CardService.newTextParagraph()
            .setText('<i>Status indicators and boolean fields</i>'));

          groupedSelectable.status.forEach(prop => {
            this.addSelectableFieldInput(statusSection, prop, currentMappings);
          });

          card.addSection(statusSection);
        }

        // People
        if (groupedSelectable.people && groupedSelectable.people.length > 0) {
          const peopleSection = CardService.newCardSection()
            .setHeader('👥 People')
            .setCollapsible(true)
            .setNumUncollapsibleWidgets(2);

          peopleSection.addWidget(CardService.newTextParagraph()
            .setText('<i>Assign to workspace members</i>'));

          groupedSelectable.people.forEach(prop => {
            this.addSelectableFieldInput(peopleSection, prop, currentMappings);
          });

          card.addSection(peopleSection);
        }
      }

      // =========================================================================
      // DISPLAY ONLY FIELDS
      // =========================================================================
      if (categorizedProperties.displayOnly.length > 0) {
        const displaySection = CardService.newCardSection()
          .setHeader('👁️ Display Only Fields')
          .setCollapsible(true)
          .setNumUncollapsibleWidgets(1);

        displaySection.addWidget(CardService.newTextParagraph()
          .setText('<i>These fields are automatically managed by Notion</i>'));

        categorizedProperties.displayOnly.forEach(prop => {
          displaySection.addWidget(CardService.newTextParagraph()
            .setText(`• <b>${prop.name}</b> (${prop.type})`));
        });

        card.addSection(displaySection);
      }

      // =========================================================================
      // ACTION BUTTONS
      // =========================================================================
      const actionSection = CardService.newCardSection()
        .setHeader('Actions');

      actionSection.addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText('💾 Save Mapping Configuration')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('saveAdvancedMapping')
            .setParameters({ databaseId: databaseId })))
        .addButton(CardService.newTextButton()
          .setText('🔄 Auto-Detect Mappings')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('autoDetectMapping')
            .setParameters({ databaseId: databaseId })))
        .addButton(CardService.newTextButton()
          .setText('📧 Back to Email')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onG2NGmailMessage'))));

      card.addSection(actionSection);

      return card.build();

    } catch (error) {
      console.error('❌ Failed to create tabbed mapping interface:', error);
      return this.createErrorCard(error);
    }
  }

  /**
   * Create error card for mapping failures
   */
  createErrorCard(error) {
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('❌ Mapping Error'))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph()
          .setText(`Error: ${error.message}`))
        .addWidget(CardService.newTextParagraph()
          .setText('Please try again or check the console for details.')))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText('📧 Back to Email')
            .setOnClickAction(CardService.newAction()
              .setFunctionName('onG2NGmailMessage')))))
      .build();
  }

  /**
   * Add property mapping dropdown for mappable fields
   */
  addPropertyMappingDropdown(section, gmailField, notionProperties, currentMappings) {
    try {
      const dropdown = CardService.newSelectionInput()
        .setFieldName(`gmail_${gmailField.value}`)
        .setTitle(`${gmailField.label}`)
        .setType(CardService.SelectionInputType.DROPDOWN);

      const currentMapping = currentMappings[gmailField.value];
      const hasCurrentMapping = currentMapping && currentMapping !== 'none';
      
      dropdown.addItem("-- Don't map --", 'none', !hasCurrentMapping);

      let addedCount = 0;
      const addedKeys = new Set();
      
      notionProperties.forEach(notionProp => {
        if (this.isPropertyTypeCompatible(gmailField.type, notionProp.type)) {
          if (!addedKeys.has(notionProp.key)) {
            addedKeys.add(notionProp.key);
            
            const isSelected = currentMapping === notionProp.key;
            const displayText = `${notionProp.name} (${notionProp.type})`;
            
            dropdown.addItem(displayText, notionProp.key, isSelected);
            addedCount++;
          }
        }
      });

      if (addedCount === 0) {
        dropdown.addItem('No compatible properties available', 'none', true);
      }

      section.addWidget(dropdown);
      
    } catch (error) {
      console.error('❌ Error adding property mapping dropdown:', error);
      section.addWidget(CardService.newTextParagraph()
        .setText(`Error creating mapping for ${gmailField.label}: ${error.message}`));
    }
  }

  /**
   * Check if property types are compatible
   */
  isPropertyTypeCompatible(gmailFieldType, notionPropertyType) {
    const compatibilityMap = {
      'title': ['title'],
      'rich_text': ['rich_text', 'title'],
      'url': ['url'],
      'email': ['email'],
      'date': ['date'],
      'number': ['number'],
      'phone_number': ['phone_number'],
      'files': ['files']
    };

    const compatibleTypes = compatibilityMap[gmailFieldType] || [gmailFieldType];
    return compatibleTypes.includes(notionPropertyType);
  }

  /**
   * Add input for selectable fields
   */
  addSelectableFieldInput(section, notionProp, currentMappings) {
    try {
      const fieldName = `selectable_${notionProp.key}`;
      const currentValue = currentMappings[fieldName];

      const typeIcons = {
        'select': '🔘',
        'multi_select': '🏷️', 
        'checkbox': '☑️',
        'status': '🟡',
        'people': '👥',
        'relation': '🔗'
      };

      const icon = typeIcons[notionProp.type] || '•';

      switch (notionProp.type) {
        case 'select':
          this.addSelectDropdown(section, notionProp, currentValue);
          break;
        case 'multi_select':
          this.addMultiSelectCheckboxes(section, notionProp, currentValue);
          break;
        case 'checkbox':
          this.addCheckboxInput(section, notionProp, currentValue);
          break;
        case 'status':
          this.addStatusDropdown(section, notionProp, currentValue);
          break;
        case 'people':
          section.addWidget(CardService.newTextParagraph()
            .setText(`• <b>${notionProp.name}</b> (People) - Select workspace members`));
          break;
        case 'relation':
          section.addWidget(CardService.newTextParagraph()
            .setText(`<b>${icon} ${notionProp.name}</b>`));
          this.addRelationSelector(section, notionProp, currentValue);
          break;
        default:
          section.addWidget(CardService.newTextParagraph()
            .setText(`• <b>${notionProp.name}</b> (${notionProp.type})`));
          break;
      }
    } catch (error) {
      console.error('❌ Error adding selectable field input:', error);
    }
  }

  /**
   * Add select dropdown
   */
  addSelectDropdown(section, notionProp, currentValue) {
    const dropdown = CardService.newSelectionInput()
      .setFieldName(`selectable_${notionProp.key}`)
      .setTitle(`${notionProp.name} (Select)`)
      .setType(CardService.SelectionInputType.DROPDOWN);

    if (notionProp.property.select && notionProp.property.select.options) {
      notionProp.property.select.options.forEach(option => {
        const isSelected = currentValue === option.name;
        dropdown.addItem(option.name, option.name, isSelected);
      });
    }

    section.addWidget(dropdown);
  }

  /**
   * Add multi-select checkboxes
   */
  addMultiSelectCheckboxes(section, notionProp, currentValue) {
    const checkboxes = CardService.newSelectionInput()
      .setFieldName(`selectable_${notionProp.key}`)
      .setTitle(`${notionProp.name} (Multi-select)`)
      .setType(CardService.SelectionInputType.CHECK_BOX);

    if (notionProp.property.multi_select && notionProp.property.multi_select.options) {
      notionProp.property.multi_select.options.forEach(option => {
        const isSelected = currentValue && currentValue.includes(option.name);
        checkboxes.addItem(option.name, option.name, isSelected);
      });
    }

    section.addWidget(checkboxes);
  }

  /**
   * Add checkbox input
   */
  addCheckboxInput(section, notionProp, currentValue) {
    const checkbox = CardService.newSelectionInput()
      .setFieldName(`selectable_${notionProp.key}`)
      .setTitle(`${notionProp.name} (Checkbox)`)
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .addItem('Checked', 'true', currentValue === 'true');

    section.addWidget(checkbox);
  }

  /**
   * Add status dropdown
   */
  addStatusDropdown(section, notionProp, currentValue) {
    const dropdown = CardService.newSelectionInput()
      .setFieldName(`selectable_${notionProp.key}`)
      .setTitle(`${notionProp.name} (Status)`)
      .setType(CardService.SelectionInputType.DROPDOWN);

    if (notionProp.property.status && notionProp.property.status.options) {
      notionProp.property.status.options.forEach(option => {
        const isSelected = currentValue === option.name;
        dropdown.addItem(option.name, option.name, isSelected);
      });
    }

    section.addWidget(dropdown);
  }

  /**
   * Add relation selector
   */
  addRelationSelector(section, notionProp, currentValue) {
    try {
      const dropdown = CardService.newSelectionInput()
        .setFieldName(`selectable_${notionProp.key}`)
        .setTitle(`${notionProp.name} (Relation)`)
        .setType(CardService.SelectionInputType.DROPDOWN);

      dropdown.addItem("-- No related page --", 'none', !currentValue || currentValue === 'none');
      dropdown.addItem("📝 Configure in Notion", 'configure', false);
      
      section.addWidget(dropdown);

      section.addWidget(CardService.newTextParagraph()
        .setText('<i>Configure related pages directly in Notion</i>'));

    } catch (error) {
      console.error('❌ Error creating relation selector:', error);
      section.addWidget(CardService.newTextParagraph()
        .setText(`• <b>${notionProp.name}</b> (Relation) - Configure in Notion`));
    }
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
 * Save mappings to configuration with proper Script Properties persistence - ENHANCED
 */
saveMappings(databaseId, formInputs) {
  try {
    console.log('💾 Saving mappings for database:', databaseId);
    
    const config = getEnhancedG2NConfig();
    
    // CRITICAL: Ensure config database matches the one we're saving mappings for
    if (config.DATABASES.gmail.id !== databaseId) {
      console.warn('🔄 Config database mismatch during mapping save. Updating config...');
      
      const notionService = new NotionService();
      const database = notionService.verifyG2NDatabaseAccess(databaseId);
      const databaseName = database.title?.[0]?.plain_text || 'Database';
      
      config.DATABASES.gmail.id = databaseId;
      config.DATABASES.gmail.name = databaseName;
      console.log('✅ Updated config database to match mapped database:', databaseName);
    }
    
    // Initialize property mappings if not exists
    if (!config.PROPERTY_MAPPINGS) {
      config.PROPERTY_MAPPINGS = {
        mappings: {},
        metadata: {
          version: '1.0',
          lastUpdated: new Date().toISOString(),
          databaseCount: 0,
          mappingCount: 0
        }
      };
    }
    
    if (!config.PROPERTY_MAPPINGS.mappings) {
      config.PROPERTY_MAPPINGS.mappings = {};
    }
    
    // Process ALL Gmail fields including the ones you specified
    const validMappings = {};
    Object.entries(formInputs).forEach(([fieldName, selectedProperty]) => {
      // Handle gmail_* fields (direct mappings)
      if (fieldName.startsWith('gmail_') && selectedProperty && selectedProperty !== 'none') {
        const gmailFieldName = fieldName.substring(6); // Remove 'gmail_' prefix
        validMappings[gmailFieldName] = selectedProperty;
        console.log(`✅ Saving mapping: ${gmailFieldName} -> ${selectedProperty}`);
      }
      
      // Handle selectable_* fields (fixed values)
      if (fieldName.startsWith('selectable_') && selectedProperty && selectedProperty !== 'none') {
        const propertyName = fieldName.substring(11); // Remove 'selectable_' prefix
        validMappings[propertyName] = {
          fixedValue: selectedProperty,
          mappingType: 'fixed_value'
        };
        console.log(`✅ Saving fixed value: ${propertyName} -> ${selectedProperty}`);
      }
    });
    
    // Save to config
    config.PROPERTY_MAPPINGS.mappings[databaseId] = validMappings;
    
    config.PROPERTY_MAPPINGS.metadata = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      databaseCount: Object.keys(config.PROPERTY_MAPPINGS.mappings).length,
      mappingCount: Object.keys(validMappings).length
    };
    
    // CRITICAL: Save to Script Properties for persistence
    const saveResult = saveG2NConfigToStorage(config);
    
    if (saveResult && saveResult.success) {
      console.log('✅ Mappings saved successfully for database:', config.DATABASES.gmail.name);
      console.log('📊 Saved mappings:', validMappings);
      
      return {
        success: true,
        mappingCount: Object.keys(validMappings).length,
        message: `Saved ${Object.keys(validMappings).length} property mappings for ${config.DATABASES.gmail.name}`,
        databaseId: databaseId,
        databaseName: config.DATABASES.gmail.name,
        mappings: validMappings
      };
    } else {
      throw new Error(saveResult?.error || 'Unknown save error');
    }
    
  } catch (error) {
    console.error('❌ Failed to save mappings:', error);
    return { 
      success: false, 
      error: error.message
    };
  }
}



  /**
   * Load mappings for database
   */
  loadMappings(databaseId) {
    try {
      const config = getEnhancedG2NConfig();
      const mappings = config.PROPERTY_MAPPINGS?.mappings?.[databaseId] || {};
      console.log('📖 Loaded mappings for database:', databaseId, Object.keys(mappings).length, 'mappings');
      return mappings;
    } catch (error) {
      console.error('❌ Failed to load mappings:', error);
      return {};
    }
  }

  /**
   * Debug function to log all database properties
   */
  debugDatabaseProperties(databaseId) {
    try {
      const notionService = new NotionService();
      const database = notionService.verifyG2NDatabaseAccess(databaseId);
      const properties = database.properties || {};
      
      console.log('🐛 DEBUG - Database Properties:');
      Object.entries(properties).forEach(([propName, prop]) => {
        console.log(`🔍 "${propName}":`, {
          type: prop.type,
          name: prop.name,
          id: prop.id
        });
      });
      
      return properties;
    } catch (error) {
      console.error('❌ Debug failed:', error);
      return {};
    }
  }

  /**
   * Save property mappings with persistence
   */
  savePropertyMappings(databaseId, formInputs, databaseProperties) {
    const startTime = g2nStartTimer();
      let hadError = false; // Declare at the top
      let errorObj = null;  // Declare at the top
    
    g2nFunctionEntry('savePropertyMappings', {
      databaseId: databaseId,
      formInputsCount: Object.keys(formInputs || {}).length,
      databasePropertiesCount: Object.keys(databaseProperties || {}).length
    });
    
    try {
      const mappings = this.processFormInputsToMappings(formInputs, databaseProperties);
      
      const saveResult = saveG2NPropertyMappings(databaseId, mappings);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      
      g2nPerf('PropertyMapper', 'Property mappings saved', startTime, {
        databaseId: databaseId,
        mappingCount: Object.keys(mappings).length
      });
      
      return saveResult;
      
    } catch (error) {
      g2nError('PropertyMapper', 'Failed to save property mappings', {
        error: error.message,
        databaseId: databaseId,
        duration: new Date().getTime() - startTime
      });
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      g2nFunctionExit('savePropertyMappings', { success: !hadError }, startTime);
    }
  }

  /**
   * Process form inputs into structured mappings
   */
  processFormInputsToMappings(formInputs, databaseProperties) {
    const mappings = {};
    let processedCount = 0;
    
    // Create mapping from normalized field names to original property names
    const normalizedToOriginal = {};
    Object.keys(databaseProperties).forEach(origName => {
      normalizedToOriginal[this.normalizeFieldKey(origName)] = origName;
    });
    
    // Process mapped properties (map_ prefix)
    Object.keys(formInputs).forEach(fieldName => {
      if (fieldName.startsWith('map_')) {
        const normalizedPropName = fieldName.substring(4);
        const originalPropName = this.denormalizeFieldKey(normalizedPropName, databaseProperties);
        const emailFieldValue = formInputs[fieldName];
        
        if (emailFieldValue && emailFieldValue !== 'none') {
          const propertyConfig = databaseProperties[originalPropName];
          
          mappings[originalPropName] = {
            notionProperty: originalPropName,
            notionType: propertyConfig.type,
            emailField: emailFieldValue,
            mappingType: 'email_field'
          };
          
          processedCount++;
        }
      }
    });
    
    // Process selectable properties
    Object.keys(formInputs).forEach(fieldName => {
      if (fieldName.startsWith('select_') || fieldName.startsWith('multiselect_') || 
          fieldName.startsWith('status_') || fieldName.startsWith('checkbox_') || 
          fieldName.startsWith('people_')) {
        
        const prefixEnd = fieldName.indexOf('_') + 1;
        const normalizedPropName = fieldName.substring(prefixEnd);
        const originalPropName = this.denormalizeFieldKey(normalizedPropName, databaseProperties);
        const propertyValue = formInputs[fieldName];
        
        if (propertyValue && propertyValue !== 'none' && propertyValue !== '') {
          const propertyConfig = databaseProperties[originalPropName];
          
          mappings[originalPropName] = {
            notionProperty: originalPropName,
            notionType: propertyConfig.type,
            value: propertyValue,
            mappingType: 'fixed_value'
          };
          
          processedCount++;
        }
      }
    });
    
    g2nInfo('PropertyMapper', 'Form inputs processed to mappings', {
      totalInputs: Object.keys(formInputs).length,
      processedMappings: processedCount,
      mappingTypes: Object.values(mappings).map(m => m.mappingType)
    });
    
    return mappings;
  }

  /**
   * Load and apply saved property mappings
   */
  loadAndApplyPropertyMappings(databaseId, databaseProperties) {
    const startTime = g2nStartTimer();
      let hadError = false; // Declare at the top
      let errorObj = null;  // Declare at the top
    
    g2nFunctionEntry('loadAndApplyPropertyMappings', {
      databaseId: databaseId,
      databasePropertiesCount: Object.keys(databaseProperties || {}).length
    });
    
    try {
      const savedMappings = loadG2NPropertyMappings(databaseId);
      
      if (Object.keys(savedMappings).length === 0) {
        g2nInfo('PropertyMapper', 'No saved mappings to apply', {
          databaseId: databaseId
        });
        return {};
      }
      
      g2nInfo('PropertyMapper', 'Applying saved property mappings', {
        databaseId: databaseId,
        savedMappingCount: Object.keys(savedMappings).length
      });
      
      return savedMappings;
      
    } catch (error) {
      g2nError('PropertyMapper', 'Failed to load and apply property mappings', {
        error: error.message,
        databaseId: databaseId,
        duration: new Date().getTime() - startTime
      });
      
      return {};
    } finally {
      g2nFunctionExit('loadAndApplyPropertyMappings', { success: !hadError }, startTime);
    }
  }


  /**
   * Create separate UI sections for mappable vs selectable properties
   */
  createSeparatedPropertySections(properties, savedMappings = {}) {
    console.log('📋 Creating separated property sections...');
    
    try {
      const sections = [];
      const propertyTypes = this.analyzePropertyTypes(properties);
      
      console.log(`📊 Property analysis: ${Object.keys(propertyTypes.mappable).length} mappable, ${Object.keys(propertyTypes.selectable).length} selectable, ${Object.keys(propertyTypes.unsupported).length} unsupported`);

      // Section 1: Mappable Properties
      if (Object.keys(propertyTypes.mappable).length > 0) {
        const mappableSection = CardService.newCardSection()
          .setHeader("📧 Map to Email Fields")
          .addWidget(CardService.newTextParagraph()
            .setText("Select which email field to map to each Notion property:"));

        Object.keys(propertyTypes.mappable).forEach(propName => {
          const prop = propertyTypes.mappable[propName];
          const savedField = savedMappings[propName]?.emailField || savedMappings[propName];
          this.createMappablePropertySelector(mappableSection, propName, prop, savedField);
        });

        sections.push(mappableSection);
      }

      // Section 2: Selectable Properties
      if (Object.keys(propertyTypes.selectable).length > 0) {
        const selectableSection = CardService.newCardSection()
          .setHeader("⚙️ Set Property Values")
          .addWidget(CardService.newTextParagraph()
            .setText("Choose values for selectable properties:"));

        Object.keys(propertyTypes.selectable).forEach(propName => {
          const prop = propertyTypes.selectable[propName];
          const savedValue = savedMappings[propName]?.value || savedMappings[propName];
          this.createSelectablePropertySelector(selectableSection, propName, prop, savedValue);
        });

        sections.push(selectableSection);
      }

      // Section 3: Unsupported Properties
      if (Object.keys(propertyTypes.unsupported).length > 0) {
        const unsupportedSection = CardService.newCardSection()
          .setHeader("ℹ️ Unsupported Properties")
          .addWidget(CardService.newTextParagraph()
            .setText("These property types cannot be automatically mapped:"));

        Object.keys(propertyTypes.unsupported).forEach(propName => {
          const prop = propertyTypes.unsupported[propName];
          unsupportedSection.addWidget(CardService.newTextParagraph()
            .setText(`• ${propName} (${prop.type}) - ${this.getUnsupportedPropertyReason(prop.type)}`));
        });

        sections.push(unsupportedSection);
      }

      console.log(`✅ Created ${sections.length} property sections`);
      return sections;
      
    } catch (error) {
      console.error('❌ Error creating separated property sections:', error);
      return [];
    }
  }

  /**
   * Analyze property types and categorize them
   */
  analyzePropertyTypes(properties) {
    const result = { mappable: {}, selectable: {}, unsupported: {} };
    
    Object.entries(properties).forEach(([propName, prop]) => {
      if (this.isMappableProperty(prop.type)) {
        result.mappable[propName] = prop;
      } else if (this.isSelectableProperty(prop.type)) {
        result.selectable[propName] = prop;
      } else {
        result.unsupported[propName] = prop;
      }
    });
    
    return result;
  }

  /**
   * Check if property type is mappable
   */
  isMappableProperty(propertyType) {
    const mappableTypes = ['title', 'rich_text', 'url', 'email', 'number', 'date', 'phone_number'];
    return mappableTypes.includes(propertyType);
  }

  /**
   * Check if property type is selectable
   */
  isSelectableProperty(propertyType) {
    const selectableTypes = ['select', 'multi_select', 'status', 'checkbox', 'people'];
    return selectableTypes.includes(propertyType);
  }

  /**
   * Get reason why a property type is unsupported
   */
  getUnsupportedPropertyReason(propertyType) {
    const reasons = {
      'formula': 'Calculated fields cannot be set',
      'rollup': 'Rollup fields are read-only',
      'created_time': 'Automatically set by Notion',
      'last_edited_time': 'Automatically set by Notion',
      'created_by': 'Automatically set by Notion',
      'last_edited_by': 'Automatically set by Notion'
    };
    
    return reasons[propertyType] || 'This property type is not supported for mapping';
  }

/**
 * Create mappable property selector with fallbacks
 */
createMappablePropertySelector(propName, propInfo, currentMappings = {}) {
  try {
    const emailFields = this.getEmailFields();
    const normalizedKey = this.normalizeFieldKey(propName);
    const currentMapping = currentMappings[normalizedKey] || '';
    
    const selector = CardService.newSelectionInput()
      .setFieldName(`mapping_${normalizedKey}`)
      .setTitle(`Map "${propName}" to:`)
      .setType(CardService.SelectionInputType.DROPDOWN);
    
    // Add "Don't Map" option
    selector.addItem('-- Don\'t Map --', '', currentMapping === '');
    
    // Add compatible email fields
    emailFields.forEach(field => {
      if (field.compatibleTypes.includes(propInfo.type)) {
        const isSelected = currentMapping === field.id;
        selector.addItem(`${field.name} (${field.id})`, field.id, isSelected);
      }
    });
    
    // Add property type info
    selector.addItem(`-- Property Type: ${propInfo.type} --`, `type_${propInfo.type}`, false);
    
    return selector;
    
  } catch (error) {
    console.error(`Error creating selector for ${propName}:`, error);
    // Fallback minimal selector
    return CardService.newSelectionInput()
      .setFieldName(`mapping_${this.normalizeFieldKey(propName)}`)
      .setTitle(`Map "${propName}"`)
      .setType(CardService.SelectionInputType.DROPDOWN)
      .addItem('-- Don\'t Map --', '', true)
      .addItem('Email Subject', 'subject', false)
      .addItem('Email Body', 'body', false);
  }
}

/**
 * Enhanced property mapping section creation - FIXED VERSION
 */
createPropertyMappingSection(databaseProperties, databaseId) {
  console.log('📋 Creating enhanced property mapping section...');
  
  try {
    const sections = [];
    const currentMappings = this.loadMappings(databaseId);
    const propertyTypes = this.analyzePropertyTypes(databaseProperties);
    
    console.log('📊 Section creation analysis:', {
      mappable: Object.keys(propertyTypes.mappable).length,
      selectable: Object.keys(propertyTypes.selectable).length,
      databaseId: databaseId
    });

    let mappableWidgetCount = 0;
    let selectableWidgetCount = 0;

    // Mappable Properties Section
    if (Object.keys(propertyTypes.mappable).length > 0) {
      const mappableSection = CardService.newCardSection()
        .setHeader('📝 Map Email Content')
        .addWidget(CardService.newTextParagraph()
          .setText('Connect email fields to your database properties:'));

      Object.entries(propertyTypes.mappable).forEach(([propName, propInfo]) => {
        try {
          const selector = this.createMappablePropertySelector(propName, propInfo, currentMappings);
          if (selector) {
            mappableSection.addWidget(selector);
            mappableWidgetCount++;
          }
        } catch (error) {
          console.error(`Error adding property ${propName} to section:`, error);
        }
      });

      // Only add section if we have actual mapping widgets (not just the header)
      if (mappableWidgetCount > 0) {
        sections.push(mappableSection);
        console.log(`✅ Added mappable section with ${mappableWidgetCount} widgets`);
      }
    }

    // Selectable Properties Section
    if (Object.keys(propertyTypes.selectable).length > 0) {
      const selectableSection = CardService.newCardSection()
        .setHeader('🏷️ Set Fixed Values')
        .addWidget(CardService.newTextParagraph()
          .setText('Set fixed values for dropdowns and checkboxes:'));

      Object.entries(propertyTypes.selectable).forEach(([propName, propInfo]) => {
        try {
          const input = this.createSelectablePropertyInput(propName, propInfo, currentMappings);
          if (input) {
            selectableSection.addWidget(input);
            selectableWidgetCount++;
          }
        } catch (error) {
          console.error(`Error adding selectable property ${propName}:`, error);
        }
      });

      // Only add section if we have actual input widgets
      if (selectableWidgetCount > 0) {
        sections.push(selectableSection);
        console.log(`✅ Added selectable section with ${selectableWidgetCount} widgets`);
      }
    }

    // Info Section if no mappable properties
    if (sections.length === 0) {
      const infoSection = CardService.newCardSection()
        .setHeader('ℹ️ No Mappable Properties')
        .addWidget(CardService.newTextParagraph()
          .setText('No properties found that can be mapped from email data.'))
        .addWidget(CardService.newTextParagraph()
          .setText('Your database needs properties like:'))
        .addWidget(CardService.newTextParagraph()
          .setText('• Text, Title, Email, URL, or Date properties'));
      
      sections.push(infoSection);
      console.log('✅ Added info section (no mappable properties)');
    }

    console.log(`✅ Created ${sections.length} mapping sections total`);
    return sections;
    
  } catch (error) {
    console.error('❌ Error creating property mapping section:', error);
    
    // Emergency fallback section
    return [CardService.newCardSection()
      .setHeader('⚠️ Mapping Interface')
      .addWidget(CardService.newTextParagraph()
        .setText('Could not load property mapping interface.'))
      .addWidget(CardService.newTextParagraph()
        .setText('Please check your database configuration.'))];
  }
}

  /**
   * Create selector for selectable properties
   */
  createSelectablePropertySelector(section, propName, prop, savedValue) {
    const normalizedFieldName = this.normalizeFieldKey(propName);
    
    switch (prop.type) {
      case 'select':
        this.createSelectSelector(section, normalizedFieldName, propName, prop, savedValue);
        break;
      case 'multi_select':
        this.createMultiSelectSelector(section, normalizedFieldName, propName, prop, savedValue);
        break;
      case 'status':
        this.createStatusSelector(section, normalizedFieldName, propName, prop, savedValue);
        break;
      case 'checkbox':
        this.createCheckboxSelector(section, normalizedFieldName, propName, prop, savedValue);
        break;
      case 'people':
        this.createPeopleSelector(section, normalizedFieldName, propName, prop, savedValue);
        break;
      default:
        console.warn(`Unsupported selectable property type: ${prop.type} for property: ${propName}`);
    }
  }

  /**
   * Create selector for 'select' type properties
   */
  createSelectSelector(section, normalizedFieldName, propName, prop, savedValue) {
    const selector = CardService.newSelectionInput()
      .setFieldName(`select_${normalizedFieldName}`)
      .setTitle(`${propName} (Select)`)
      .setType(CardService.SelectionInputType.DROPDOWN);

    selector.addItem("No selection", 'none', !savedValue || savedValue === 'none');

    if (prop.select && prop.select.options) {
      prop.select.options.forEach(option => {
        const isSelected = savedValue === option.name || savedValue === option.id;
        selector.addItem(option.name, option.name, isSelected);
      });
    }

    section.addWidget(selector);
  }

  /**
   * Create selector for 'multi_select' type properties
   */
  createMultiSelectSelector(section, normalizedFieldName, propName, prop, savedValues) {
    const selector = CardService.newSelectionInput()
      .setFieldName(`multiselect_${normalizedFieldName}`)
      .setTitle(`${propName} (Multi-Select)`)
      .setType(CardService.SelectionInputType.CHECK_BOX);

    if (prop.multi_select && prop.multi_select.options) {
      prop.multi_select.options.forEach(option => {
        const isSelected = savedValues && (Array.isArray(savedValues) ? savedValues.includes(option.name) : savedValues === option.name);
        selector.addItem(option.name, option.name, isSelected);
      });
    }

    section.addWidget(selector);
  }

  /**
   * Create selector for 'status' type properties
   */
  createStatusSelector(section, normalizedFieldName, propName, prop, savedValue) {
    const selector = CardService.newSelectionInput()
      .setFieldName(`status_${normalizedFieldName}`)
      .setTitle(`${propName} (Status)`)
      .setType(CardService.SelectionInputType.DROPDOWN);

    if (prop.status && prop.status.options) {
      prop.status.options.forEach(option => {
        const isSelected = savedValue === option.name;
        selector.addItem(option.name, option.name, isSelected);
      });
    }

    section.addWidget(selector);
  }

  /**
   * Create selector for 'checkbox' type properties
   */
  createCheckboxSelector(section, normalizedFieldName, propName, prop, savedValue) {
    const selector = CardService.newSelectionInput()
      .setFieldName(`checkbox_${normalizedFieldName}`)
      .setTitle(`${propName} (Checkbox)`)
      .setType(CardService.SelectionInputType.CHECK_BOX);

    const isChecked = savedValue === 'true' || savedValue === true;
    selector.addItem("Checked", 'true', isChecked);

    section.addWidget(selector);
  }

  /**
   * Create selector for 'people' type properties
   */
  createPeopleSelector(section, normalizedFieldName, propName, prop, savedValue) {
    const input = CardService.newTextInput()
      .setFieldName(`people_${normalizedFieldName}`)
      .setTitle(`${propName} (People)`)
      .setValue(savedValue || '')
      .setHint('Enter user email or ID (comma-separated for multiple)');

    section.addWidget(input);
  }
  /**
 * Normalize field key for consistent mapping
 */
normalizeFieldKey(fieldKey) {
  if (!fieldKey) return '';
  
  // Convert to lowercase and remove special characters for consistency
  return fieldKey.toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Create selectable property input - ENHANCED VERSION
 */
createSelectablePropertyInput(propName, propInfo, currentMappings) {
  try {
    const normalizedKey = this.normalizeFieldKey(propName);
    const currentValue = currentMappings[normalizedKey] || '';
    
    switch (propInfo.type) {
      case 'select':
        return this.createSelectInput(propName, propInfo, currentValue);
      case 'multi_select':
        return this.createMultiSelectInput(propName, propInfo, currentValue);
      case 'status':
        return this.createStatusInput(propName, propInfo, currentValue);
      case 'checkbox':
        return this.createCheckboxInput(propName, propInfo, currentValue);
      case 'people':
        // People properties can't be set from email data
        return this.createPeopleInfo(propName, propInfo);
      case 'relation':
        // Relation properties can't be set from email data  
        return this.createRelationInfo(propName, propInfo);
      default:
        console.log(`⚠️ Unhandled selectable type: ${propInfo.type} for ${propName}`);
        return null;
    }
  } catch (error) {
    console.error(`Error creating selectable input for ${propName}:`, error);
    return null;
  }
}

/**
 * Create info display for people properties
 */
createPeopleInfo(propName, propInfo) {
  try {
    return CardService.newTextParagraph()
      .setText(`👥 ${propName}: People properties are set automatically`);
  } catch (error) {
    console.error(`Error creating people info for ${propName}:`, error);
    return null;
  }
}

/**
 * Create info display for relation properties  
 */
createRelationInfo(propName, propInfo) {
  try {
    return CardService.newTextParagraph()
      .setText(`🔗 ${propName}: Relation properties are set automatically`);
  } catch (error) {
    console.error(`Error creating relation info for ${propName}:`, error);
    return null;
  }
}

createSelectablePropertyInput(propName, propInfo, currentMappings) {
  try {
    const normalizedKey = this.normalizeFieldKey(propName);
    const currentValue = currentMappings[normalizedKey] || '';
    
    switch (propInfo.type) {
      case 'select':
        return this.createSelectInput(propName, propInfo, currentValue);
      case 'multi_select':
        return this.createMultiSelectInput(propName, propInfo, currentValue);
      case 'status':
        return this.createStatusInput(propName, propInfo, currentValue);
      case 'checkbox':
        return this.createCheckboxInput(propName, propInfo, currentValue);
      case 'people':
        // People properties can't be set from email data
        return this.createPeopleInfo(propName, propInfo);
      case 'relation':
        // Relation properties can't be set from email data  
        return this.createRelationInfo(propName, propInfo);
      default:
        console.log(`⚠️ Unhandled selectable type: ${propInfo.type} for ${propName}`);
        return null;
    }
  } catch (error) {
    console.error(`Error creating selectable input for ${propName}:`, error);
    return null;
  }
}

/**
 * Get email fields definitions
 */
getEmailFields() {
  try {
    const constants = getAppConstants();
    return constants.EMAIL_FIELDS?.DEFINITIONS || [
      { id: 'subject', name: '📧 Email Subject', description: 'The subject line of the email', compatibleTypes: ['title', 'rich_text'] },
      { id: 'from', name: '👤 From Address', description: 'Sender email address', compatibleTypes: ['email', 'rich_text'] },
      { id: 'to', name: '📨 To Address', description: 'Recipient email address(es)', compatibleTypes: ['email', 'rich_text'] },
      { id: 'dateSent', name: '📅 Date Sent', description: 'When the email was sent', compatibleTypes: ['date'] },
      { id: 'body', name: '📝 Email Body', description: 'The content of the email', compatibleTypes: ['rich_text'] },
      { id: 'gmailLink', name: '🔗 Gmail Link', description: 'Link to open this email in Gmail', compatibleTypes: ['url'] },
      { id: 'messageId', name: '🆔 Message ID', description: 'Unique Gmail message identifier', compatibleTypes: ['rich_text'] }
    ];
  } catch (error) {
    console.error('Error getting email fields:', error);
    // Fallback email fields
    return [
      { id: 'subject', name: 'Email Subject', description: 'Email subject line', compatibleTypes: ['title', 'rich_text'] },
      { id: 'from', name: 'From', description: 'Sender information', compatibleTypes: ['rich_text', 'email'] },
      { id: 'dateSent', name: 'Date Sent', description: 'Email date', compatibleTypes: ['date'] },
      { id: 'body', name: 'Email Body', description: 'Email content', compatibleTypes: ['rich_text'] }
    ];
  }
}

/**
 * Get property type display names
 */
getPropertyTypeDisplayNames() {
  try {
    const constants = getAppConstants();
    return constants.EMAIL_FIELDS?.PROPERTY_TYPE_DISPLAY_NAMES || {
      'title': 'Title',
      'rich_text': 'Text',
      'number': 'Number', 
      'select': 'Select',
      'multi_select': 'Multi-select',
      'date': 'Date',
      'url': 'URL',
      'email': 'Email',
      'checkbox': 'Checkbox',
      'phone_number': 'Phone',
      'status': 'Status'
    };
  } catch (error) {
    console.error('Error getting property type names:', error);
    return {
      'rich_text': 'Text',
      'title': 'Title',
      'date': 'Date',
      'url': 'URL',
      'email': 'Email',
      'select': 'Select'
    };
  }
}

/**
 * Create status input selector
 */
createStatusInput(propName, propInfo, currentValue) {
  try {
    const normalizedKey = this.normalizeFieldKey(propName);
    const input = CardService.newSelectionInput()
      .setFieldName(`selectable_${normalizedKey}`)
      .setTitle(`Set "${propName}" status:`)
      .setType(CardService.SelectionInputType.DROPDOWN);
    
    // Add default options for status
    input.addItem('Not set', '', currentValue === '');
    input.addItem('Not started', 'not_started', currentValue === 'not_started');
    input.addItem('In progress', 'in_progress', currentValue === 'in_progress');
    input.addItem('Completed', 'completed', currentValue === 'completed');
    
    return input;
  } catch (error) {
    console.error(`Error creating status input for ${propName}:`, error);
    return null;
  }
}

/**
 * Create checkbox input
 */
createCheckboxInput(propName, propInfo, currentValue) {
  try {
    const normalizedKey = this.normalizeFieldKey(propName);
    const input = CardService.newSelectionInput()
      .setFieldName(`selectable_${normalizedKey}`)
      .setTitle(`Set "${propName}":`)
      .setType(CardService.SelectionInputType.CHECK_BOX);
    
    const isChecked = currentValue === 'true' || currentValue === true;
    input.addItem('Enabled', 'true', isChecked);
    
    return input;
  } catch (error) {
    console.error(`Error creating checkbox input for ${propName}:`, error);
    return null;
  }
}

/**
 * Create select input
 */
createSelectInput(propName, propInfo, currentValue) {
  try {
    const normalizedKey = this.normalizeFieldKey(propName);
    const input = CardService.newSelectionInput()
      .setFieldName(`selectable_${normalizedKey}`)
      .setTitle(`Set "${propName}":`)
      .setType(CardService.SelectionInputType.DROPDOWN);
    
    // Add default "Not set" option
    input.addItem('Not set', '', currentValue === '');
    
    // Add options from property if available
    if (propInfo.options && Array.isArray(propInfo.options)) {
      propInfo.options.forEach(option => {
        if (option.name) {
          const isSelected = currentValue === option.name;
          input.addItem(option.name, option.name, isSelected);
        }
      });
    } else {
      // Fallback options
      input.addItem('Option 1', 'option1', currentValue === 'option1');
      input.addItem('Option 2', 'option2', currentValue === 'option2');
    }
    
    return input;
  } catch (error) {
    console.error(`Error creating select input for ${propName}:`, error);
    return null;
  }
}

/**
 * Create multi-select input
 */
createMultiSelectInput(propName, propInfo, currentValue) {
  try {
    const normalizedKey = this.normalizeFieldKey(propName);
    const input = CardService.newSelectionInput()
      .setFieldName(`selectable_${normalizedKey}`)
      .setTitle(`Set "${propName}":`)
      .setType(CardService.SelectionInputType.CHECK_BOX);
    
    // Parse current values (could be array or string)
    const currentValues = Array.isArray(currentValue) ? currentValue : 
                         (typeof currentValue === 'string' ? currentValue.split(',') : []);
    
    // Add options from property if available
    if (propInfo.options && Array.isArray(propInfo.options)) {
      propInfo.options.forEach(option => {
        if (option.name) {
          const isSelected = currentValues.includes(option.name);
          input.addItem(option.name, option.name, isSelected);
        }
      });
    } else {
      // Fallback options
      input.addItem('Tag 1', 'tag1', currentValues.includes('tag1'));
      input.addItem('Tag 2', 'tag2', currentValues.includes('tag2'));
    }
    
    return input;
  } catch (error) {
    console.error(`Error creating multi-select input for ${propName}:`, error);
    return null;
  }
}

/**
 * Save property mappings from form inputs
 */
saveMappingsFromForm(formInputs, databaseId) {
  console.log('💾 Saving mappings from form inputs...', {
    inputCount: Object.keys(formInputs || {}).length,
    databaseId: databaseId
  });
  
  try {
    if (!formInputs || Object.keys(formInputs).length === 0) {
      throw new Error('No form data received');
    }
    
    if (!databaseId) {
      throw new Error('Database ID is required');
    }
    
    const mappings = {};
    let mappingCount = 0;
    
    // Process form inputs to extract mappings
    Object.keys(formInputs).forEach(key => {
      // Look for mapping fields (they start with "mapping_")
      if (key.startsWith('mapping_') && formInputs[key]) {
        const propertyName = key.replace('mapping_', '');
        const emailField = formInputs[key];
        
        // Only save if user selected an actual email field (not empty)
        if (emailField && emailField.trim() !== '') {
          mappings[propertyName] = emailField;
          mappingCount++;
          console.log(`📝 Mapping: ${propertyName} → ${emailField}`);
        }
      }
      
      // Process selectable fields (they start with "selectable_")
      if (key.startsWith('selectable_') && formInputs[key]) {
        const propertyName = key.replace('selectable_', '');
        const selectedValue = formInputs[key];
        
        if (selectedValue && selectedValue.trim() !== '') {
          mappings[propertyName] = selectedValue;
          mappingCount++;
          console.log(`🏷️ Selectable: ${propertyName} → ${selectedValue}`);
        }
      }
    });
    
    console.log(`📊 Processed ${mappingCount} mappings from form`);
    
    if (mappingCount === 0) {
      throw new Error('No valid mappings found in form data');
    }
    
    // Save the mappings using the existing saveMappings method
    const saveResult = this.saveMappings(databaseId, mappings);
    
    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Failed to save mappings');
    }
    
    console.log('✅ Mappings saved successfully from form');
    
    return {
      success: true,
      message: `Successfully saved ${mappingCount} property mappings`,
      mappingCount: mappingCount,
      mappings: mappings
    };
    
  } catch (error) {
    console.error('❌ Failed to save mappings from form:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
/**
 * Enhanced form processing with better error handling
 */
processFormMappings(formInputs, databaseId) {
  console.log('🔍 Processing form mappings...', {
    formKeys: Object.keys(formInputs || {}),
    databaseId: databaseId
  });
  
  try {
    const mappings = {};
    const newProperties = [];
    
    Object.keys(formInputs || {}).forEach(key => {
      const value = formInputs[key];
      
      // Skip empty values
      if (!value || value.toString().trim() === '') {
        return;
      }
      
      // Handle property mappings (mapping_ prefix)
      if (key.startsWith('mapping_')) {
        const propertyName = key.replace('mapping_', '');
        
        // Skip "Don't Map" selections and type indicators
        if (value !== '' && !value.startsWith('type_')) {
          mappings[propertyName] = {
            emailField: value,
            mappingType: 'email_field',
            mappedAt: new Date().toISOString()
          };
          console.log(`🗺️ Mapped: ${propertyName} → ${value}`);
        }
      }
      
      // Handle selectable values (selectable_ prefix)
      if (key.startsWith('selectable_')) {
        const propertyName = key.replace('selectable_', '');
        
        mappings[propertyName] = {
          fixedValue: value,
          mappingType: 'fixed_value', 
          mappedAt: new Date().toISOString()
        };
        console.log(`🏷️ Fixed: ${propertyName} → ${value}`);
      }
      
      // Handle new property creation (new_prop_type_ and new_prop_name_)
      if (key.startsWith('new_prop_type_') && value && value !== 'CREATE_NEW') {
        const fieldId = key.replace('new_prop_type_', '');
        const propNameKey = `new_prop_name_${fieldId}`;
        const propName = formInputs[propNameKey];
        
        if (propName && propName.trim() !== '') {
          newProperties.push({
            fieldId: fieldId,
            propertyName: propName,
            propertyType: value
          });
          console.log(`🆕 New property: ${propName} (${value}) for field ${fieldId}`);
        }
      }
    });
    
    console.log(`📊 Processed ${Object.keys(mappings).length} mappings and ${newProperties.length} new properties`);
    
    // Save the mappings
    if (Object.keys(mappings).length > 0) {
      const saveResult = this.saveMappings(databaseId, mappings);
      
      if (!saveResult.success) {
        throw new Error(`Failed to save mappings: ${saveResult.error}`);
      }
      
      return {
        success: true,
        message: `Saved ${Object.keys(mappings).length} property mappings`,
        mappingCount: Object.keys(mappings).length,
        newPropertyCount: newProperties.length,
        mappings: mappings,
        newProperties: newProperties
      };
    } else {
      throw new Error('No valid mappings found to save');
    }
    
  } catch (error) {
    console.error('❌ Form processing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

}