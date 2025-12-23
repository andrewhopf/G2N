/* FILE: property-handlers.js (Corrected) */

/**
 * Property Handlers for Notion property types
 * Each handler manages configuration, UI building, and data processing for a specific Notion property type
 */

// ============================================
// MAIN PROPERTY HANDLERS OBJECT
// ============================================

const PropertyHandlers = {
  
  // ============================================
  // TEXT-BASED PROPERTIES (title, rich_text, email, url, number, phone_number)
  // ============================================
  text: {
    /**
     * Process configuration for text-based properties
     * @param {Object} property - Notion property definition
     * @param {Object} formInputs - Form inputs from user
     * @returns {Object} Processed configuration
     */
    processConfiguration: function(property, formInputs) {
      const isEnabled = property.isRequired || formInputs[`enabled_${property.id}`] === true;
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: isEnabled,
        emailField: formInputs[`emailField_${property.id}`] || getRecommendedEmailField(property.type) || "subject",
        transformation: formInputs[`transformation_${property.id}`] || "none",
        isStaticOption: false,
        isRequired: property.isRequired
      };
    },
    
    /**
     * Build UI section for text-based properties
     * @param {Object} property - Notion property definition
     * @param {Object} savedMapping - Previously saved mapping
     * @returns {CardService.CardSection} UI section
     */
    buildUI: function(property, savedMapping) {
      const section = CardService.newCardSection();
      const propertyId = property.id;
      
      // Property header
      section.addWidget(CardService.newTextParagraph()
        .setText(`<b>${property.name}</b> <font color="#666">(${getPropertyTypeDisplayName(property.type)})</font>`));
      
      // Required field indicator
      if (property.isRequired) {
        section.addWidget(CardService.newTextParagraph()
          .setText("<font color='#d93025'>⚠️ Required field</font>"));
      } else {
        // Enabled toggle for non-required fields
        section.addWidget(CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.CHECK_BOX)
          .setFieldName(`enabled_${propertyId}`)
          .addItem(`Map this property`, "true", savedMapping.enabled));
      }
      
      // Email field selection
      const emailFieldInput = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName(`emailField_${propertyId}`)
        .setTitle("Email Source");
      
      getAvailableGmailFields().forEach(field => {
        emailFieldInput.addItem(field.label, field.value, 
          savedMapping.emailField === field.value);
      });
      
      section.addWidget(emailFieldInput);
      
      // Transformation options for supported types
      const textBasedTypes = ['title', 'rich_text', 'number', 'url', 'phone_number'];
      if (textBasedTypes.includes(property.type)) {
        const transformations = getTransformationOptions(property.type);
        if (transformations.length > 1) {
          const transformationInput = CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.DROPDOWN)
            .setFieldName(`transformation_${propertyId}`)
            .setTitle("Data Processing");
          
          transformations.forEach(trans => {
            transformationInput.addItem(trans.label, trans.value, 
              savedMapping.transformation === trans.value);
          });
          
          section.addWidget(transformationInput);
        }
      }
      
      return section;
    },
    
    /**
     * Process data for Notion API for text-based properties
     * @param {Object} mapping - Property mapping configuration
     * @param {Object} emailData - Extracted email data
     * @returns {Object|null} Formatted property for Notion API
     */
    processForNotion: function(mapping, emailData) {
      if (!mapping.enabled) return null;
      
      let value = emailData[mapping.emailField];
      if (!value && value !== false && value !== 0) return null;
      
      // Apply transformation
      value = applyTransformation(value, mapping.transformation);
      
      // Format for Notion API based on type
      return formatForNotionAPI(value, mapping.type);
    }
  },
  
  // ============================================
  // RELATION PROPERTY HANDLER (CORRECTED)
  // ============================================
  relation: {
    /**
     * Process configuration for relation properties
     * @param {Object} property - Notion property definition
     * @param {Object} formInputs - Form inputs from user
     * @returns {Object} Processed configuration
     */
    processConfiguration: function(property, formInputs) {
      const relationDatabaseId = formInputs[`relation_database_${property.id}`] || "";
      const relationType = formInputs[`relation_type_${property.id}`] || "none";
      const relationValue = formInputs[`relation_value_${property.id}`] || "";
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: relationType !== "none" && !!relationDatabaseId,
        selectedDatabase: relationDatabaseId,
        relationType: relationType,
        relationValue: relationValue,
        isStaticOption: true,
        isRelation: true,
        isRequired: property.isRequired,
        relationConfig: property.config || {}
      };
    },
    
    /**
     * Build UI section for relation properties (CORRECTED)
     * @param {Object} property - Notion property definition
     * @param {Object} savedMapping - Previously saved mapping
     * @returns {CardService.CardSection} UI section
     */
    buildUI: function(property, savedMapping) {
      const section = CardService.newCardSection();
      const propertyId = property.id;
      
      // Property header
      section.addWidget(CardService.newTextParagraph()
        .setText(`<b>${property.name}</b> <font color="#666">(Relation)</font>`));
      
      // Required field indicator
      if (property.isRequired) {
        section.addWidget(CardService.newTextParagraph()
          .setText("<font color='#d93025'>⚠️ Required field</font>"));
      }
      
      // Explanation text
      section.addWidget(CardService.newTextParagraph()
        .setText("<i>Relation properties link to pages in another database.</i>"));
      
      // Get available databases for relation
      const databases = fetchRealNotionDatabases() || [];
      
      // Database selection dropdown
      const dbInput = CardService.newSelectionInput()
        .setFieldName(`relation_database_${propertyId}`)
        .setTitle("Related Database")
        .setType(CardService.SelectionInputType.DROPDOWN);
      
      // Add empty option
      dbInput.addItem("(Select a database to link to)", "", !savedMapping.selectedDatabase);
      
      // Add available databases (excluding the current one)
      const config = getConfig();
      databases.forEach(db => {
        // Skip current database to avoid circular relations
        if (db.id !== config.databaseId) {
          dbInput.addItem(db.name, db.id, savedMapping.selectedDatabase === db.id);
        }
      });
      
      section.addWidget(dbInput);
      
      // Relation type selection
      const typeInput = CardService.newSelectionInput()
        .setFieldName(`relation_type_${propertyId}`)
        .setTitle("How to link")
        .setType(CardService.SelectionInputType.RADIO_BUTTON);
      
      typeInput.addItem("Don't link (skip)", "none", savedMapping.relationType === "none");
      typeInput.addItem("Link to existing page", "link_existing", savedMapping.relationType === "link_existing");
      typeInput.addItem("Create new linked page", "create_new", savedMapping.relationType === "create_new");
      
      section.addWidget(typeInput);
      
      // Additional configuration based on type
      if (savedMapping.relationType === "link_existing") {
        section.addWidget(CardService.newTextParagraph()
          .setText("<i>Note: Will need to select page when saving email</i>"));
      } else if (savedMapping.relationType === "create_new") {
        section.addWidget(CardService.newTextParagraph()
          .setText("<i>Note: Will create new page in related database</i>"));
      }
      
      return section;
    },
    
    /**
     * Process data for Notion API for relation properties
     * @param {Object} mapping - Property mapping configuration
     * @param {Object} emailData - Extracted email data
     * @param {string} apiKey - Notion API key
     * @returns {Object|null} Formatted property for Notion API
     */
    processForNotion: function(mapping, emailData, apiKey) {
      if (!mapping.enabled || mapping.relationType === "none") {
        return null;
      }
      
      try {
        // For now, return empty relation - actual linking requires user input
        // or more sophisticated logic to find/create related pages
        return {
          relation: [] // Empty array means no relations set
        };
        
        // Note: To implement actual relation linking, you would need to:
        // 1. For "link_existing": Let user select page(s) or search by email data
        // 2. For "create_new": Create new page in related database first
        // 3. Then return array of page IDs like: [{ id: "page_id_1" }, { id: "page_id_2" }]
        
      } catch (error) {
        console.error(`Error processing relation property ${mapping.notionPropertyName}:`, error);
        return null;
      }
    }
  },
  
  // ============================================
  // SELECT PROPERTY HANDLER
  // ============================================
  select: {
    /**
     * Process configuration for select properties
     * @param {Object} property - Notion property definition
     * @param {Object} formInputs - Form inputs from user
     * @returns {Object} Processed configuration
     */
    processConfiguration: function(property, formInputs) {
      const selectedOption = formInputs[`option_${property.id}`] || "";
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: !!selectedOption,
        selectedOption: selectedOption,
        isStaticOption: true,
        options: property.config.options || [],
        isRequired: property.isRequired
      };
    },
    
    /**
     * Build UI section for select properties
     * @param {Object} property - Notion property definition
     * @param {Object} savedMapping - Previously saved mapping
     * @returns {CardService.CardSection} UI section
     */
    buildUI: function(property, savedMapping) {
      const section = CardService.newCardSection();
      const propertyId = property.id;
      
      // Property header
      section.addWidget(CardService.newTextParagraph()
        .setText(`<b>${property.name}</b> <font color="#666">(Select)</font>`));
      
      // Required field indicator
      if (property.isRequired) {
        section.addWidget(CardService.newTextParagraph()
          .setText("<font color='#d93025'>⚠️ Required field</font>"));
      }
      
      // Instruction text
      section.addWidget(CardService.newTextParagraph()
        .setText("<i>Select a value to always use for this email:</i>"));
      
      // Options selection
      const optionsInput = CardService.newSelectionInput()
        .setFieldName(`option_${propertyId}`)
        .setTitle("Select Option")
        .setType(CardService.SelectionInputType.RADIO_BUTTON);
      
      // Add "None" option
      optionsInput.addItem("(Don't set a value)", "", savedMapping.selectedOption === "");
      
      // Add actual Notion options
      const options = property.config.options || [];
      options.forEach(option => {
        optionsInput.addItem(option.name, option.name, 
          savedMapping.selectedOption === option.name);
      });
      
      section.addWidget(optionsInput);
      
      return section;
    },
    
    /**
     * Process data for Notion API for select properties
     * @param {Object} mapping - Property mapping configuration
     * @param {Object} emailData - Extracted email data
     * @returns {Object|null} Formatted property for Notion API
     */
    processForNotion: function(mapping, emailData) {
      if (!mapping.enabled || !mapping.selectedOption) {
        return null;
      }
      
      return {
        select: { name: mapping.selectedOption }
      };
    }
  },
  
  // ... (other property handlers remain similar to your existing code)
  
  // ============================================
  // PEOPLE PROPERTY HANDLER
  // ============================================
  people: {
    /**
     * Process configuration for people properties
     * @param {Object} property - Notion property definition
     * @param {Object} formInputs - Form inputs from user
     * @returns {Object} Processed configuration
     */
    processConfiguration: function(property, formInputs) {
      const isEnabled = property.isRequired || formInputs[`enabled_${property.id}`] === true;
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: isEnabled,
        emailField: formInputs[`emailField_${property.id}`] || "from",
        transformation: "extract_email",
        isStaticOption: false,
        isPeopleProperty: true,
        isRequired: property.isRequired
      };
    },
    
    /**
     * Build UI section for people properties
     * @param {Object} property - Notion property definition
     * @param {Object} savedMapping - Previously saved mapping
     * @returns {CardService.CardSection} UI section
     */
    buildUI: function(property, savedMapping) {
      const section = CardService.newCardSection();
      const propertyId = property.id;
      
      // Property header
      section.addWidget(CardService.newTextParagraph()
        .setText(`<b>${property.name}</b> <font color="#666">(People)</font>`));
      
      // Required field indicator
      if (property.isRequired) {
        section.addWidget(CardService.newTextParagraph()
          .setText("<font color='#d93025'>⚠️ Required field</font>"));
      } else {
        // Enabled toggle for non-required fields
        section.addWidget(CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.CHECK_BOX)
          .setFieldName(`enabled_${propertyId}`)
          .addItem(`Map this property`, "true", savedMapping.enabled));
      }
      
      // Explanation text
      section.addWidget(CardService.newTextParagraph()
        .setText("<i>People properties require Notion User IDs. Map to email field, then we'll try to match to Notion users.</i>"));
      
      // Email field selection
      const emailFieldInput = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName(`emailField_${propertyId}`)
        .setTitle("Email Source (will try to match to Notion user)");
      
      getAvailableGmailFields().forEach(field => {
        emailFieldInput.addItem(field.label, field.value, 
          savedMapping.emailField === field.value);
      });
      
      section.addWidget(emailFieldInput);
      
      return section;
    },
    
    /**
     * Process data for Notion API for people properties
     * @param {Object} mapping - Property mapping configuration
     * @param {Object} emailData - Extracted email data
     * @param {string} apiKey - Notion API key
     * @returns {Object|null} Formatted property for Notion API
     */
    processForNotion: function(mapping, emailData, apiKey) {
      if (!mapping.enabled) return null;
      
      let emailAddress = emailData[mapping.emailField];
      if (!emailAddress) return null;
      
      // Extract email from "Name <email@example.com>" format
      emailAddress = extractEmailFromString(emailAddress);
      if (!emailAddress) return null;
      
      try {
        // Try to find Notion user by email
        const userId = findNotionUserIdByEmail(emailAddress, apiKey);
        if (userId) {
          return {
            people: [{ id: userId }]
          };
        }
      } catch (error) {
        console.error(`Error finding Notion user for email ${emailAddress}:`, error);
      }
      
      return null;
    }
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get property handler for a specific property type
 * @param {string} propertyType - Notion property type
 * @returns {Object} Property handler object
 */
