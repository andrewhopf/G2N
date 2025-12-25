/// FILE: CardBuilders.js
// DESCRIPTION: Card builder functions for Google Workspace Add-on UI
// ============================================
/**
 * Cache for UI elements that don't change often
 */
const UI_CACHE = {
  commonButtons: {},
  commonSections: {},
  
  getCommonButtons: function() {
    if (!this.commonButtons.home) {
      this.commonButtons.home = CardService.newTextButton()
        .setText("🏠 Home")
        .setOnClickAction(CardService.newAction().setFunctionName("onG2NHomepage"));
      
      this.commonButtons.settings = CardService.newTextButton()
        .setText("⚙️ Settings")
        .setOnClickAction(CardService.newAction().setFunctionName("showG2NSettings"));
      
      this.commonButtons.refresh = CardService.newTextButton()
        .setText("🔄 Refresh")
        .setOnClickAction(CardService.newAction().setFunctionName("onG2NHomepage"));
    }
    return this.commonButtons;
  }
};

/**
 * Build the main mappings configuration card
 * @returns {CardService.Card} The configured card
 */
function buildMappingsCard() {
  console.log("Building mappings configuration card");
  var config = getConfig();
  
  if (!config.apiKey || !config.databaseId) {
    return buildConfigErrorCard();
  }
  
  var schemaResult = fetchNotionDatabaseSchema(config.databaseId, config.apiKey);
  if (!schemaResult || !schemaResult.success) {
    return buildSchemaErrorCard(schemaResult?.error || "Could not fetch database.");
  }
  
  var database = schemaResult.database;
  var mappings = getMappings();
  
  var card = CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("📋 Map Email → Notion")
        .setSubtitle("Database: " + database.title)
    );
  
  // Database info section
  card.addSection(buildDatabaseInfoSection(database));
  
  // QUICK SETUP SECTION
  card.addSection(
    CardService.newCardSection()
      .setHeader("⚡ Quick Setup")
      .addWidget(
        CardService.newTextParagraph()
          .setText("Quickly enable common email fields:")
      )
      .addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText("Enable Common Fields")
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName("enableCommonFields")
              )
          )
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText("<font color='#5F6368'><i>Enables: Email subject → Title, Sender → Email field, Body → Content, Gmail link → URL</i></font>")
      )
  );
  
  // Quick tip section
  card.addSection(
    CardService.newCardSection()
      .addWidget(
        CardService.newTextParagraph()
          .setText("<b>💡 Quick Tip:</b> Use '⚡ Quick Setup' to automatically enable:")
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText("• Email subject → Task title")
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText("• Sender email → Sender Email field")
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText("• Email body → Email Body field")
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText("• Gmail link → Gmail link field")
      )
  );
  
  // Filter and sort properties
  var properties = database.properties.filter(prop => isPropertyMappable(prop.type));
  properties.sort((a, b) => {
    if (a.isTitle) return -1;
    if (b.isTitle) return 1;
    if (a.isRequired && !b.isRequired) return -1;
    if (!a.isRequired && b.isRequired) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Property mapping section
  card.addSection(buildPropertyMappingSection(properties, mappings));
  
  // Action section
  card.addSection(buildActionSection());
  
  return card.build();
}

/**
 * Build database information section
 * @param {Object} database - Database object from Notion
 * @returns {CardService.CardSection} Database info section
 */
function buildDatabaseInfoSection(database) {
  var mappableCount = database.properties.filter(prop => isPropertyMappable(prop.type)).length;
  var autoManagedCount = database.properties.length - mappableCount;
  
  var section = CardService.newCardSection()
    .addWidget(
      CardService.newTextParagraph()
        .setText("<b>✅ Database Loaded Successfully</b>")
    )
    .addWidget(
      CardService.newTextParagraph()
        .setText("<b>Title:</b> " + (database.title || "Untitled"))
    )
    .addWidget(
      CardService.newTextParagraph()
        .setText("<b>Total Properties:</b> " + database.properties.length)
    )
    .addWidget(
      CardService.newTextParagraph()
        .setText("<b>Mappable Properties:</b> " + mappableCount)
    )
    .addWidget(
      CardService.newTextParagraph()
        .setText("<b>Auto-managed (Notion):</b> " + autoManagedCount)
    );
  
  if (database.url) {
    section.addWidget(
      CardService.newTextButton()
        .setText("🔗 Open in Notion")
        .setOpenLink(
          CardService.newOpenLink()
            .setUrl(database.url)
        )
    );
  }
  
  return section;
}

/**
 * Build property mapping section with handler integration and intelligent mapping lookup
 * @param {Array} properties - Array of Notion properties
 * @param {Object} savedMappings - Current saved mappings configuration
 * @returns {CardService.CardSection} Property mapping section
 */
function buildPropertyMappingSection(properties, savedMappings) {
    console.log("=== DEBUG: Starting buildPropertyMappingSection with enhanced lookup ===");
    console.log("Total properties received:", properties.length);
    console.log("Saved mappings count:", Object.keys(savedMappings).length);
    
    var section = CardService.newCardSection()
        .setHeader("Property Mappings")
        .addWidget(
            CardService.newTextParagraph()
                .setText("<b>Configure how email data maps to your Notion properties:</b>")
        );
    
    // Helper function to intelligently find a mapping for a property
    function findMappingForProperty(property, mappings) {
        var propertyId = property.id;
        var propertyName = property.name;
        
        console.log(`  Looking for mapping for: ${propertyName} (ID: ${propertyId})`);
        
        // 1. Try by raw property ID
        if (mappings[propertyId]) {
            console.log(`    ✅ Found by raw ID: ${propertyId}`);
            return mappings[propertyId];
        }
        
        // 2. Try by URL-encoded property ID (important for your case!)
        var encodedId = encodeURIComponent(propertyId);
        if (mappings[encodedId]) {
            console.log(`    ✅ Found by encoded ID: ${encodedId}`);
            return mappings[encodedId];
        }
        
        // 3. Try by URL-decoded keys (some mappings might be saved with decoded IDs)
        for (var key in mappings) {
            try {
                var decodedKey = decodeURIComponent(key);
                if (decodedKey === propertyId) {
                    console.log(`    ✅ Found by decoded key: ${key} -> ${propertyId}`);
                    return mappings[key];
                }
            } catch (e) {
                // Ignore decoding errors
            }
        }
        
        // 4. Try by property name (fallback)
        for (var key in mappings) {
            if (mappings[key].notionPropertyName === propertyName) {
                console.log(`    ✅ Found by name: ${propertyName} -> key: ${key}`);
                return mappings[key];
            }
        }
        
        console.log(`    ❌ No mapping found for ${propertyName}`);
        return null;
    }
    
    // Process each property in order
    properties.forEach(function(property, index) {
        var propertyId = property.id;
        var propertyType = property.type;
        var propertyName = property.name;
        
        console.log(`
=== Processing property ${index + 1}: ${propertyName} (${propertyType}) ===`);
        console.log("Property ID:", propertyId);
        
        // Find existing mapping
        var mapping = findMappingForProperty(property, savedMappings);
        
        // If no mapping found, get handler and create default
        var handler = getPropertyHandler(propertyType);
        if (!mapping) {
            if (handler && handler.processConfiguration) {
                mapping = handler.processConfiguration(property, {});
                console.log("  Created new config using handler");
            } else {
                mapping = {
                    type: propertyType,
                    notionPropertyName: propertyName,
                    enabled: property.isTitle || false,
                    emailField: getRecommendedEmailField(propertyType) || "subject",
                    transformation: "none",
                    isStaticOption: false,
                    isRequired: property.isRequired || false
                };
                console.log("  Created default config");
            }
        } else {
            console.log("  Using saved mapping:", mapping.notionPropertyName);
            console.log("  Saved mapping enabled:", mapping.enabled);
            console.log("  Saved emailField:", mapping.emailField);
        }
        
        // Ensure mapping has required fields
        mapping.type = mapping.type || propertyType;
        mapping.notionPropertyName = mapping.notionPropertyName || propertyName;
        mapping.enabled = mapping.enabled || false;
        mapping.isRequired = mapping.isRequired || property.isRequired || false;
        
        // Skip auto-managed properties unless required
        var autoManagedTypes = ["formula", "rollup", "created_time", "created_by", "last_edited_time", "last_edited_by"];
        if (autoManagedTypes.includes(propertyType) && !property.isRequired) {
            console.log("  >>> Skipping auto-managed property");
            return; // Skip this property
        }
        
        // Use handler to build UI if available
        if (handler && handler.buildUI) {
            console.log("  >>> Using handler for:", propertyType);
            try {
                var uiWidgets = handler.buildUI(property, mapping);
                
                if (Array.isArray(uiWidgets)) {
                    // Process each widget
                    uiWidgets.forEach(function(widget) {
                        if (widget && widget.getFieldName) {
                            var fieldName = widget.getFieldName();
                            
                            // Special handling for email field dropdowns
                            if (fieldName && fieldName.startsWith("emailField_")) {
                                var filteredDropdown = createFilteredGmailFieldDropdown(
                                    fieldName,
                                    propertyType,
                                    mapping.emailField || getRecommendedEmailField(propertyType) || "subject"
                                );
                                section.addWidget(filteredDropdown);
                            } else {
                                section.addWidget(widget);
                            }
                        } else {
                            section.addWidget(widget);
                        }
                    });
                } else if (uiWidgets) {
                    section.addWidget(uiWidgets);
                }
            } catch (error) {
                console.error(`Error building UI for ${propertyName}:`, error);
                addFallbackUI(section, property, propertyType, error.message);
            }
        } else {
            console.log("  >>> No handler found for:", propertyType);
            addFallbackUI(section, property, propertyType, "No handler available");
        }
        
        // Add divider between properties (except after last property)
        if (index < properties.length - 1) {
            section.addWidget(CardService.newDivider());
        }
    });
    
    console.log("=== DEBUG: Finished buildPropertyMappingSection ===");
    return section;
}

/**
 * Create filtered Gmail field dropdown based on property type compatibility
 * @param {string} fieldName - The field name for the dropdown
 * @param {string} propertyType - The Notion property type
 * @param {string} currentValue - Currently selected value
 * @returns {CardService.SelectionInput|CardService.TextParagraph} Dropdown widget or error message
 */
function createFilteredGmailFieldDropdown(fieldName, propertyType, currentValue) {
    var gmailFields = getAvailableGmailFields();
    var dropdown = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName(fieldName)
        .setTitle("Email Source");
    
    // Add default option
    dropdown.addItem("-- Select Gmail field --", "", !currentValue);
    
    // Track if we found any compatible fields
    var foundCompatible = false;
    
    // Filter Gmail fields based on property type compatibility
    gmailFields.forEach(function(field) {
        var allowedTypes = getAllowedPropertyTypesForGmailField(field.value);
        if (allowedTypes.includes(propertyType)) {
            dropdown.addItem(field.label, field.value, currentValue === field.value);
            foundCompatible = true;
        }
    });
    
    if (foundCompatible) {
        return dropdown;
    } else {
        return CardService.newTextParagraph()
            .setText(`<font color="#FF6B6B">⚠️ No compatible Gmail fields for ${propertyType} properties</font>`);
    }
}

/**
 * Add fallback UI when handler fails
 * @param {CardService.CardSection} section - Card section to add widgets to
 * @param {Object} property - Notion property object
 * @param {string} propertyType - Property type
 * @param {string} errorMessage - Error message to display
 */
function addFallbackUI(section, property, propertyType, errorMessage) {
    section.addWidget(
        CardService.newTextParagraph()
            .setText(`<b>${property.name}</b> <font color="#666">(${getPropertyTypeDisplayName(propertyType)})</font>`)
    );
    
    if (property.isRequired) {
        section.addWidget(
            CardService.newTextParagraph()
                .setText("<font color='#d93025'>⚠️ Required field</font>")
        );
    }
    
    section.addWidget(
        CardService.newTextParagraph()
            .setText(`<font color='#FF6B6B'>⚠️ ${errorMessage}</font>`)
    );
}

/**
 * Build action section with save/reset buttons
 * @returns {CardService.CardSection} Action section
 */
function buildActionSection() {
  return CardService.newCardSection()
    .addWidget(
      CardService.newButtonSet()
        .addButton(
          CardService.newTextButton()
            .setText("💾 Save Mappings")
            .setBackgroundColor("#0F9D58")
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName("saveMappingsConfiguration")
            )
        )
        .addButton(
          CardService.newTextButton()
            .setText("↺ Reset All")
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName("resetMappingsOnly")
            )
        )
        .addButton(
          CardService.newTextButton()
            .setText("⚙️ Settings")
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName("showSettingsConfiguration")
            )
        )
        .addButton(
          CardService.newTextButton()
            .setText("🏠 Home")
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName("onG2NHomepage")
            )
        )
    );
}

