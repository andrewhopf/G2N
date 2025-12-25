/**
 * @fileoverview Property handlers for Notion property types/
 * @version 2.0.0
 * @description Handles configuration, UI building, and data processing for each property type
 */

/**
 * Main property handlers object
 * @type {Object}
 */
const PropertyHandlers = {
  // ============================================
  // TEXT-BASED PROPERTIES (title, rich_text, email, url, number, phone_number)
  // ============================================
  text: {
    /**
     * Process configuration for text-based properties
     * @param {Object} property - Notion property object
     * @param {Object} formInput - Form input data
     * @returns {Object} Processed configuration
     */
    processConfiguration: function(property, formInput) {
      const isEnabled = property.isRequired || formInput["enabled_" + property.id] === "true";
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: isEnabled,
        emailField: formInput["emailField_" + property.id] || getRecommendedEmailField(property.type) || "subject",
        transformation: formInput["transformation_" + property.id] || "none",
        isStaticOption: false,
        isRequired: property.isRequired
      };
    },
    
    /**
     * Build UI widgets for text-based properties
     * @param {Object} property - Notion property object
     * @param {Object} currentConfig - Current configuration
     * @returns {Array<CardService.Widget>} Array of UI widgets
     */
    buildUI: function(property, currentConfig) {
      const widgets = [];
      const propertyId = property.id;
      const isRequired = property.isRequired || false;
      
      // Property header
      widgets.push(
        CardService.newTextParagraph()
          .setText(`<b>${property.name}</b> <font color="#666">(${getPropertyTypeDisplayName(property.type)})</font>`)
      );
      
      if (isRequired) {
        widgets.push(
          CardService.newTextParagraph()
            .setText("<font color='#d93025'>⚠️ Required field</font>")
        );
      } else if (property.type !== "title") {
        // Enabled toggle (skip for title which is always enabled)
        widgets.push(
          CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.CHECK_BOX)
            .setFieldName("enabled_" + propertyId)
            .addItem("Map this property", "true", currentConfig.enabled)
        );
      }
      
      // Email field selection
      const emailFieldDropdown = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName("emailField_" + propertyId)
        .setTitle("Email Source");
      
      // Add default option
      emailFieldDropdown.addItem("-- Select Gmail field --", "", !currentConfig.emailField);
      
      // Add available Gmail fields
      getAvailableGmailFields().forEach(field => {
        emailFieldDropdown.addItem(field.label, field.value, currentConfig.emailField === field.value);
      });
      
      widgets.push(emailFieldDropdown);
      
      // Transformation options (if applicable)
      if (shouldShowGmailFieldMapping(property.type)) {
        const transformations = getTransformationOptions(property.type);
        
        if (transformations.length > 1) {
          const transformationDropdown = CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.DROPDOWN)
            .setFieldName("transformation_" + propertyId)
            .setTitle("Data Processing");
          
          transformations.forEach(transform => {
            transformationDropdown.addItem(
              transform.label,
              transform.value,
              currentConfig.transformation === transform.value
            );
          });
          
          widgets.push(transformationDropdown);
        }
      }
      
      return widgets;
    },
    
    /**
     * Process data for Notion API for text-based properties
     * @param {Object} mapping - Property mapping configuration
     * @param {Object} emailData - Extracted email data
     * @returns {Object|null} Formatted property for Notion API
     */
    processForNotion: function(mapping, emailData) {
      if (!mapping.enabled) {
        return null;
      }
      
      let value = emailData[mapping.emailField];
      
      // Handle falsy values (except false and 0)
      if (!value && value !== false && value !== 0) {
        return null;
      }
      
      // Apply transformation
      value = applyTransformation(value, mapping.transformation);
      
      // Format for Notion API
      return formatForNotionAPI(value, mapping.type);
    }
  },
  
  // ============================================
  // STATIC VALUE PROPERTIES (select, status, checkbox, multi_select)
  // ============================================
  static: {
    /**
     * Process configuration for static value properties
     * @param {Object} property - Notion property object
     * @param {Object} formInput - Form input data
     * @returns {Object} Processed configuration
     */
    processConfiguration: function(property, formInput) {
      const config = {
        type: property.type,
        notionPropertyName: property.name,
        enabled: false,
        isStaticOption: true,
        isRequired: property.isRequired
      };
      
      switch (property.type) {
        case "checkbox":
          config.enabled = formInput["checkbox_" + property.id] === "true";
          config.checkboxValue = config.enabled;
          break;
          
        case "select":
        case "status":
          const selectedOption = formInput["option_" + property.id] || "";
          config.enabled = !!selectedOption;
          config.selectedOption = selectedOption;
          config.options = property.config.options || [];
          break;
          
        case "multi_select":
          let selectedOptions = [];
          const inputValue = formInput["options_" + property.id];
          
          if (Array.isArray(inputValue)) {
            selectedOptions.push(...inputValue);
          } else if (inputValue) {
            selectedOptions.push(inputValue);
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
     * @param {Object} property - Notion property object
     * @param {Object} currentConfig - Current configuration
     * @returns {Array<CardService.Widget>} Array of UI widgets
     */
    buildUI: function(property, currentConfig) {
      const widgets = [];
      const propertyId = property.id;
      const propertyType = property.type;
      
      // Property header
      widgets.push(
        CardService.newTextParagraph()
          .setText(`<b>${property.name}</b> <font color="#666">(${getPropertyTypeDisplayName(propertyType)})</font>`)
      );
      
      if (property.isRequired) {
        widgets.push(
          CardService.newTextParagraph()
            .setText("<font color='#d93025'>⚠️ Required field</font>")
        );
      }
      
      switch (propertyType) {
        case "checkbox":
          widgets.push(
            CardService.newTextParagraph()
              .setText("<i>Set checkbox value:</i>")
          );
          
          widgets.push(
            CardService.newSelectionInput()
              .setFieldName("checkbox_" + propertyId)
              .setTitle("Checkbox Value")
              .setType(CardService.SelectionInputType.CHECK_BOX)
              .addItem("Check the Check Box", "true", currentConfig.checkboxValue === true)
          );
          break;
          
        case "select":
        case "status":
          widgets.push(
            CardService.newTextParagraph()
              .setText("<i>Select a value to always use:</i>")
          );
          
          const optionSelector = CardService.newSelectionInput()
            .setFieldName("option_" + propertyId)
            .setTitle("Select Option")
            .setType(CardService.SelectionInputType.RADIO_BUTTON);
          
          // Add "don't set" option
          optionSelector.addItem("(Don't set a value)", "", currentConfig.selectedOption === "");
          
          // Add property options
          (property.config.options || []).forEach(option => {
            optionSelector.addItem(
              option.name,
              option.name,
              currentConfig.selectedOption === option.name
            );
          });
          
          widgets.push(optionSelector);
          break;
          
        case "multi_select":
          widgets.push(
            CardService.newTextParagraph()
              .setText("<i>Select values to always include:</i>")
          );
          
          const multiOptionSelector = CardService.newSelectionInput()
            .setFieldName("options_" + propertyId)
            .setTitle("Select Options")
            .setType(CardService.SelectionInputType.CHECK_BOX);
          
          const selectedOptions = currentConfig.selectedOptions || [];
          
          (property.config.options || []).forEach(option => {
            multiOptionSelector.addItem(
              option.name,
              option.name,
              selectedOptions.includes(option.name)
            );
          });
          
          widgets.push(multiOptionSelector);
          break;
      }
      
      return widgets;
    },
    
    /**
     * Process data for Notion API for static value properties
     * @param {Object} mapping - Property mapping configuration
     * @param {Object} emailData - Extracted email data
     * @returns {Object|null} Formatted property for Notion API
     */
    processForNotion: function(mapping) {
      if (!mapping.enabled) {
        return null;
      }
      
      switch (mapping.type) {
        case "checkbox":
          return { checkbox: mapping.checkboxValue };
          
        case "select":
        case "status":
          return mapping.selectedOption 
            ? { select: { name: mapping.selectedOption } }
            : null;
          
        case "multi_select":
          return mapping.selectedOptions && mapping.selectedOptions.length > 0
            ? { multi_select: mapping.selectedOptions.map(name => ({ name })) }
            : null;
          
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
     * @param {Object} property - Notion property object
     * @param {Object} formInput - Form input data
     * @returns {Object} Processed configuration
     */
    processConfiguration: function(property, formInput) {
      let selectedUsers = [];
      const inputValue = formInput["people_" + property.id];
      
      if (Array.isArray(inputValue)) {
        selectedUsers.push(...inputValue);
      } else if (inputValue) {
        selectedUsers.push(inputValue);
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
     * @param {Object} property - Notion property object
     * @param {Object} currentConfig - Current configuration
     * @returns {Array<CardService.Widget>} Array of UI widgets
     */
    buildUI: function(property, currentConfig) {
      const widgets = [];
      const propertyId = property.id;
      
      // Property header
      widgets.push(
        CardService.newTextParagraph()
          .setText(`<b>${property.name}</b> <font color="#666">(People)</font>`)
      );
      
      if (property.isRequired) {
        widgets.push(
          CardService.newTextParagraph()
            .setText("<font color='#d93025'>⚠️ Required field</font>")
        );
      }
      
      widgets.push(
        CardService.newTextParagraph()
          .setText("<i>Select Notion workspace users to assign:</i>")
      );
      
      // Fetch Notion users
      const notionUsers = fetchNotionWorkspaceUsers();
      const selectedUsers = currentConfig.selectedUsers || [];
      
      if (notionUsers.length === 0) {
        widgets.push(
          CardService.newTextParagraph()
            .setText("<font color='#FF6B6B'>⚠️ No Notion users found. Check API permissions.</font>")
        );
      } else {
        const userSelector = CardService.newSelectionInput()
          .setFieldName("people_" + propertyId)
          .setTitle("Select Notion Users")
          .setType(CardService.SelectionInputType.CHECK_BOX);
        
        notionUsers.forEach(user => {
          userSelector.addItem(
            user.name,
            user.id,
            selectedUsers.includes(user.id)
          );
        });
        
        widgets.push(userSelector);
      }
      
      return widgets;
    },
    
    /**
     * Process data for Notion API for people properties
     * @param {Object} mapping - Property mapping configuration
     * @param {Object} emailData - Extracted email data
     * @param {string} apiKey - Notion API key
     * @returns {Object|null} Formatted property for Notion API
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
  // RELATION PROPERTY HANDLER
  // ============================================
  relation: {
    /**
     * Process configuration for relation properties
     * @param {Object} property - Notion property object
     * @param {Object} formInput - Form input data
     * @returns {Object} Processed configuration
     */
    processConfiguration: function(property, formInput) {
      // Use the new relation configuration processor from RelationHandler.js
      return processRelationConfiguration(property, formInput);
    },
    
    /**
     * Build UI widgets for relation properties
     * @param {Object} property - Notion property object
     * @param {Object} currentConfig - Current configuration
     * @returns {Array<CardService.Widget>} Array of UI widgets
     */
    buildUI: function(property, currentConfig) {
      // This function exists in RelationHandler.js
      return buildRelationUI(property, currentConfig);
    },
    
    /**
     * Process data for Notion API for relation properties
     * @param {Object} mapping - Property mapping configuration
     * @param {Object} emailData - Extracted email data
     * @param {string} apiKey - Notion API key
     * @returns {Object|null} Formatted property for Notion API
     */
    processForNotion: function(mapping, emailData, apiKey) {
      // This function exists in RelationHandler.js
      return processRelationForNotion(mapping, emailData, apiKey);
    }
  },
  
  // ============================================
  // DATE PROPERTY HANDLER
  // ============================================
  date: {
    /**
     * Process configuration for date properties
     * @param {Object} property - Notion property object
     * @param {Object} formInput - Form input data
     * @returns {Object} Processed configuration
     */
    processConfiguration: function(property, formInput) {
      const isEnabled = property.isRequired || formInput["enabled_" + property.id] === "true";
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: isEnabled,
        emailField: formInput["emailField_" + property.id] || getRecommendedEmailField(property.type) || "date",
        transformation: formInput["transformation_" + property.id] || "parse_date",
        isStaticOption: false,
        isRequired: property.isRequired
      };
    },
    
    /**
     * Build UI widgets for date properties
     * @param {Object} property - Notion property object
     * @param {Object} currentConfig - Current configuration
     * @returns {Array<CardService.Widget>} Array of UI widgets
     */
    buildUI: function(property, currentConfig) {
      // Use the text handler's buildUI which now returns an array
      return PropertyHandlers.text.buildUI(property, currentConfig);
    },
    
    /**
     * Process data for Notion API for date properties
     * @param {Object} mapping - Property mapping configuration
     * @param {Object} emailData - Extracted email data
     * @returns {Object|null} Formatted property for Notion API
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
     * @param {Object} property - Notion property object
     * @param {Object} formInput - Form input data
     * @returns {Object} Processed configuration
     */
    processConfiguration: function(property, formInput) {
      const isEnabled = property.isRequired || formInput["enabled_" + property.id] === "true";
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: isEnabled,
        emailField: formInput["emailField_" + property.id] || "attachments",
        transformation: formInput["transformation_" + property.id] || "none",
        isStaticOption: false,
        isRequired: property.isRequired
      };
    },
    
    /**
     * Build UI widgets for files properties
     * @param {Object} property - Notion property object
     * @param {Object} currentConfig - Current configuration
     * @returns {Array<CardService.Widget>} Array of UI widgets
     */
    buildUI: function(property, currentConfig) {
      const widgets = [];
      const propertyId = property.id;
      
      widgets.push(
        CardService.newTextParagraph()
          .setText(`<b>${property.name}</b> <font color="#666">(Files)</font>`)
      );
      
      if (property.isRequired) {
        widgets.push(
          CardService.newTextParagraph()
            .setText("<font color='#d93025'>⚠️ Required field</font>")
        );
      } else {
        widgets.push(
          CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.CHECK_BOX)
            .setFieldName("enabled_" + propertyId)
            .addItem("Include attachments", "true", currentConfig.enabled)
        );
      }
      
      widgets.push(
        CardService.newTextParagraph()
          .setText("<i>Email attachments will be uploaded to Google Drive and linked here.</i>")
      );
      
      return widgets;
    },
    
    /**
     * Process data for Notion API for files properties
     * @param {Object} mapping - Property mapping configuration
     * @param {Object} emailData - Extracted email data
     * @param {string} apiKey - Notion API key
     * @returns {Object|null} Formatted property for Notion API
     */
    processForNotion: function(mapping, emailData, apiKey) {
      // This would need to integrate with your file upload logic
      // For now, return null - file handling should be done separately
      if (!mapping.enabled) {
        return null;
      }
      
      // Placeholder - actual implementation would handle file attachments
      return null;
    }
  },
  
  // ============================================
  // AUTO-MANAGED PROPERTIES (read-only info)
  // ============================================
  auto_managed: {
    /**
     * Process configuration for auto-managed properties
     * @param {Object} property - Notion property object
     * @param {Object} formInput - Form input data
     * @returns {Object} Processed configuration
     */
    processConfiguration: function(property) {
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
     * @param {Object} property - Notion property object
     * @param {Object} currentConfig - Current configuration
     * @returns {Array<CardService.Widget>} Array of UI widgets
     */
    buildUI: function(property) {
      const widgets = [];
      
      widgets.push(
        CardService.newTextParagraph()
          .setText(`<b>${property.name}</b> <font color="#666">(${getPropertyTypeDisplayName(property.type)})</font>`)
      );
      
      widgets.push(
        CardService.newTextParagraph()
          .setText("<i>⚠️ Auto-managed by Notion - cannot be mapped</i>")
      );
      
      widgets.push(
        CardService.newTextParagraph()
          .setText('<font color="#5F6368">This property is automatically managed by Notion.</font>')
      );
      
      return widgets;
    },
    
    /**
     * Process data for Notion API for auto-managed properties
     * @returns {null} Always returns null for auto-managed properties
     */
    processForNotion: function() {
      // Auto-managed properties are handled by Notion
      return null;
    }
  }
};

/**
 * Get property handler for a specific property type
 * @param {string} propertyType - Notion property type
 * @returns {Object|null} Property handler object
 */
function getPropertyHandler(propertyType) {
  const handlerMap = {
    // Text-based properties
    title: PropertyHandlers.text,
    rich_text: PropertyHandlers.text,
    email: PropertyHandlers.text,
    url: PropertyHandlers.text,
    number: PropertyHandlers.text,
    phone_number: PropertyHandlers.text,
    
    // Static value properties
    select: PropertyHandlers.static,
    status: PropertyHandlers.static,
    checkbox: PropertyHandlers.static,
    multi_select: PropertyHandlers.static,
    
    // Special properties
    people: PropertyHandlers.people,
    relation: PropertyHandlers.relation,
    date: PropertyHandlers.date,
    files: PropertyHandlers.files,
    
    // Auto-managed properties
    created_time: PropertyHandlers.auto_managed,
    created_by: PropertyHandlers.auto_managed,
    last_edited_time: PropertyHandlers.auto_managed,
    last_edited_by: PropertyHandlers.auto_managed,
    formula: PropertyHandlers.auto_managed,
    rollup: PropertyHandlers.auto_managed
  };
  
  return handlerMap[propertyType] || PropertyHandlers.text;
}

/**
 * Optimized transformation lookup table
 */
const TRANSFORMATIONS = {
  remove_prefixes: (text) => text.replace(/^(Re:|Fwd:|RE:|FWD:)\s*/i, "").trim(),
  truncate_100: (text) => text.substring(0, 100) + (text.length > 100 ? "..." : ""),
  truncate_500: (text) => text.substring(0, 500) + (text.length > 500 ? "..." : ""),
  html_to_text: (html) => {
    if (!html || typeof html !== 'string') return '';
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },
  extract_links: (text) => {
    const links = text && text.match(/https?:\/\/[^\s\]()]+(?:\.[^\s\]()]+)*/g);
    return links ? links.join(", ") : "";
  },
  extract_email: (text) => {
    const match = text && text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return match ? match[1] : text || "";
  },
  keep_full: (value) => value,
  parse_date: (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date.toISOString();
    
    const formats = [
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
      /^(\d{4})-(\d{1,2})-(\d{1,2})/
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        try {
          const parsed = new Date(
            parseInt(match[3] || match[1]),
            parseInt(match[2] || match[2]) - 1,
            parseInt(match[1] || match[3]),
            parseInt(match[4]) || 0,
            parseInt(match[5]) || 0,
            parseInt(match[6]) || 0
          );
          if (!isNaN(parsed.getTime())) return parsed.toISOString();
        } catch (e) {
          continue;
        }
      }
    }
    
    return dateStr;
  },
  none: (value) => value
};

/**
 * Optimized applyTransformation function (REPLACE the existing one)
 */
function applyTransformation(value, transformation) {
  if (!value && value !== false && value !== 0) {
    return value;
  }
  
  const stringValue = typeof value === 'string' ? value :
                     Array.isArray(value) ? value.join(", ") :
                     String(value);
  
  const transformFn = TRANSFORMATIONS[transformation] || TRANSFORMATIONS.none;
  return transformFn(stringValue);
}

/**
 * Format value for Notion API based on property type
 * @param {any} value - Value to format (should already be transformed)
 * @param {string} propertyType - Notion property type
 * @returns {Object|null} Formatted property for Notion API
 */
function formatForNotionAPI(value, propertyType) {
  console.log(`📦 formatForNotionAPI: type="${propertyType}", value="${value}"`);
  
  // Handle falsy values (except false and 0)
  if (!value && value !== false && value !== 0) {
    console.log("  ⚠️ Returning null - value is falsy");
    return null;
  }
  
  const stringValue = value.toString();
  
  switch (propertyType) {
    case "title":
      return {
        title: [{
          type: "text",
          text: { content: stringValue }
        }]
      };
      
    case "rich_text":
      // Split text into 2000-character chunks for Notion API limit
      const textChunks = [];
      for (let i = 0; i < stringValue.length; i += 2000) {
        textChunks.push({
          type: "text",
          text: { content: stringValue.substring(i, Math.min(i + 2000, stringValue.length)) }
        });
      }
      return { rich_text: textChunks };
      
    case "email":
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(stringValue) ? { email: stringValue } : null;
      
    case "url":
      // Simple URL validation
      const isHttp = stringValue.startsWith("http://") || stringValue.startsWith("https://");
      const hasDot = stringValue.includes(".");
      const hasSpace = stringValue.includes(" ");
      
      if (isHttp && !hasSpace) {
        return { url: stringValue };
      } else if (!isHttp && hasDot && !hasSpace) {
        return { url: "https://" + stringValue };
      } else {
        return null;
      }
      
    case "number":
      const numberValue = parseFloat(stringValue);
      return isNaN(numberValue) ? null : { number: numberValue };
      
    case "phone_number":
      return { phone_number: stringValue };
      
    case "date":
      console.log(`  📅 Processing DATE property with value: "${stringValue}"`);
      
      // Check if already in ISO format
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      if (isoRegex.test(stringValue)) {
        const dateObject = { date: { start: stringValue } };
        console.log("  ✅ Returning date structure:", JSON.stringify(dateObject));
        return dateObject;
      }
      
      // Try to convert if not already ISO
      try {
        const dateObj = new Date(stringValue);
        if (!isNaN(dateObj.getTime())) {
          const dateObject = { date: { start: dateObj.toISOString() } };
          console.log("  🔄 Converted to ISO:", JSON.stringify(dateObject));
          return dateObject;
        }
      } catch (dateError) {
        console.error(`  ❌ Could not parse as date: "${stringValue}"`);
      }
      
      console.log("  ⚠️ Returning null - invalid date format");
      return null;
      
    case "checkbox":
      const isChecked = stringValue.toLowerCase() === "true" || 
                       stringValue === "1" || 
                       stringValue.toLowerCase() === "yes";
      return { checkbox: isChecked };
      
    case "select":
      return { select: { name: stringValue } };
      
    case "multi_select":
      const items = Array.isArray(value) ? value : stringValue.split(",").map(item => item.trim());
      return { multi_select: items.map(item => ({ name: item })) };
      
    default:
      console.log(`  ❓ Unknown property type: "${propertyType}"`);
      return null;
  }
}