function getPropertyHandler(propertyType) {
  const handlerMap = {
    'title': PropertyHandlers.text,
    'rich_text': PropertyHandlers.text,
    'number': PropertyHandlers.text,
    'url': PropertyHandlers.text,
    'phone_number': PropertyHandlers.text,
    'email': PropertyHandlers.text,
    'select': PropertyHandlers.select,
    'status': PropertyHandlers.select, // Status uses same handler as select
    'multi_select': PropertyHandlers.select, // With multi-selection
    'checkbox': PropertyHandlers.checkbox,
    'people': PropertyHandlers.people,
    'date': PropertyHandlers.date,
    'files': PropertyHandlers.files,
    'relation': PropertyHandlers.relation, // Corrected!
    'last_edited_time': PropertyHandlers.auto_managed,
    'created_time': PropertyHandlers.auto_managed,
    'created_by': PropertyHandlers.auto_managed,
    'last_edited_by': PropertyHandlers.auto_managed,
    'formula': PropertyHandlers.auto_managed,
    'rollup': PropertyHandlers.auto_managed
  };
  
  return handlerMap[propertyType] || PropertyHandlers.text;
}

/**
 * Get display name for property type
 * @param {string} propertyType - Notion property type
 * @returns {string} Display name
 */
function getPropertyTypeDisplayName(propertyType) {
  const displayNames = {
    'title': 'Title',
    'rich_text': 'Text',
    'select': 'Select',
    'status': 'Status',
    'multi_select': 'Multi-select',
    'checkbox': 'Checkbox',
    'people': 'People',
    'date': 'Date',
    'files': 'Files',
    'relation': 'Relation',
    'url': 'URL',
    'number': 'Number',
    'phone_number': 'Phone',
    'email': 'Email'
  };
  
  return displayNames[propertyType] || propertyType;
}