/**
 * Build configuration error card
 * @returns {CardService.Card} Error card
 */
function buildConfigErrorCard() {
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("⚠️ Configuration Required")
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph()
            .setText("Please set your Notion API Key and Database ID in Settings first.")
        )
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText("⚙️ Go to Settings")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("showSettingsConfiguration")
                )
            )
        )
    )
    .build();
}

/**
 * Build schema error card
 * @param {string} errorMessage - Error message to display
 * @returns {CardService.Card} Error card
 */
function buildSchemaErrorCard(errorMessage) {
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("⚠️ Cannot Load Database")
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph()
            .setText("Could not load your Notion database. Error: " + errorMessage)
        )
        .addWidget(
          CardService.newTextParagraph()
            .setText("Please check:")
        )
        .addWidget(
          CardService.newTextParagraph()
            .setText("1. ✅ API key is correct")
        )
        .addWidget(
          CardService.newTextParagraph()
            .setText("2. ✅ Database ID is correct")
        )
        .addWidget(
          CardService.newTextParagraph()
            .setText("3. ✅ Database is shared with your integration")
        )
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText("🔄 Try Again")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("showMappingsConfiguration")
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText("⚙️ Check Settings")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("showSettingsConfiguration")
                )
            )
        )
    )
    .build();
}

