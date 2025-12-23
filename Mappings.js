// ============================================/
// FILE: Mappings.js
// DESCRIPTION: Field mappings configuration for Gmail to Notion integration
// ============================================

/**
 * Get saved mappings from user properties
 * @returns {Object} Mappings configuration object
 */
function getMappings() {
  var mappingsJson = PropertiesService.getUserProperties().getProperty("G2N_MAPPINGS") || "";
  
  if (mappingsJson) {
    try {
      return JSON.parse(mappingsJson);
    } catch (error) {
      console.error("Error parsing mappings:", error);
      // Return minimal default if parsing fails
      return {
        title: {
          notionPropertyName: "Name",
          type: "title",
          enabled: true,
          emailField: "subject",
          transformation: "none"
        }
      };
    }
  }
  
  // If no saved mappings, return empty object
  return {};
}

/**
 * Show mappings configuration card
 * @returns {CardService.Card} Mappings configuration card
 */
function showMappingsConfiguration() {
  try {
    return buildMappingsCard();
  } catch (error) {
    console.error("Error building mappings card:", error);
    return buildSchemaErrorCard(error.message);
  }
}

/**
 * Enable common/useful fields for quick setup
 * @returns {CardService.ActionResponse} Action response with notification
 */
function enableCommonFields() {
  console.log("=== ENABLING COMMON FIELDS ===");
  
  try {
    var userProps = PropertiesService.getUserProperties();
    var mappingsJson = userProps.getProperty("G2N_MAPPINGS");
    
    if (!mappingsJson) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification()
            .setText("⚠️ Please configure mappings first")
        )
        .build();
    }
    
    var mappings = JSON.parse(mappingsJson);
    var enabledCount = 0;
    
    console.log("Processing", Object.keys(mappings).length, "mappings...");
    
    // Enable common fields
    Object.values(mappings).forEach(mapping => {
      var propertyNameLower = mapping.notionPropertyName.toLowerCase();
      var propertyType = mapping.type;
      
      if (
        // Title field (usually the main task/email title)
        propertyType === "title" ||
        // Sender/From fields
        propertyNameLower.includes("sender") ||
        propertyNameLower.includes("from") ||
        // Email address fields
        propertyType === "email" ||
        propertyNameLower.includes("email") ||
        // Content/body fields
        propertyNameLower.includes("body") ||
        propertyNameLower.includes("content") ||
        // Link/URL fields (especially Gmail links)
        propertyNameLower.includes("link") ||
        propertyNameLower.includes("url") ||
        propertyNameLower.includes("gmail") ||
        // Date fields
        propertyNameLower.includes("date") ||
        propertyType === "date"
      ) {
        // Only enable if it's NOT a static value property
        if (!mapping.enabled && !mapping.isStaticOption) {
          mapping.enabled = true;
          enabledCount++;
          
          // Set appropriate defaults based on field type
          switch (propertyType) {
            case "title":
              mapping.emailField = mapping.emailField || "subject";
              mapping.transformation = mapping.transformation || "none";
              console.log("✓ Enabled title: " + mapping.notionPropertyName);
              break;
              
            case "email":
              mapping.emailField = mapping.emailField || "from";
              mapping.transformation = mapping.transformation || "extract_email";
              console.log("✓ Enabled email: " + mapping.notionPropertyName);
              break;
              
            case "rich_text":
              if (propertyNameLower.includes("body") || propertyNameLower.includes("content")) {
                mapping.emailField = mapping.emailField || "plainBody";
                mapping.transformation = mapping.transformation || "html_to_text";
                console.log("✓ Enabled content: " + mapping.notionPropertyName);
              }
              break;
              
            case "url":
              if (propertyNameLower.includes("gmail") || propertyNameLower.includes("link")) {
                mapping.emailField = mapping.emailField || "gmailLinkUrl";
                mapping.transformation = mapping.transformation || "none";
                console.log("✓ Enabled link: " + mapping.notionPropertyName);
              }
              break;
              
            case "date":
              mapping.emailField = mapping.emailField || "date";
              mapping.transformation = mapping.transformation || "parse_date";
              console.log("✓ Enabled date: " + mapping.notionPropertyName);
              break;
          }
        }
      }
    });
    
    // Save updated mappings
    userProps.setProperty("G2N_MAPPINGS", JSON.stringify(mappings));
    console.log(`✅ Enabled ${enabledCount} common fields`);
    
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText(`✅ Enabled ${enabledCount} common fields`)
      )
      .setNavigation(
        CardService.newNavigation()
          .updateCard(buildMappingsCard())
      )
      .build();
    
  } catch (error) {
    console.error("Error enabling common fields:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("❌ Failed to enable common fields: " + error.message)
      )
      .setNavigation(
        CardService.newNavigation()
          .updateCard(buildMappingsCard())
      )
      .build();
  }
}

/**
 * Save mappings configuration from form inputs
 * @param {Object} event - Event object with form inputs
 * @returns {CardService.ActionResponse} Action response
 */