/**
 * Extract email address from string
 * @param {string} text - Text containing email address
 * @returns {string|null} Extracted email address
 */
function extractEmailFromString(text) {
  if (!text) return null;
  
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  
  return match ? match[0] : null;
}

/**
 * Find Notion user ID by email address
 * @param {string} email - Email address
 * @param {string} apiKey - Notion API key
 * @returns {string|null} Notion user ID
 */
function findNotionUserIdByEmail(email, apiKey) {
  try {
    if (!email || !apiKey) return null;
    
    // Search Notion users (requires user read permission)
    const url = 'https://api.notion.com/v1/users';
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const users = JSON.parse(response.getContentText()).results;
      
      // Try to find user by email
      const user = users.find(u => 
        u.person && u.person.email && 
        u.person.email.toLowerCase() === email.toLowerCase()
      );
      
      if (user) {
        console.log(`Found Notion user for email ${email}: ${user.id}`);
        return user.id;
      }
    }
    
    console.log(`No Notion user found for email: ${email}`);
    return null;
    
  } catch (error) {
    console.warn("Could not search Notion users:", error.message);
    return null;
  }
}

/**
 * Apply transformation to value
 * @param {any} value - Input value
 * @param {string} transformation - Transformation type
 * @returns {any} Transformed value
 */