/**
 * Build efficient homepage card with cached UI elements
 */
function buildHomepageCard() {
  console.log("Building homepage card");
  const config = getConfig();
  const hasApiKey = !!config.apiKey;
  const hasDatabase = !!config.databaseId && hasApiKey;
  const hasMappings = config.hasMappings && hasDatabase;
  
  const builder = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle("📧 Gmail to Notion")
      .setSubtitle("Save emails to your Notion workspace"))
    .addSection(CardService.newCardSection()
      .setHeader("📊 Status")
      .addWidget(CardService.newKeyValue()
        .setTopLabel("Notion Connection")
        .setContent(hasApiKey ? "✅ Connected" : "❌ Not connected"))
      .addWidget(CardService.newKeyValue()
        .setTopLabel("Selected Database")
        .setContent(hasDatabase ? "✅ " + config.databaseName : "❌ Not selected"))
      .addWidget(CardService.newKeyValue()
        .setTopLabel("Field Mappings")
        .setContent(hasMappings ? "✅ Configured" : "❌ Not configured")));
  
  if (hasApiKey) {
    if (hasDatabase) {
      if (hasMappings) {
        builder.addSection(CardService.newCardSection()
          .setHeader("🎉 Ready to Save Emails!")
          .addWidget(CardService.newTextParagraph()
            .setText("Add-on is fully configured and ready to use."))
          .addWidget(CardService.newButtonSet()
            .addButton(CardService.newTextButton()
              .setText("📨 View Email Preview")
              .setOnClickAction(CardService.newAction()
                .setFunctionName("onG2NGmailMessage")))));
      } else {
        builder.addSection(CardService.newCardSection()
          .setHeader("🔧 Setup Required")
          .addWidget(CardService.newTextParagraph()
            .setText("Database selected! Now configure field mappings:"))
          .addWidget(CardService.newButtonSet()
            .addButton(CardService.newTextButton()
              .setText("⚙️ Configure Mappings")
              .setOnClickAction(CardService.newAction()
                .setFunctionName("showMappingsConfiguration")))));
      }
    } else {
      builder.addSection(CardService.newCardSection()
        .setHeader("🔧 Setup Required")
        .addWidget(CardService.newTextParagraph()
          .setText("API key is set! Now select a database:"))
        .addWidget(CardService.newButtonSet()
          .addButton(CardService.newTextButton()
            .setText("🗄️ Select Database")
            .setOnClickAction(CardService.newAction()
              .setFunctionName("showDatabaseSelection")))));
    }
  } else {
    builder.addSection(CardService.newCardSection()
      .setHeader("🔧 Setup Required")
      .addWidget(CardService.newTextParagraph()
        .setText("To get started, please configure the add-on:"))
      .addWidget(CardService.newButtonSet()
        .addButton(CardService.newTextButton()
          .setText("⚙️ Start Setup")
          .setOnClickAction(CardService.newAction()
            .setFunctionName("showG2NSettings")))));
  }
  
  const commonButtons = UI_CACHE.getCommonButtons();
  builder.addSection(CardService.newCardSection()
    .setHeader("🔧 Tools")
    .addWidget(CardService.newButtonSet()
      .addButton(commonButtons.settings)
      .addButton(commonButtons.refresh)));
  
  console.log("Homepage card built successfully");
  return builder.build();
}