function saveMappingsConfiguration(event) {
  console.log("saveMappingsConfiguration called");
  
  try {
    var userProps = PropertiesService.getUserProperties();
    var formInputs = event.formInput || {};
    console.log("Form inputs keys:", Object.keys(formInputs));
    
    // Get configuration
    var config = getConfig();
    if (!config.apiKey || !config.databaseId) {
      throw new Error("No API key or database ID configured");
    }
    
    // Fetch database schema
    var schemaResult = fetchNotionDatabaseSchema(config.databaseId, config.apiKey);
    if (!schemaResult || !schemaResult.success) {
      throw new Error("Could not fetch database schema");
    }
    
    var properties = schemaResult.database.properties.filter(prop => isPropertyMappable(prop.type));
    var savedMappings = {};
    var validationErrors = [];
    
    console.log("Processing", properties.length, "mappable properties");
    
    // Process each property with CORRECT TYPE HANDLING and VALIDATION
    properties.forEach(property => {
      var propertyId = property.id;
      var propertyType = property.type;
      
      console.log(`Processing property: ${property.name} (${propertyType})`);
      
      var handler = getPropertyHandler(propertyType);
      var mapping;
      
      // Use handler to process configuration if available
      if (handler && handler.processConfiguration) {
        mapping = handler.processConfiguration(property, formInputs);
        savedMappings[propertyId] = mapping;
        console.log(`  ✓ Processed with handler (${propertyType})`);
      } else {
        // Fallback processing
        var isEnabled = property.isRequired || formInputs["enabled_" + propertyId] === "true";
        var emailField = formInputs["emailField_" + propertyId] || getRecommendedEmailField(propertyType) || "subject";
        
        mapping = {
          type: propertyType,
          notionPropertyName: property.name,
          enabled: isEnabled,
          emailField: emailField,
          transformation: formInputs["transformation_" + propertyId] || "none",
          isStaticOption: false,
          isRequired: property.isRequired || false
        };
        
        savedMappings[propertyId] = mapping;
        console.log(`  ✓ Processed with fallback (${propertyType})`);
      }
      
      // VALIDATION: Check if this is a standard mappable property
      // Skip validation for static-value properties (handled by their handlers)
      if (!["relation", "checkbox", "select", "status", "multi_select", "people"].includes(propertyType)) {
        if (mapping.enabled && mapping.emailField) {
          var allowedTypes = getAllowedPropertyTypesForGmailField(mapping.emailField);
          if (!allowedTypes.includes(propertyType)) {
            validationErrors.push(
              `"${property.name}" (${propertyType}) cannot map to Gmail field "${mapping.emailField}". ` +
              "Allowed types: " + allowedTypes.join(", ")
            );
            console.error("Validation error: " + validationErrors[validationErrors.length - 1]);
          }
        }
      }
    });
    
    // If there are validation errors, show them to the user
    if (validationErrors.length > 0) {
      var errorMessage = "❌ Mapping validation errors:\n" + validationErrors.join("\n");
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification()
            .setText(errorMessage)
        )
        .setNavigation(
          CardService.newNavigation()
            .updateCard(buildMappingsCard())
        )
        .build();
    }
    
    // Save to properties
    userProps.setProperty("G2N_MAPPINGS", JSON.stringify(savedMappings));
    console.log("Mappings saved successfully");
    
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("✅ Mappings saved successfully!")
      )
      .setNavigation(
        CardService.newNavigation()
          .updateCard(buildHomepageCard())
      )
      .build();
    
  } catch (error) {
    console.error("Error saving mappings:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("❌ Failed to save mappings: " + error.message)
      )
      .build();
  }
}

/**
 * Reset only mappings (not full configuration)
 * @returns {CardService.ActionResponse} Action response
 */
function resetMappingsOnly() {
  console.log("resetMappingsOnly called");
  
  try {
    PropertiesService.getUserProperties().deleteProperty("G2N_MAPPINGS");
    console.log("Mappings reset to defaults");
    
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("✅ Mappings reset to defaults")
      )
      .setNavigation(
        CardService.newNavigation()
          .updateCard(buildMappingsCard())
      )
      .build();
  } catch (error) {
    console.error("Error resetting mappings:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("❌ Failed to reset mappings: " + error.message)
      )
      .build();
  }
}

/**
 * Test mappings integration
 * @returns {string} Test results
 */
function testMappingsIntegration() {
  console.log("=== TESTING MAPPINGS INTEGRATION ===");
  
  var tests = [
    {
      test: "showMappingsConfiguration exists",
      func: () => typeof showMappingsConfiguration === "function"
    },
    {
      test: "getMappings returns object",
      func: () => {
        var mappings = getMappings();
        return mappings && typeof mappings === "object";
      }
    },
    {
      test: "enableCommonFields exists",
      func: () => typeof enableCommonFields === "function"
    }
  ];
  
  var results = [];
  
  tests.forEach(test => {
    try {
      results.push({
        test: test.test,
        passed: test.func()
      });
    } catch (error) {
      results.push({
        test: test.test,
        passed: false,
        error: error.message
      });
    }
  });
  
  var passedCount = results.filter(r => r.passed).length;
  
  return passedCount === tests.length
    ? `✅ Perfect: ${passedCount}/${tests.length}`
    : `⚠️ Issues: ${passedCount}/${tests.length}`;
}