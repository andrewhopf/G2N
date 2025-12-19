/* FILE: property-handlers.js (Corrected) */

/**
 * Property Handlers for Notion property types
 * Each handler manages configuration, UI building, and data processing for a specific Notion property type
 */

// ============================================
// MAIN PROPERTY HANDLERS OBJECT
// ============================================

// --- START: property-handlers.js ---
/**
 * PROPERTY HANDLERS - Complete refactored version
 * Organized by property type with proper separation of concerns
 */

const PropertyHandlers = {
  // ============================================
  // TEXT-BASED PROPERTIES (title, rich_text, email, url, number, phone_number)
  // ============================================
  text: {
    /**
     * Process configuration for text-based properties
     */
    processConfiguration: function(property, formInputs) {
      const isEnabled = property.isRequired || formInputs[`enabled_${property.id}`] === "true";
      
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
     * Build UI widgets for text-based properties
     * RETURNS: Array of widgets
     */
    buildUI: function(property, savedMapping) {
      const widgets = [];
      const propertyId = property.id;
      const isRequired = property.isRequired || false;
      
      // Property header
      widgets.push(CardService.newTextParagraph()
        .setText(`<b>${property.name}</b> <font color="#666">(${getPropertyTypeDisplayName(property.type)})</font>`));
      
      if (isRequired) {
        widgets.push(CardService.newTextParagraph()
          .setText("<font color='#d93025'>⚠️ Required field</font>"));
      } else if (property.type !== "title") {
        // Enabled toggle (skip for title which is always enabled)
        widgets.push(CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.CHECK_BOX)
          .setFieldName(`enabled_${propertyId}`)
          .addItem("Map this property", "true", savedMapping.enabled));
      }
      
      // Email field selection
      const emailFieldInput = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName(`emailField_${propertyId}`)
        .setTitle("Email Source");
      
      getAvailableGmailFields().forEach(field => {
        emailFieldInput.addItem(field.label, field.value, savedMapping.emailField === field.value);
      });
      
      widgets.push(emailFieldInput);
      
      // Transformation options
      if (shouldShowGmailFieldMapping(property.type)) {
        const transformations = getTransformationOptions(property.type);
        if (transformations.length > 1) {
          const transformationInput = CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.DROPDOWN)
            .setFieldName(`transformation_${propertyId}`)
            .setTitle("Data Processing");
          
          transformations.forEach(trans => {
            transformationInput.addItem(trans.label, trans.value, savedMapping.transformation === trans.value);
          });
          
          widgets.push(transformationInput);
        }
      }
      
      return widgets; // RETURN ARRAY
    },
    
    /**
     * Process data for Notion API for text-based properties
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
  // STATIC VALUE PROPERTIES (select, status, checkbox, multi_select)
  // ============================================
  static: {
    /**
     * Process configuration for static value properties
     */
    processConfiguration: function(property, formInputs) {
      const propertyId = property.id;
      const propType = property.type;
      
      let config = {
        type: propType,
        notionPropertyName: property.name,
        enabled: false,
        isStaticOption: true,
        isRequired: property.isRequired
      };
      
      switch (propType) {
        case "checkbox":
          config.enabled = formInputs[`checkbox_${propertyId}`] === "true";
          config.checkboxValue = config.enabled;
          break;
          
        case "select":
        case "status":
          const selectedOption = formInputs[`option_${propertyId}`] || "";
          config.enabled = !!selectedOption;
          config.selectedOption = selectedOption;
          config.options = property.config.options || [];
          break;
          
        case "multi_select":
          const selectedOptions = [];
          const optionsInput = formInputs[`options_${propertyId}`];
          if (Array.isArray(optionsInput)) {
            selectedOptions.push(...optionsInput);
          } else if (optionsInput) {
            selectedOptions.push(optionsInput);
          }
          config.enabled = selectedOptions.length > 0;
          config.selectedOptions = selectedOptions;
          config.options = property.config.options || [];
          break;
      }
      
      return config;
    },
    
    /**
     * Build UI widgets for static value properties
     * RETURNS: Array of widgets
     */
    buildUI: function(property, savedMapping) {
      const widgets = [];
      const propertyId = property.id;
      const propType = property.type;
      
      // Property header
      widgets.push(CardService.newTextParagraph()
        .setText(`<b>${property.name}</b> <font color="#666">(${getPropertyTypeDisplayName(propType)})</font>`));
      
      if (property.isRequired) {
        widgets.push(CardService.newTextParagraph()
          .setText("<font color='#d93025'>⚠️ Required field</font>"));
      }
      
      switch (propType) {
        case "checkbox":
          widgets.push(CardService.newTextParagraph()
            .setText("<i>Set checkbox value:</i>"));
          
          widgets.push(CardService.newSelectionInput()
            .setFieldName(`checkbox_${propertyId}`)
            .setTitle("Checkbox Value")
            .setType(CardService.SelectionInputType.CHECK_BOX)
            .addItem("Check the Check Box", "true", savedMapping.checkboxValue === true));
          break;
          
        case "select":
        case "status":
          widgets.push(CardService.newTextParagraph()
            .setText("<i>Select a value to always use:</i>"));
          
          const optionInput = CardService.newSelectionInput()
            .setFieldName(`option_${propertyId}`)
            .setTitle("Select Option")
            .setType(CardService.SelectionInputType.RADIO_BUTTON);
          
          optionInput.addItem("(Don't set a value)", "", savedMapping.selectedOption === "");
          
          (property.config.options || []).forEach(option => {
            optionInput.addItem(option.name, option.name, savedMapping.selectedOption === option.name);
          });
          
          widgets.push(optionInput);
          break;
          
        case "multi_select":
          widgets.push(CardService.newTextParagraph()
            .setText("<i>Select values to always include:</i>"));
          
          const multiSelectInput = CardService.newSelectionInput()
            .setFieldName(`options_${propertyId}`)
            .setTitle("Select Options")
            .setType(CardService.SelectionInputType.CHECK_BOX);
          
          const selectedOptions = savedMapping.selectedOptions || [];
          (property.config.options || []).forEach(option => {
            multiSelectInput.addItem(option.name, option.name, selectedOptions.includes(option.name));
          });
          
          widgets.push(multiSelectInput);
          break;
      }
      
      return widgets; // RETURN ARRAY
    },
    
    /**
     * Process data for Notion API for static value properties
     */
    processForNotion: function(mapping, emailData) {
      if (!mapping.enabled) return null;
      
      switch (mapping.type) {
        case "checkbox":
          return { checkbox: mapping.checkboxValue };
          
        case "select":
        case "status":
          return mapping.selectedOption ? { select: { name: mapping.selectedOption } } : null;
          
        case "multi_select":
          if (mapping.selectedOptions && mapping.selectedOptions.length > 0) {
            return {
              multi_select: mapping.selectedOptions.map(option => ({ name: option }))
            };
          }
          return null;
          
        default:
          return null;
      }
    }
  },
  
  // ============================================
  // PEOPLE PROPERTY HANDLER (Notion workspace users)
  // ============================================
  people: {
    /**
     * Process configuration for people properties
     */
    processConfiguration: function(property, formInputs) {
      const selectedUsers = [];
      const usersInput = formInputs[`people_${property.id}`];
      
      if (Array.isArray(usersInput)) {
        selectedUsers.push(...usersInput);
      } else if (usersInput) {
        selectedUsers.push(usersInput);
      }
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: selectedUsers.length > 0,
        selectedUsers: selectedUsers,
        isStaticOption: true,
        isPeopleProperty: true,
        isRequired: property.isRequired
      };
    },
    
    /**
     * Build UI widgets for people properties
     * RETURNS: Array of widgets
     */
    buildUI: function(property, savedMapping) {
      const widgets = [];
      const propertyId = property.id;
      
      // Property header
      widgets.push(CardService.newTextParagraph()
        .setText(`<b>${property.name}</b> <font color="#666">(People)</font>`));
      
      if (property.isRequired) {
        widgets.push(CardService.newTextParagraph()
          .setText("<font color='#d93025'>⚠️ Required field</font>"));
      }
      
      widgets.push(CardService.newTextParagraph()
        .setText("<i>Select Notion workspace users to assign:</i>"));
      
      // Fetch Notion workspace users
      const notionUsers = fetchNotionWorkspaceUsers();
      const selectedUsers = savedMapping.selectedUsers || [];
      
      if (notionUsers.length === 0) {
        widgets.push(CardService.newTextParagraph()
          .setText("<font color='#FF6B6B'>⚠️ No Notion users found. Check API permissions.</font>"));
      } else {
        const peopleInput = CardService.newSelectionInput()
          .setFieldName(`people_${propertyId}`)
          .setTitle("Select Notion Users")
          .setType(CardService.SelectionInputType.CHECK_BOX);
        
        notionUsers.forEach(user => {
          peopleInput.addItem(user.name, user.id, selectedUsers.includes(user.id));
        });
        
        widgets.push(peopleInput);
      }
      
      return widgets; // RETURN ARRAY
    },
    
    /**
     * Process data for Notion API for people properties
     */
    processForNotion: function(mapping, emailData, apiKey) {
      if (!mapping.enabled || !mapping.selectedUsers || mapping.selectedUsers.length === 0) {
        return null;
      }
      
      return {
        people: mapping.selectedUsers.map(userId => ({ id: userId }))
      };
    }
  },
  
  // ============================================
  // RELATION PROPERTY HANDLER (Enhanced)
  // ============================================
  relation: {
    /**
     * Process configuration for relation properties
     */
    processConfiguration: function(property, formInputs) {
      const selectedDb = formInputs[`relation_database_${property.id}`] || "";
      const relationType = formInputs[`relation_type_${property.id}`] || "none";
      const matchProperty = formInputs[`relation_match_property_${property.id}`] || "";
      const matchValue = formInputs[`relation_match_value_${property.id}`] || "";
      const specificPage = formInputs[`relation_specific_page_${property.id}`] || "";
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: relationType !== "none" && !!selectedDb,
        selectedDatabase: selectedDb,
        relationType: relationType,
        matchProperty: matchProperty,
        matchValue: matchValue,
        specificPage: specificPage,
        isStaticOption: true,
        isRelation: true,
        isRequired: property.isRequired,
        relationConfig: property.config || {}
      };
    },
    
    /**
     * Build UI widgets for relation properties
     * RETURNS: Array of widgets (from external function)
     */
    buildUI: function(property, savedMapping) {
      // This function exists in relation-handler.js
      return buildRelationUI(property, savedMapping);
    },
    
    /**
     * Process data for Notion API for relation properties
     */
    processForNotion: function(mapping, emailData, apiKey) {
      // This function exists in relation-handler.js
      return processRelationForNotion(mapping, emailData, apiKey);
    }
  },
  
  // ============================================
  // DATE PROPERTY HANDLER
  // ============================================
  date: {
    /**
     * Process configuration for date properties
     */
    processConfiguration: function(property, formInputs) {
      const isEnabled = property.isRequired || formInputs[`enabled_${property.id}`] === "true";
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: isEnabled,
        emailField: formInputs[`emailField_${property.id}`] || getRecommendedEmailField(property.type) || "date",
        transformation: formInputs[`transformation_${property.id}`] || "parse_date",
        isStaticOption: false,
        isRequired: property.isRequired
      };
    },
    
    /**
     * Build UI widgets for date properties
     * RETURNS: Array of widgets
     */
    buildUI: function(property, savedMapping) {
      // Use the text handler's buildUI which now returns an array
      return PropertyHandlers.text.buildUI(property, savedMapping);
    },
    
    /**
     * Process data for Notion API for date properties
     */
    processForNotion: function(mapping, emailData) {
      return PropertyHandlers.text.processForNotion(mapping, emailData);
    }
  },
  
  // ============================================
  // FILES PROPERTY HANDLER
  // ============================================
  files: {
    /**
     * Process configuration for files properties
     */
    processConfiguration: function(property, formInputs) {
      const isEnabled = property.isRequired || formInputs[`enabled_${property.id}`] === "true";
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: isEnabled,
        emailField: formInputs[`emailField_${property.id}`] || "attachments",
        transformation: formInputs[`transformation_${property.id}`] || "none",
        isStaticOption: false,
        isRequired: property.isRequired
      };
    },
    
    /**
     * Build UI widgets for files properties
     * RETURNS: Array of widgets
     */
    buildUI: function(property, savedMapping) {
      const widgets = [];
      const propertyId = property.id;
      
      widgets.push(CardService.newTextParagraph()
        .setText(`<b>${property.name}</b> <font color="#666">(Files)</font>`));
      
      if (property.isRequired) {
        widgets.push(CardService.newTextParagraph()
          .setText("<font color='#d93025'>⚠️ Required field</font>"));
      } else {
        widgets.push(CardService.newSelectionInput()
          .setType(CardService.SelectionInputType.CHECK_BOX)
          .setFieldName(`enabled_${propertyId}`)
          .addItem("Include attachments", "true", savedMapping.enabled));
      }
      
      widgets.push(CardService.newTextParagraph()
        .setText("<i>Email attachments will be uploaded to Google Drive and linked here.</i>"));
      
      return widgets; // RETURN ARRAY
    },
    
    /**
     * Process data for Notion API for files properties
     */
    processForNotion: function(mapping, emailData, apiKey) {
      if (!mapping.enabled) return null;
      
      // This would need to integrate with your file upload logic
      // For now, return null - file handling should be done separately
      return null;
    }
  },
  
  // ============================================
  // AUTO-MANAGED PROPERTIES (read-only info)
  // ============================================
  auto_managed: {
    /**
     * Process configuration for auto-managed properties
     */
    processConfiguration: function(property, formInputs) {
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: false,
        isAutoManaged: true,
        isStaticOption: false
      };
    },
    
    /**
     * Build UI widgets for auto-managed properties
     * RETURNS: Array of widgets
     */
    buildUI: function(property, savedMapping) {
      const widgets = [];
      
      widgets.push(CardService.newTextParagraph()
        .setText(`<b>${property.name}</b> <font color="#666">(${getPropertyTypeDisplayName(property.type)})</font>`));
      
      widgets.push(CardService.newTextParagraph()
        .setText("<i>⚠️ Auto-managed by Notion - cannot be mapped</i>"));
      
      widgets.push(CardService.newTextParagraph()
        .setText('<font color="#5F6368">This property is automatically managed by Notion.</font>'));
      
      return widgets; // RETURN ARRAY
    },
    
    /**
     * Process data for Notion API for auto-managed properties
     */
    processForNotion: function(mapping, emailData, apiKey) {
      // Auto-managed properties are handled by Notion
      return null;
    }
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get property handler for a specific property type
 */