/**
 * Build email preview card with database info and email body preview
 * @param {Object} event - Gmail event object
 * @returns {CardService.Card} Email preview card
 */
function buildEmailPreviewCard(event) {
  console.log("Building enhanced email preview card");
  
  var config = getConfig();
  var hasApiKey = !!config.apiKey;
  var hasDatabase = !!config.databaseId && hasApiKey;
  var hasMappings = config.hasMappings && hasDatabase;
  
  var subject = "No email found";
  var from = "Unknown Sender";
  var bodyPreview = "No email content available";
  var date = "Unknown date";
  var messageId = event?.gmail?.messageId;
  
  try {
    if (messageId) {
      var message = GmailApp.getMessageById(messageId);
      if (message) {
        subject = message.getSubject() || "No Subject";
        from = message.getFrom() || "Unknown Sender";
        date = message.getDate() ? message.getDate().toLocaleString() : "Unknown date";
        var plainBody = message.getPlainBody() || "";
        
        // Clean up the text for preview
        bodyPreview = plainBody
          .replace(/\n/g, " ")
          .replace(/\s+/g, " ")
          .substring(0, 250)
          .trim();
        
        if (plainBody.replace(/\s+/g, " ").length > 250) {
          bodyPreview += "…";
        }
      }
    } else {
      // Preview mode (no actual email selected)
      subject = event?.gmail?.subject || "No Subject";
      from = event?.gmail?.from || "Unknown Sender";
      date = "Preview mode";
      messageId = "preview-mode";
    }
  } catch (error) {
    console.warn("Could not get email details:", error);
  }
  
  var card = CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("📨 Email Preview")
        .setSubtitle("Ready to save to Notion")
    );
  
  // Status badge section
  var status = hasApiKey && hasDatabase && hasMappings 
    ? "🟢 READY TO SAVE" 
    : hasApiKey && hasDatabase 
      ? "🟡 NEEDS MAPPINGS" 
      : hasApiKey 
        ? "🟠 NEEDS DATABASE" 
        : "🔴 SETUP REQUIRED";
  
  card.addSection(
    CardService.newCardSection()
      .addWidget(
        CardService.newTextParagraph()
          .setText(`<b>${status}</b>`)
      )
  );
  
  // Database info section
  var databaseSection = CardService.newCardSection()
    .setHeader("🗄️ Notion Database");
  
  if (hasDatabase) {
    var dbName = config.databaseName || "Unnamed Database";
    var dbIdShort = config.databaseId.substring(0, 8) + "...";
    
    databaseSection
      .addWidget(
        CardService.newKeyValue()
          .setTopLabel("Connected to")
          .setContent(`<b>${dbName}</b>`)
          .setMultiline(true)
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText(`<font color="#5F6368"><i>ID: ${dbIdShort}</i></font>`)
      );
  } else {
    databaseSection
      .addWidget(
        CardService.newTextParagraph()
          .setText("<font color='#FF6B6B'>No database selected</font>")
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText("Please select a database in Settings")
      );
  }
  
  card.addSection(databaseSection);
  
  // Email preview section
  var emailSection = CardService.newCardSection()
    .setHeader("📧 Email Preview");
  
  emailSection
    .addWidget(
      CardService.newKeyValue()
        .setTopLabel("📝 Subject")
        .setContent(subject)
        .setMultiline(true)
    )
    .addWidget(
      CardService.newKeyValue()
        .setTopLabel("👤 From")
        .setContent(from)
        .setMultiline(true)
    )
    .addWidget(
      CardService.newKeyValue()
        .setTopLabel("📅 Date")
        .setContent(date)
        .setMultiline(true)
    );
  
  // Body preview with better formatting
  if (bodyPreview && bodyPreview !== "No email content available") {
    emailSection
      .addWidget(CardService.newDivider())
      .addWidget(
        CardService.newTextParagraph()
          .setText("<b>📄 Body Preview:</b>")
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText(
            `<div style="max-height: 100px; overflow-y: auto; padding: 8px; background-color: #f8f9fa; border-radius: 4px; font-size: 0.9em;">${escapeHtml(bodyPreview)}</div>`
          )
      );
  }
  
  card.addSection(emailSection);
  
  // Actions section
  if (messageId && messageId !== "preview-mode") {
    if (hasApiKey && hasDatabase && hasMappings) {
      // FULLY CONFIGURED - Show save button prominently
      card.addSection(
        CardService.newCardSection()
          .setHeader("🚀 Ready to Save")
          .addWidget(
            CardService.newTextParagraph()
              .setText("This email will be saved to:")
          )
          .addWidget(
            CardService.newTextParagraph()
              .setText(`<b>📁 ${config.databaseName}</b>`)
          )
          .addWidget(
            CardService.newButtonSet()
              .addButton(
                CardService.newTextButton()
                  .setText("💾 Save to Notion")
                  .setBackgroundColor("#0F9D58")
                  .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
                  .setOnClickAction(
                    CardService.newAction()
                      .setFunctionName("quickG2NSaveEmail")
                  )
              )
          )
      );
      
      // Additional options
      card.addSection(
        CardService.newCardSection()
          .addWidget(
            CardService.newButtonSet()
              .addButton(
                CardService.newTextButton()
                  .setText("⚙️ Edit Mappings")
                  .setOnClickAction(
                    CardService.newAction()
                      .setFunctionName("showMappingsConfiguration")
                  )
              )
              .addButton(
                CardService.newTextButton()
                  .setText("🔄 Change Database")
                  .setOnClickAction(
                    CardService.newAction()
                      .setFunctionName("showDatabaseSelection")
                  )
              )
          )
      );
    } else {
      // Missing configuration
      var missingItems = [];
      if (!hasApiKey) missingItems.push("API Key");
      if (!hasDatabase) missingItems.push("Database");
      if (!hasMappings) missingItems.push("Field Mappings");
      
      card.addSection(
        CardService.newCardSection()
          .setHeader("🔧 Setup Required")
          .addWidget(
            CardService.newTextParagraph()
              .setText("<b>Missing:</b> " + missingItems.join(", "))
          )
          .addWidget(
            CardService.newButtonSet()
              .addButton(
                CardService.newTextButton()
                  .setText("⚙️ Complete Setup")
                  .setBackgroundColor("#4285F4")
                  .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
                  .setOnClickAction(
                    CardService.newAction()
                      .setFunctionName("onG2NHomepage")
                  )
              )
          )
      );
    }
  }
  
  // Always show home button
  card.addSection(
    CardService.newCardSection()
      .addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText("🏠 Home")
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName("onG2NHomepage")
              )
          )
      )
  );
  
  return card.build();
}