function applyTransformation(value, transformation) {
  if (!value) return value;
  
  const strValue = value.toString();
  
  switch (transformation) {
    case 'remove_prefixes':
      return strValue.replace(/^(Re:|Fwd:|RE:|FWD:)\s*/i, '').trim();
      
    case 'truncate_100':
      return strValue.substring(0, 100) + (strValue.length > 100 ? '...' : '');
      
    case 'truncate_500':
      return strValue.substring(0, 500) + (strValue.length > 500 ? '...' : '');
      
    case 'html_to_text':
      return strValue.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
    case 'extract_email':
      const emailMatch = strValue.match(/<([^>]+)>/);
      return emailMatch ? emailMatch[1] : strValue;
      
    case 'parse_date':
      try {
        const date = new Date(strValue);
        return !isNaN(date.getTime()) ? date.toISOString() : strValue;
      } catch (e) {
        return strValue;
      }
      
    default:
      return value;
  }
}

/**
 * Format value for Notion API based on property type
 * @param {any} value - Value to format
 * @param {string} propertyType - Notion property type
 * @returns {Object|null} Formatted property for Notion API
 */
function formatForNotionAPI(value, propertyType) {
  if (!value && value !== false && value !== 0) return null;
  
  const strValue = value.toString();
  
  switch (propertyType) {
    case 'title':
      return {
        title: [{ type: 'text', text: { content: strValue } }]
      };
      
    case 'rich_text':
      return {
        rich_text: [{ type: 'text', text: { content: strValue } }]
      };
      
    case 'email':
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(strValue) ? { email: strValue } : null;
      
    case 'url':
      try {
        new URL(strValue);
        return { url: strValue };
      } catch (e) {
        // If not a valid URL, try to make it one
        if (!strValue.startsWith('http://') && !strValue.startsWith('https://')) {
          return { url: `https://${strValue}` };
        }
        return null;
      }
      
    case 'number':
      const num = parseFloat(strValue);
      return !isNaN(num) ? { number: num } : null;
      
    case 'phone_number':
      return { phone_number: strValue };
      
    default:
      return null;
  }
}

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = {
    PropertyHandlers,
    getPropertyHandler,
    getPropertyTypeDisplayName,
    extractEmailFromString,
    findNotionUserIdByEmail,
    applyTransformation,
    formatForNotionAPI
  };
}