function getPropertyHandler(propertyType) {
  const handlerMap = {
    // Text-based properties
    'title': PropertyHandlers.text,
    'rich_text': PropertyHandlers.text,
    'email': PropertyHandlers.text,
    'url': PropertyHandlers.text,
    'number': PropertyHandlers.text,
    'phone_number': PropertyHandlers.text,
    
    // Static value properties
    'select': PropertyHandlers.static,
    'status': PropertyHandlers.static,
    'checkbox': PropertyHandlers.static,
    'multi_select': PropertyHandlers.static,
    
    // Special properties
    'people': PropertyHandlers.people,
    'relation': PropertyHandlers.relation,
    'date': PropertyHandlers.date,
    'files': PropertyHandlers.files,
    
    // Auto-managed properties
    'created_time': PropertyHandlers.auto_managed,
    'created_by': PropertyHandlers.auto_managed,
    'last_edited_time': PropertyHandlers.auto_managed,
    'last_edited_by': PropertyHandlers.auto_managed,
    'formula': PropertyHandlers.auto_managed,
    'rollup': PropertyHandlers.auto_managed
  };
  
  return handlerMap[propertyType] || PropertyHandlers.text;
}

/**
 * Get property type display name
 */
function getPropertyTypeDisplayName(propertyType) {
  const displayNames = {
    'title': 'Title',
    'rich_text': 'Text',
    'email': 'Email',
    'url': 'URL',
    'number': 'Number',
    'phone_number': 'Phone',
    'select': 'Select',
    'status': 'Status',
    'checkbox': 'Checkbox',
    'multi_select': 'Multi-select',
    'people': 'People',
    'relation': 'Relation',
    'date': 'Date',
    'files': 'Files',
    'created_time': 'Created Time',
    'created_by': 'Created By',
    'last_edited_time': 'Last Edited Time',
    'last_edited_by': 'Last Edited By',
    'formula': 'Formula',
    'rollup': 'Rollup'
  };
  
  return displayNames[propertyType] || propertyType;
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PropertyHandlers,
    getPropertyHandler,
    getPropertyTypeDisplayName
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================



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
  console.log(`🔄 applyTransformation: transformation="${transformation}", value type: ${typeof value}`);
  
  // Return falsy values (except false and 0) as-is early
  if (!value && value !== false && value !== 0) {
    console.log(`  ⚠️ Returning falsy value as-is`);
    return value;
  }
  
  // Helper to get string value safely for transformations that need it
  const getStringValue = () => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  };
  
  const strValue = getStringValue();
  console.log(`  String value preview: "${strValue.substring(0, 80)}${strValue.length > 80 ? '...' : ''}"`);
  