/**
 * Build settings configuration card
 * @returns {CardService.Card} Settings card
 */
function buildSettingsCard() {
  console.log("Building settings card");
  
  var config = getConfig();
  var hasApiKey = !!config.apiKey;
  var hasDatabase = !!config.databaseId && hasApiKey;
  var hasMappings = config.hasMappings && hasDatabase;
  
  var card = CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("⚙️ Settings")
        .setSubtitle("Configure Gmail to Notion")
    )
    .addSection(
      CardService.newCardSection()
        .setHeader("🔑 API Configuration")
        .addWidget(
          CardService.newTextInput()
            .setFieldName("api_key")
            .setTitle("Notion API Key")
            .setValue(config.apiKey || "")
            .setHint("Enter your Notion API key (starts with 'secret_')")
        )
    )
    .addSection(
      CardService.newCardSection()
        .setHeader("🗄️ Database")
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText(hasApiKey ? "🗄️ Select Database" : "🗄️ Enter API Key First")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName(hasApiKey ? "showDatabaseSelection" : "showG2NSettings")
                )
                .setDisabled(!hasApiKey)
            )
        )
    );
  
  // Add mappings section only if database is selected
  if (hasApiKey && hasDatabase) {
    card.addSection(
      CardService.newCardSection()
        .setHeader("🔄 Field Mappings")
        .addWidget(
          CardService.newTextParagraph()
            .setText(hasMappings ? "Field mappings are configured." : "Configure how email fields map to Notion properties.")
        )
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText(hasMappings ? "⚙️ Edit Mappings" : "⚙️ Configure Mappings")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("showMappingsConfiguration")
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText("🔄 Reset Mappings")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("resetMappingsOnly")
                )
                .setDisabled(!hasMappings)
            )
        )
    );
  }
  
  // Tools section
  card.addSection(
    CardService.newCardSection()
      .setHeader("🔧 Tools")
      .addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText("🧪 Test Connection")
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName("testNotionConnection")
              )
              .setDisabled(!hasApiKey)
          )
          .addButton(
            CardService.newTextButton()
              .setText("🔄 Refresh")
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName("showG2NSettings")
              )
          )
      )
  );
  
  // Danger zone
  card.addSection(
    CardService.newCardSection()
      .setHeader("⚠️ Danger Zone")
      .addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText("🗑️ Clear All Settings")
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName("resetConfiguration")
              )
          )
      )
  );
  
  // Navigation
  card.addSection(
    CardService.newCardSection()
      .addWidget(
        CardService.newButtonSet()
          .addButton(
            CardService.newTextButton()
              .setText("💾 Save API Key")
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName("saveConfiguration")
              )
          )
          .addButton(
            CardService.newTextButton()
              .setText("🏠 Back to Home")
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName("onG2NHomepage")
              )
          )
      )
  );
  
  return card.build();
}

