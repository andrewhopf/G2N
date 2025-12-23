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
      const selectedDatabase = formInput["relation_database_" + property.id] || "";
      const relationType = formInput["relation_type_" + property.id] || "none";
      
      return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: relationType !== "none" && !!selectedDatabase,
        selectedDatabase: selectedDatabase,
        relationType: relationType,
        matchProperty: formInput["relation_match_property_" + property.id] || "",
        matchValue: formInput["relation_match_value_" + property.id] || "",
        specificPage: formInput["relation_specific_page_" + property.id] || "",
        isStaticOption: true,
        isRelation: true,
        isRequired: property.isRequired,
        relationConfig: property.config || {}
      };
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
 * Apply transformation to value based on transformation type
 * @param {any} value - Input value
 * @param {string} transformation - Transformation type
 * @returns {any} Transformed value
 */
function applyTransformation(value, transformation) {
  console.log(`🔄 applyTransformation: transformation="${transformation}", value type: ${typeof value}`);
  
  // Return falsy values (except false and 0) as-is early
  if (!value && value !== false && value !== 0) {
    console.log("  ⚠️ Returning falsy value as-is");
    return value;
  }
  
  // Helper to get string value safely for transformations that need it
  let stringValue = typeof value === "string" ? value : 
                   Array.isArray(value) ? value.join(", ") : 
                   String(value);
  
  console.log(`  String value preview: "${stringValue.substring(0, 80)}${stringValue.length > 80 ? "..." : ""}"`);
  
  // Helper function for date parsing
  const parseDate = (dateString) => {
    // Remove any leading/trailing quotes or spaces
    dateString = dateString.trim().replace(/^["']|["']$/g, "");
    let date = null;
    
    // 1. PRIMARY METHOD: Try direct Date constructor (handles ISO, RFC 2822)
    // 2. SECONDARY: If primary failed, try specific patterns
    date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      try {
        // Pattern A: "19/12/2025 18:24" (Day/Month/Year)
        const dayMonthYearPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
        const dayMonthYearMatch = dateString.match(dayMonthYearPattern);
        
        if (dayMonthYearMatch) {
          const day = parseInt(dayMonthYearMatch[1], 10);
          const month = parseInt(dayMonthYearMatch[2], 10) - 1;
          const year = parseInt(dayMonthYearMatch[3], 10);
          const hour = dayMonthYearMatch[4] ? parseInt(dayMonthYearMatch[4], 10) : 0;
          const minute = dayMonthYearMatch[5] ? parseInt(dayMonthYearMatch[5], 10) : 0;
          const second = dayMonthYearMatch[6] ? parseInt(dayMonthYearMatch[6], 10) : 0;
          
          date = new Date(year, month, day, hour, minute, second);
          console.log(`  ✓ Parsed DD/MM/YYYY format: ${day}/${month + 1}/${year} ${hour}:${minute}`);
        }
        
        // Pattern B: Use Utilities.parseDate for RFC 2822 with timezone
        if (!date || isNaN(date.getTime())) {
          const timezone = Session.getScriptTimeZone();
          date = Utilities.parseDate(dateString, timezone, "EEE, d MMM yyyy HH:mm:ss Z");
        }
      } catch (parseError) {
        console.log(`  ⚠️ Advanced parsing failed for: "${dateString}"`);
      }
    }
    
    // FINAL CHECK: Validate we have a real date
    if (date && !isNaN(date.getTime())) {
      return date;
    } else {
      console.log(`  ❌ Could not parse any known date format from: "${dateString}"`);
      return null;
    }
  };
  
  switch (transformation) {
    case "remove_prefixes":
      const cleaned = stringValue.replace(/^(Re:|Fwd:|RE:|FWD:)\s*/i, "").trim();
      console.log("  🔄 Applied remove_prefixes");
      return cleaned;
      
    case "truncate_100":
      const truncated100 = stringValue.substring(0, 100) + (stringValue.length > 100 ? "..." : "");
      console.log("  🔄 Applied truncate_100");
      return truncated100;
      
    case "truncate_500":
      const truncated500 = stringValue.substring(0, 500) + (stringValue.length > 500 ? "..." : "");
      console.log("  🔄 Applied truncate_500");
      return truncated500;
      
    case "html_to_text":
      const plainText = stringValue
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      console.log("  🔄 Applied html_to_text");
      return plainText;
      
    case "extract_links":
      // Improved URL matching
      const urlRegex = /https?:\/\/[^\s\]()]+(?:\.[^\s\]()]+)*/g;
      const urls = stringValue.match(urlRegex) || [];
      const urlList = urls.join(", ");
      console.log(`  🔄 Applied extract_links, found ${urls.length} URLs`);
      return urlList;
      
    case "extract_email":
      // More comprehensive email extraction
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
      const emailMatch = stringValue.match(emailRegex);
      const extractedEmail = emailMatch ? emailMatch[1] : stringValue;
      console.log("  🔄 Applied extract_email");
      return extractedEmail;
      
    case "keep_full":
      console.log("  🔄 Applied keep_full");
      return stringValue;
      
    // ===== DATE TRANSFORMATIONS =====
    case "parse_date":
    case "iso_date":
      try {
        const parsedDate = parseDate(stringValue);
        
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          const timezone = Session.getScriptTimeZone();
          const isoDate = Utilities.formatDate(parsedDate, timezone, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
          console.log(`  🔄 Applied ${transformation}: "${isoDate}"`);
          return isoDate;
        } else {
          console.error(`  ❌ ${transformation} failed: Could not parse date from "${stringValue}"`);
          return stringValue;
        }
      } catch (dateError) {
        console.error(`  ❌ ${transformation} error for "${stringValue}":`, dateError.message);
        return stringValue;
      }
      
    case "human_date":
      try {
        const humanDate = parseDate(stringValue);
        
        if (humanDate && !isNaN(humanDate.getTime())) {
          const formattedDate = humanDate.toLocaleString();
          console.log(`  🔄 Applied human_date: "${formattedDate}"`);
          return formattedDate;
        } else {
          console.log(`  ⚠️ human_date failed for: "${stringValue}"`);
          return stringValue;
        }
      } catch (dateError) {
        console.log(`  ⚠️ human_date failed, returning original: "${stringValue}"`);
        return stringValue;
      }
      
    case "make_clickable":
      console.log("  🔄 Applied make_clickable");
      return stringValue;
      
    case "count_items":
      if (Array.isArray(value)) {
        const arrayCount = value.length.toString();
        console.log(`  🔄 Applied count_items (array): "${arrayCount}"`);
        return arrayCount;
      } else if (typeof value === "string") {
        const items = stringValue.split(/[,;\n]/).filter(item => item.trim().length > 0);
        const itemCount = items.length > 0 ? items.length.toString() : "0";
        console.log(`  🔄 Applied count_items (string): "${itemCount}" items`);
        return itemCount;
      } else {
        console.log('  🔄 Applied count_items (single): "1"');
        return "1";
      }
      
    case "extract_number":
      const numberRegex = /-?\d+(\.\d+)?/;
      const numberMatch = stringValue.match(numberRegex);
      const extractedNumber = numberMatch ? numberMatch[0] : "0";
      console.log(`  🔄 Applied extract_number: "${extractedNumber}"`);
      return extractedNumber;
      
    case "exists_to_true":
      // Check if value exists and is not empty
      const exists = !(!value || 
                     (typeof value === "string" && value.trim().length === 0) || 
                     (Array.isArray(value) && value.length === 0));
      console.log(`  🔄 Applied exists_to_true: "${exists}"`);
      return exists;
      
    case "yes_no":
      const hasValue = !(!value || 
                        (typeof value === "string" && value.trim().length === 0) || 
                        (Array.isArray(value) && value.length === 0));
      const yesNoValue = hasValue ? "Yes" : "No";
      console.log(`  🔄 Applied yes_no: "${yesNoValue}"`);
      return yesNoValue;
      
    case "split_comma":
      if (Array.isArray(value)) {
        const arrayAsString = value.join(", ");
        console.log(`  🔄 Applied split_comma (array to string): "${arrayAsString}"`);
        return arrayAsString;
      }
      
      // If it's already a string with commas, split and clean it
      if (stringValue.includes(",")) {
        const items = stringValue.split(",").map(item => item.trim()).filter(item => item);
        console.log(`  🔄 Applied split_comma (split string): ${items.length} items`);
        return items;
      }
      
      console.log("  🔄 Applied split_comma (string as-is)");
      return stringValue;
      
    case "first_item":
      if (Array.isArray(value) && value.length > 0) {
        const firstItem = value[0];
        console.log(`  🔄 Applied first_item: "${firstItem}"`);
        return firstItem;
      } else if (typeof value === "string" && value.includes(",")) {
        const firstCSVItem = value.split(",")[0].trim();
        console.log(`  🔄 Applied first_item (from CSV): "${firstCSVItem}"`);
        return firstCSVItem;
      } else {
        console.log(`  🔄 Applied first_item: "${stringValue}"`);
        return stringValue;
      }
      
    case "join_items":
      if (Array.isArray(value)) {
        const joinedItems = value.join(", ");
        console.log(`  🔄 Applied join_items: "${joinedItems}"`);
        return joinedItems;
      } else {
        console.log(`  🔄 Applied join_items (string): "${stringValue}"`);
        return stringValue;
      }
      
    case "upload_drive":
      console.log("  🔄 Applied upload_drive");
      return stringValue;
      
    case "skip_files":
      console.log("  🔄 Applied skip_files");
      return stringValue;
      
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