// Helper function to parse Gmail date strings robustly - ENHANCED VERSION
const parseGmailDate = (dateStr) => {
  // Remove any leading/trailing quotes or spaces
  dateStr = dateStr.trim().replace(/^["']|["']$/g, '');
  
  let parsedDate = null;
  
  // 1. PRIMARY METHOD: Try direct Date constructor (handles ISO, RFC 2822)
  parsedDate = new Date(dateStr);
  
  // 2. SECONDARY: If primary failed, try specific patterns
  if (isNaN(parsedDate.getTime())) {
    try {
      // Pattern A: "19/12/2025 18:24" (Day/Month/Year)
      const dmyPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
      const dmyMatch = dateStr.match(dmyPattern);
      
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1; // JS months are 0-indexed
        const year = parseInt(dmyMatch[3], 10);
        const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
        const minute = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
        const second = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
        
        parsedDate = new Date(year, month, day, hour, minute, second);
        console.log(`  ✓ Parsed DD/MM/YYYY format: ${day}/${month+1}/${year} ${hour}:${minute}`);
      }
      
      // Pattern B: Use Utilities.parseDate for RFC 2822 with timezone
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        const timezone = Session.getScriptTimeZone();
        parsedDate = Utilities.parseDate(dateStr, timezone, "EEE, d MMM yyyy HH:mm:ss Z");
      }
    } catch (e) {
      console.log(`  ⚠️ Advanced parsing failed for: "${dateStr}"`);
    }
  }
  
  // 3. FINAL CHECK: Validate we have a real date
  if (parsedDate && !isNaN(parsedDate.getTime())) {
    return parsedDate;
  }
  
  console.log(`  ❌ Could not parse any known date format from: "${dateStr}"`);
  return null;
};
  switch (transformation) {
    case 'remove_prefixes':
      const result1 = strValue.replace(/^(Re:|Fwd:|RE:|FWD:)\s*/i, '').trim();
      console.log(`  🔄 Applied remove_prefixes`);
      return result1;
      
    case 'truncate_100':
      const result2 = strValue.substring(0, 100) + (strValue.length > 100 ? '...' : '');
      console.log(`  🔄 Applied truncate_100`);
      return result2;
      
    case 'truncate_500':
      const result3 = strValue.substring(0, 500) + (strValue.length > 500 ? '...' : '');
      console.log(`  🔄 Applied truncate_500`);
      return result3;
      
    case 'html_to_text':
      const result4 = strValue
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      console.log(`  🔄 Applied html_to_text`);
      return result4;
      
    case 'extract_links':
      // Improved URL matching
      const urlMatches = strValue.match(/https?:\/\/[^\s\]()]+(?:\.[^\s\]()]+)*/g) || [];
      const result5 = urlMatches.join(', ');
      console.log(`  🔄 Applied extract_links, found ${urlMatches.length} URLs`);
      return result5;
      
    case 'extract_email':
      // More comprehensive email extraction
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
      const emailMatch = strValue.match(emailRegex);
      const result6 = emailMatch ? emailMatch[1] : strValue;
      console.log(`  🔄 Applied extract_email`);
      return result6;
      
    case 'keep_full':
      console.log(`  🔄 Applied keep_full`);
      return strValue;
      
    // ===== FIXED DATE TRANSFORMATIONS =====
    case 'parse_date':
    case 'iso_date':
      try {
        const parsedDate = parseGmailDate(strValue);
        
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          // FOR NOTION API: Must be ISO 8601 format
          // Format: "2025-12-19T16:24:25.000Z"
          const timeZone = Session.getScriptTimeZone();
          const notionDateString = Utilities.formatDate(parsedDate, timeZone, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
          
          console.log(`  🔄 Applied ${transformation}: "${notionDateString}"`);
          return notionDateString;
        } else {
          console.error(`  ❌ ${transformation} failed: Could not parse date from "${strValue}"`);
          // Return original to see the error in Notion's response
          return strValue;
        }
      } catch (error) {
        console.error(`  ❌ ${transformation} error for "${strValue}":`, error.message);
        return strValue;
      }
      
    case 'human_date':
      try {
        const parsedDate = parseGmailDate(strValue);
        
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          // Human readable format, Notion will store as text
          const result9 = parsedDate.toLocaleString();
          console.log(`  🔄 Applied human_date: "${result9}"`);
          return result9;
        } else {
          console.log(`  ⚠️ human_date failed for: "${strValue}"`);
          return strValue;
        }
      } catch (e) {
        console.log(`  ⚠️ human_date failed, returning original: "${strValue}"`);
        return strValue;
      }
      
    case 'make_clickable':
      console.log(`  🔄 Applied make_clickable`);
      return strValue;
      
    case 'count_items':
      if (Array.isArray(value)) {
        const result10 = value.length.toString();
        console.log(`  🔄 Applied count_items (array): "${result10}"`);
        return result10;
      } else if (typeof value === 'string') {
        // Try to split by commas, semicolons, or newlines
        const separators = /[,;\n]/;
        const items = strValue.split(separators).filter(item => item.trim().length > 0);
        const result10 = items.length > 0 ? items.length.toString() : "0";
        console.log(`  🔄 Applied count_items (string): "${result10}" items`);
        return result10;
      } else {
        console.log(`  🔄 Applied count_items (single): "1"`);
        return "1";
      }
      
    case 'extract_number':
      const numMatch = strValue.match(/-?\d+(\.\d+)?/);
      const result11 = numMatch ? numMatch[0] : "0";
      console.log(`  🔄 Applied extract_number: "${result11}"`);
      return result11;
      
    case 'exists_to_true':
      // Check if value exists and is not empty
      const exists = !!(value && 
        (typeof value !== 'string' || value.trim().length > 0) &&
        (!Array.isArray(value) || value.length > 0));
      console.log(`  🔄 Applied exists_to_true: "${exists}"`);
      return exists;
      
    case 'yes_no':
      const boolValue = !!(value && 
        (typeof value !== 'string' || value.trim().length > 0) &&
        (!Array.isArray(value) || value.length > 0));
      const result13 = boolValue ? "Yes" : "No";
      console.log(`  🔄 Applied yes_no: "${result13}"`);
      return result13;
      
    case 'split_comma':
      if (Array.isArray(value)) {
        const result14 = value.join(', ');
        console.log(`  🔄 Applied split_comma (array to string): "${result14}"`);
        return result14;
      } else {
        // If it's already a string with commas, split and clean it
        if (strValue.includes(',')) {
          const items = strValue.split(',').map(item => item.trim()).filter(item => item);
          console.log(`  🔄 Applied split_comma (split string): ${items.length} items`);
          return items; // Return as array for multi-select
        }
        console.log(`  🔄 Applied split_comma (string as-is)`);
        return strValue;
      }
      
    case 'first_item':
      if (Array.isArray(value) && value.length > 0) {
        const result15 = value[0];
        console.log(`  🔄 Applied first_item: "${result15}"`);
        return result15;
      } else if (typeof value === 'string' && value.includes(',')) {
        const first = value.split(',')[0].trim();
        console.log(`  🔄 Applied first_item (from CSV): "${first}"`);
        return first;
      } else {
        console.log(`  🔄 Applied first_item: "${strValue}"`);
        return strValue;
      }
      
    case 'join_items':
      if (Array.isArray(value)) {
        const result16 = value.join(', ');
        console.log(`  🔄 Applied join_items: "${result16}"`);
        return result16;
      } else {
        console.log(`  🔄 Applied join_items (string): "${strValue}"`);
        return strValue;
      }
      
    case 'upload_drive':
      console.log(`  🔄 Applied upload_drive`);
      return strValue;
      
    case 'skip_files':
      console.log(`  🔄 Applied skip_files`);
      return strValue;
      
    default:
      console.log(`  🔄 No transformation ("${transformation}"), returning value as-is`);
      return value;
  }
}