/**
 * Build database selection card
 * @returns {CardService.Card} Database selection card
 */
function buildDatabaseSelectionCard() {
  console.log("Building database selection card");
  
  // Fetch REAL databases from Notion
  var databases = fetchRealNotionDatabases();
  var currentDbId = getConfig().databaseId || "";
  
  var section = CardService.newCardSection()
    .setHeader("🗄️ Database Selection");
  
  if (databases.length === 0) {
    // No databases found or API not configured
    section
      .addWidget(
        CardService.newTextParagraph()
          .setText("No databases found. Please check:")
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText("1. Your Notion API key is set in Settings")
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText("2. The API key has access to databases")
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText("3. You have at least one database in Notion")
      );
  } else {
    // Show real databases
    var selectionInput = CardService.newSelectionInput()
      .setFieldName("selected_database")
      .setTitle("Your Notion Databases")
      .setType(CardService.SelectionInputType.RADIO_BUTTON);
    
    databases.forEach(db => {
      var isSelected = db.id === currentDbId;
      selectionInput.addItem(db.name, db.id, isSelected);
    });
    
    section.addWidget(selectionInput);
  }
  
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("🗄️ Database Selection")
    )
    .addSection(section)
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText("✅ Select Database")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("saveDatabaseSelection")
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText("🔄 Refresh List")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("showDatabaseSelection")
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText("🏠 Back to Home")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("onG2NHomepage")
                )
            )
        )
    )
    .build();
}