/**
 * Format value for Notion API based on property type
 * @param {any} value - Value to format (should already be transformed)
 * @param {string} propertyType - Notion property type
 * @returns {Object|null} Formatted property for Notion API
 */
function formatForNotionAPI(value, propertyType) {
  console.log(`📦 formatForNotionAPI: type="${propertyType}", value="${value}"`);
  
  if (!value && value !== false && value !== 0) {
    console.log(`  ⚠️ Returning null - value is falsy`);
    return null;
  }
  
  const strValue = value.toString();
  
  switch (propertyType) {
    case 'title':
      return { 
        title: [{ 
          type: 'text', 
          text: { content: strValue } 
        }] 
      };
      
    case 'rich_text':
      // Split text into 2000-character chunks for Notion API limit
      const MAX_CHARS = 2000;
      const textBlocks = [];
      
      for (let i = 0; i < strValue.length; i += MAX_CHARS) {
        textBlocks.push({
          type: 'text',
          text: {
            content: strValue.substring(i, Math.min(i + MAX_CHARS, strValue.length))
          }
        });
      }
      
      return { rich_text: textBlocks };
      
    case 'email':
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(strValue) ? { email: strValue } : null;
      
    case 'url':
      // Simple URL validation
      const hasProtocol = strValue.startsWith('http://') || strValue.startsWith('https://');
      const hasDot = strValue.includes('.');
      const hasSpaces = strValue.includes(' ');
      
      if (hasProtocol && !hasSpaces) {
        return { url: strValue };
      } else if (!hasProtocol && hasDot && !hasSpaces) {
        return { url: 'https://' + strValue };
      } else {
        return null;
      }
      
    case 'number':
      const num = parseFloat(strValue);
      return !isNaN(num) ? { number: num } : null;
      
    case 'phone_number':
      return { phone_number: strValue };
      
    case 'date':
      console.log(`  📅 Processing DATE property with value: "${strValue}"`);
      
      // Validate it's an ISO date string
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      
      if (isoDateRegex.test(strValue)) {
        // CORRECT STRUCTURE for Notion API
        const result = {
          date: {
            start: strValue
          }
        };
        console.log(`  ✅ Returning date structure:`, JSON.stringify(result));
        return result;
      } else {
        // Try to convert if not already ISO
        try {
          const dateObj = new Date(strValue);
          if (!isNaN(dateObj.getTime())) {
            const isoString = dateObj.toISOString();
            const result = {
              date: {
                start: isoString
              }
            };
            console.log(`  🔄 Converted to ISO:`, JSON.stringify(result));
            return result;
          }
        } catch (e) {
          console.error(`  ❌ Could not parse as date: "${strValue}"`);
        }
        console.log(`  ⚠️ Returning null - invalid date format`);
        return null;
      }
      
    case 'checkbox':
      // Convert to boolean for Notion
      const boolValue = strValue.toLowerCase() === 'true' || strValue === '1' || strValue === 'yes';
      return { checkbox: boolValue };
      
    case 'select':
      return { select: { name: strValue } };
      
    case 'multi_select':
      // Expect comma-separated values or array
      const items = Array.isArray(value) ? value : strValue.split(',').map(item => item.trim());
      return { 
        multi_select: items.map(item => ({ name: item })) 
      };
      
    default:
      console.log(`  ❓ Unknown property type: "${propertyType}"`);
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