/**
 * Build error card
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {CardService.Card} Error card
 */
function buildErrorCard(title, message) {
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("❌ " + title)
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph()
            .setText(message)
        )
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText("🔄 Try Again")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("onG2NHomepage")
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText("⚙️ Settings")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("showG2NSettings")
                )
            )
        )
    )
    .build();
}

/**
 * Build success card after saving email
 * @param {Object} result - Result object with page info
 * @returns {CardService.Card} Success card
 */
function buildSuccessCard(result) {
  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle("✅ Success!")
        .setSubtitle("Email saved to Notion")
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph()
            .setText("<b>Your email has been successfully saved to Notion!</b>")
        )
        .addWidget(
          CardService.newTextParagraph()
            .setText("<b>Notion Page:</b> " + (result.pageUrl || "Link not available"))
        )
        .addWidget(
          CardService.newTextParagraph()
            .setText(`<b>Email ID:</b> ${result.emailId.substring(0, 20)}...`)
        )
    )
    .addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newButtonSet()
            .addButton(
              CardService.newTextButton()
                .setText("📖 Open in Notion")
                .setOpenLink(
                  CardService.newOpenLink()
                    .setUrl(result.pageUrl)
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText("📧 Open in Gmail")
                .setOpenLink(
                  CardService.newOpenLink()
                    .setUrl("https://mail.google.com/mail/u/0/#inbox/" + result.emailId)
                )
            )
            .addButton(
              CardService.newTextButton()
                .setText("🏠 Home")
                .setOnClickAction(
                  CardService.newAction()
                    .setFunctionName("onG2NHomepage")
                )
            )
        )
    )
    .build();
}