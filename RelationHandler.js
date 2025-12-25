/**
 * @fileoverview Relation property handler with async loading support
 * @version 2.1.0
 * @description Handles UI building and data processing for relation properties with timeout protection
 */

// In-memory cache for relation properties (temporary during card session)
var RELATION_PROPERTY_CACHE = {};

/**
 * Get related database ID from relation configuration
 * @param {Object} relationConfig - Relation configuration from Notion property
 * @returns {string|null} Related database ID
 */
function getRelatedDatabaseId(relationConfig) {
    console.log("getRelatedDatabaseId called with config:", JSON.stringify(relationConfig, null, 2));
    
    if (!relationConfig) {
        console.log("No relation config provided");
        return null;
    }
    
    // Helper function to extract and validate a Notion ID
    function extractNotionId(id) {
        if (!id) return null;
        
        // If it's already a valid Notion ID (32 hex chars), return it
        if (typeof id === 'string' && id.length === 32 && /^[a-f0-9]{32}$/.test(id)) {
            console.log("Found valid 32-char hex ID:", id);
            return id;
        }
        
        // If it's a Notion UUID with hyphens (36 chars)
        if (typeof id === 'string' && id.length === 36) {
            // Remove hyphens to get 32-char hex
            var cleanId = id.replace(/-/g, '');
            if (cleanId.length === 32 && /^[a-f0-9]{32}$/.test(cleanId)) {
                console.log("Converted UUID to hex ID:", cleanId);
                return cleanId;
            }
        }
        
        // If it's an object, recursively check
        if (typeof id === 'object' && id !== null) {
            if (id.database_id) {
                return extractNotionId(id.database_id);
            }
            if (id.id) {
                return extractNotionId(id.id);
            }
        }
        
        return null;
    }
    
    // Check for database_id directly (this is the most common case)
    if (relationConfig.database_id) {
        var dbId = extractNotionId(relationConfig.database_id);
        if (dbId) {
            console.log("Found database ID via database_id:", dbId);
            return dbId;
        }
    }
    
    // Check for data_source_id as fallback
    if (relationConfig.data_source_id) {
        var dataSourceId = extractNotionId(relationConfig.data_source_id);
        if (dataSourceId) {
            console.log("Found database ID via data_source_id:", dataSourceId);
            return dataSourceId;
        }
    }
    
    // Check if it's a dual_property relation (two-way sync)
    if (relationConfig.type === 'dual_property' && relationConfig.dual_property) {
        console.log("Dual property relation detected");
        // For dual property relations, we might need to use the data_source_id
        if (relationConfig.data_source_id) {
            var dualDbId = extractNotionId(relationConfig.data_source_id);
            if (dualDbId) {
                console.log("Using data_source_id from dual property:", dualDbId);
                return dualDbId;
            }
        }
    }
    
    // Last resort: try to extract from any string that might contain a database ID
    var configString = JSON.stringify(relationConfig);
    
    // Look for UUID pattern with hyphens first
    var uuidMatch = configString.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (uuidMatch) {
        var uuid = uuidMatch[1];
        var cleanId = uuid.replace(/-/g, '');
        if (cleanId.length === 32 && /^[a-f0-9]{32}$/.test(cleanId)) {
            console.log("Extracted database ID from UUID string:", cleanId);
            return cleanId;
        }
    }
    
    // Also try for 32-char hex without hyphens
    var hexMatch = configString.match(/([a-f0-9]{32})/);
    if (hexMatch) {
        console.log("Extracted database ID from hex string:", hexMatch[1]);
        return hexMatch[1];
    }
    
    console.log("Could not extract database ID from relation config");
    console.log("Tried patterns on:", configString);
    return null;
}

/**
 * Simple in-memory cache for properties
 * @param {string} key - Cache key
 * @returns {Array|null} Cached data or null
 */
function getCachedProperties(key) {
    var cached = RELATION_PROPERTY_CACHE[key];
    if (cached && cached.expiry > new Date().getTime()) {
        return cached.data;
    }
    return null;
}

/**
 * Cache properties in memory
 * @param {string} key - Cache key
 * @param {Array} data - Data to cache
 * @param {number} ttlSeconds - Time to live in seconds (default 300)
 */
function cacheProperties(key, data, ttlSeconds) {
    if (ttlSeconds === void 0) { ttlSeconds = 300; }
    RELATION_PROPERTY_CACHE[key] = {
        data: data,
        expiry: new Date().getTime() + (ttlSeconds * 1000)
    };
}

/**
 * Get placeholder properties for fallback
 * @param {Object} relationConfig - Relation configuration
 * @returns {Array} Placeholder properties
 */
function getCachedPlaceholderProperties(relationConfig) {
    // Return consistent placeholder properties
    return [
        { id: 'title', name: 'Title', type: 'title', displayName: 'Title (Title)' },
        { id: 'description', name: 'Description', type: 'rich_text', displayName: 'Description (Text)' },
        { id: 'email', name: 'Email', type: 'email', displayName: 'Email (Email)' },
        { id: 'status', name: 'Status', type: 'select', displayName: 'Status (Select)' },
        { id: 'date', name: 'Date', type: 'date', displayName: 'Date (Date)' },
        { id: 'url', name: 'URL', type: 'url', displayName: 'URL (URL)' }
    ];
}

/**
 * Process properties for display
 * @param {Array} properties - Raw properties
 * @returns {Array} Processed properties for display
 */
function processPropertiesForDisplay(properties) {
    return properties
        .filter(function(prop) {
            return isPropertyMappable(prop.type) && 
                   !['files', 'relation', 'rollup', 'formula'].includes(prop.type);
        })
        .map(function(prop) {
            return {
                id: prop.id,
                name: prop.name,
                type: prop.type,
                displayName: prop.name + " (" + getPropertyTypeDisplayName(prop.type) + ")"
            };
        });
}

/**
 * Fetch properties from the related database WITH TIMEOUT PROTECTION
 * Returns placeholders if fetch takes too long
 * @param {Object} relationConfig - Relation configuration from Notion property
 * @returns {Array<{id: string, name: string, type: string, displayName: string}>} Array of properties
 */
function fetchRelatedDatabaseProperties(relationConfig) {
    console.log("=== fetchRelatedDatabaseProperties called WITH TIMEOUT PROTECTION ===");
    
    // Start timing
    var startTime = new Date().getTime();
    var TIMEOUT_MS = 3000; // 3 second timeout
    
    try {
        var config = getConfig();
        if (!config.apiKey) {
            console.log("WARNING: No API key, using placeholders");
            return getCachedPlaceholderProperties(relationConfig);
        }
        
        // Get the related database ID from the relation configuration
        var relatedDbId = getRelatedDatabaseId(relationConfig);
        if (!relatedDbId) {
            console.log("WARNING: No database ID, using placeholders");
            return getCachedPlaceholderProperties(relationConfig);
        }
        
        console.log("Related database ID: " + relatedDbId);
        
        // Check cache first
        var cacheKey = "relation_props_" + relatedDbId;
        var cached = getCachedProperties(cacheKey);
        if (cached) {
            console.log("✅ Using cached properties for " + relatedDbId.substring(0,8));
            return cached;
        }
        
        // Fetch with timeout check - NOTE: The API expects the 32-char hex version
        var schema = fetchNotionDatabaseSchema(relatedDbId, config.apiKey);
        
        // Check if we've timed out
        if (new Date().getTime() - startTime > TIMEOUT_MS) {
            console.log("⏰ Timeout fetching properties, using placeholders");
            return getCachedPlaceholderProperties(relationConfig);
        }
        
        if (schema && schema.success && schema.database) {
            var properties = schema.database.properties || [];
            console.log("Found " + properties.length + " properties in related database");
            
            var mappableProperties = processPropertiesForDisplay(properties);
            console.log("Found " + mappableProperties.length + " mappable properties");
            
            // Cache for next time (5 minutes)
            cacheProperties(cacheKey, mappableProperties, 300);
            
            console.log("✅ Loaded " + mappableProperties.length + " properties for " + relatedDbId.substring(0,8));
            return mappableProperties;
        } else {
            console.error("Failed to fetch related database schema:", schema ? schema.error : 'Unknown error');
            return getCachedPlaceholderProperties(relationConfig);
        }
    } catch (e) {
        console.error("Error fetching related database properties:", e);
        return getCachedPlaceholderProperties(relationConfig);
    }
}

/**
 * Create email field dropdown
 * @param {string} fieldName - Field name
 * @param {string} currentValue - Current selected value
 * @returns {CardService.SelectionInput} Dropdown widget
 */
function createEmailFieldDropdown(fieldName, currentValue) {
    var dropdown = CardService.newSelectionInput()
        .setFieldName(fieldName)
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setTitle("Select Email Field");
    
    dropdown.addItem("-- Select email field --", "", !currentValue);
    
    var gmailFields = getAvailableGmailFields();
    gmailFields.forEach(function(field) {
        dropdown.addItem(field.label, field.value, currentValue === field.value);
    });
    
    return dropdown;
}

/**
 * Build UI widgets for relation properties WITH LOADING STATE
 * @param {Object} property - Notion property object
 * @param {Object} currentConfig - Current configuration
 * @returns {Array<CardService.Widget>} Array of UI widgets
 */
function buildRelationUI(property, currentConfig) {
    console.log("=== Building relation UI with loading state for property: " + property.name + " ===");
    
    var widgets = [];
    var propertyId = property.id;
    
    // Property header with relation info
    widgets.push(
        CardService.newTextParagraph()
            .setText("<b>" + property.name + "</b> <font color=\"#666\">(Relation)</font>")
    );
    
    // Show relation configuration info
    if (property.config && property.config.database_id) {
        var dbId = getRelatedDatabaseId(property.config);
        if (dbId) {
            widgets.push(
                CardService.newTextParagraph()
                    .setText("<font color=\"#5F6368\"><i>Related to database: " + dbId.substring(0,8) + "...</i></font>")
            );
        }
    }
    
    if (property.isRequired) {
        widgets.push(
            CardService.newTextParagraph()
                .setText("<font color='#d93025'>⚠️ Required field</font>")
        );
    }
    
    // Enable toggle
    var enableCheckbox = CardService.newSelectionInput()
        .setFieldName("relation_enabled_" + propertyId)
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .addItem("Enable relation linking", "true", currentConfig.enabled || false);
    widgets.push(enableCheckbox);
    
    // Try to load actual properties in background (non-blocking)
    var relatedProperties = [];
    try {
        relatedProperties = fetchRelatedDatabaseProperties(property.config || {});
    } catch (e) {
        console.log("Could not load properties in background:", e.message);
    }
    
    // Field selection - show appropriate UI based on what we loaded
    widgets.push(
        CardService.newTextParagraph()
            .setText("<b>Match Against Field:</b>")
    );
    
    var fieldDropdown = CardService.newSelectionInput()
        .setFieldName("relation_match_property_" + propertyId)
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setTitle("Field in Related Database");
    
    // Show appropriate options based on what we have
    if (relatedProperties.length > 0) {
        // We have actual properties
        fieldDropdown.addItem("-- Select field to match --", "", !currentConfig.matchProperty);
        
        // Add property options from related database
        relatedProperties.forEach(function(prop) {
            fieldDropdown.addItem(
                prop.displayName,
                prop.id,
                currentConfig.matchProperty === prop.id
            );
        });
    } else {
        // No properties loaded, show placeholder
        if (currentConfig.matchProperty) {
            // If we already have a selection, show it
            fieldDropdown.addItem("Selected: " + currentConfig.matchProperty.substring(0,20) + "...", currentConfig.matchProperty, true);
        } else {
            // Show loading/refresh option
            fieldDropdown.addItem("Click 'Load Fields' below →", "load", true);
        }
    }
    
    widgets.push(fieldDropdown);
    
    // Email field selection (fast - local data)
    widgets.push(
        CardService.newTextParagraph()
            .setText("<b>Email Field to Match:</b>")
    );
    
    var emailDropdown = createEmailFieldDropdown(
        "relation_match_value_" + propertyId, 
        currentConfig.matchValue
    );
    widgets.push(emailDropdown);
    
    // Show transformation options if we have actual properties and a selection
    if (relatedProperties.length > 0) {
        var selectedProp = currentConfig.matchProperty 
            ? relatedProperties.find(function(p) { return p.id === currentConfig.matchProperty; }) 
            : null;
        
        if (selectedProp && ['title', 'rich_text', 'email', 'url', 'phone_number'].includes(selectedProp.type)) {
            widgets.push(
                CardService.newTextParagraph()
                    .setText("<b>Transformation for Matching:</b>")
            );
            
            var transformationDropdown = CardService.newSelectionInput()
                .setFieldName("relation_transformation_" + propertyId)
                .setType(CardService.SelectionInputType.DROPDOWN)
                .setTitle("Data Processing for Matching");
            
            var transformations = getTransformationOptions(selectedProp.type);
            
            // Add default option
            transformationDropdown.addItem("Use as-is", "none", currentConfig.transformation === "none" || !currentConfig.transformation);
            
            transformations.forEach(function(trans) {
                if (trans.value !== "none") {
                    transformationDropdown.addItem(
                        trans.label,
                        trans.value,
                        currentConfig.transformation === trans.value
                    );
                }
            });
            
            widgets.push(transformationDropdown);
        }
    } else if (currentConfig.transformation && currentConfig.transformation !== "none") {
        // If we have a transformation configured but no properties loaded, still show it
        widgets.push(
            CardService.newTextParagraph()
                .setText("<b>Transformation (previously set):</b> " + currentConfig.transformation)
        );
    }
    
    // Refresh/Load button - always show
    var buttonSet = CardService.newButtonSet();
    buttonSet.addButton(
        CardService.newTextButton()
            .setText("🔄 Load Database Fields")
            .setOnClickAction(
                CardService.newAction()
                    .setFunctionName("refreshRelationFields")
                    .setParameters({ 
                        propertyId: propertyId,
                        propertyName: property.name,
                        relationConfig: JSON.stringify(property.config || {})
                    })
            )
    );
    
    widgets.push(buttonSet);
    
    // Info about how it works
    widgets.push(
        CardService.newTextParagraph()
            .setText("<font color='#5F6368'><i>The email field value will be matched against the selected field in the related database to find and link related pages.</i></font>")
    );
    
    return widgets;
}

/**
 * Process relation configuration from form inputs
 * @param {Object} property - Notion property object
 * @param {Object} formInput - Form input data
 * @returns {Object} Processed configuration
 */
function processRelationConfiguration(property, formInput) {
    console.log("Processing relation configuration for property: " + property.name);
    
    var propertyId = property.id;
    var enabled = formInput["relation_enabled_" + propertyId] === "true";
    var matchProperty = formInput["relation_match_property_" + propertyId] || "";
    var matchValue = formInput["relation_match_value_" + propertyId] || "";
    var transformation = formInput["relation_transformation_" + propertyId] || "none";
    
    // The relation is enabled if the user selected both a match property and match value
    var actuallyEnabled = enabled && matchProperty && matchValue;
    
    return {
        type: property.type,
        notionPropertyName: property.name,
        enabled: actuallyEnabled,
        matchProperty: matchProperty,
        matchValue: matchValue,
        transformation: transformation,
        isStaticOption: false,
        isRelation: true,
        isRequired: property.isRequired || false,
        relationConfig: property.config || {}
    };
}

/**
 * Process relation data for Notion API
 * @param {Object} mapping - Relation mapping configuration
 * @param {Object} emailData - Extracted email data
 * @param {string} apiKey - Notion API key
 * @returns {Object|null} Formatted relation property for Notion API
 */
function processRelationForNotion(mapping, emailData, apiKey) {
    if (!mapping.enabled || !mapping.matchProperty || !mapping.matchValue) {
        console.log("Relation mapping not properly configured");
        return null;
    }
    
    console.log("Processing relation property: " + mapping.notionPropertyName);
    console.log("Looking for match: email." + mapping.matchValue + " -> database." + mapping.matchProperty);
    
    // Get the value from email data
    var emailValue = emailData[mapping.matchValue];
    if (!emailValue && emailValue !== false && emailValue !== 0) {
        console.log("No value found in email for field: " + mapping.matchValue);
        return null;
    }
    
    // Apply transformation if specified
    if (mapping.transformation && mapping.transformation !== "none") {
        emailValue = applyTransformation(emailValue, mapping.transformation);
    }
    
    console.log("Email value to match: " + emailValue);
    
    // Get the related database ID from the relation configuration
    var relatedDbId = getRelatedDatabaseId(mapping.relationConfig);
    if (!relatedDbId) {
        console.log("ERROR: Could not determine related database ID");
        return null;
    }
    
    try {
        // Search for pages in the related database that match the value
        var relatedPages = searchRelatedDatabase(
            relatedDbId,
            mapping.matchProperty,
            emailValue,
            apiKey
        );
        
        if (relatedPages && relatedPages.length > 0) {
            console.log("Found " + relatedPages.length + " matching pages in related database");
            
            // Return relation structure with page IDs
            return {
                relation: relatedPages.map(function(pageId) { return { id: pageId }; })
            };
        } else {
            console.log("No matching pages found in related database");
            return null;
        }
    } catch (e) {
        console.error("Error processing relation:", e);
        return null;
    }
}

/**
 * Search related database for matching pages
 * @param {string} databaseId - Related database ID
 * @param {string} propertyId - Property to match against
 * @param {any} value - Value to search for
 * @param {string} apiKey - Notion API key
 * @returns {Array<string>} Array of matching page IDs
 */
function searchRelatedDatabase(databaseId, propertyId, value, apiKey) {
    console.log("Searching database " + databaseId + " for property " + propertyId + " = " + value);
    
    try {
        // First, we need to get the property type to know how to construct the filter
        var schema = fetchNotionDatabaseSchema(databaseId, apiKey);
        if (!schema.success) {
            throw new Error("Could not fetch related database schema");
        }
        
        var property = schema.database.properties.find(function(p) { return p.id === propertyId; });
        if (!property) {
            throw new Error("Property " + propertyId + " not found in related database");
        }
        
        console.log("Property type for matching: " + property.type);
        
        // Construct filter based on property type
        var filter = {};
        var valueStr = value ? value.toString().trim() : "";
        
        // Handle different property types
        switch (property.type) {
            case "title":
            case "rich_text":
                filter = {
                    property: propertyId,
                    [property.type]: {
                        contains: valueStr
                    }
                };
                break;
                
            case "email":
                filter = {
                    property: propertyId,
                    email: {
                        equals: valueStr
                    }
                };
                break;
                
            case "url":
                filter = {
                    property: propertyId,
                    url: {
                        contains: valueStr
                    }
                };
                break;
                
            case "phone_number":
                filter = {
                    property: propertyId,
                    phone_number: {
                        contains: valueStr
                    }
                };
                break;
                
            case "number":
                var numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                    filter = {
                        property: propertyId,
                        number: {
                            equals: numValue
                        }
                    };
                } else {
                    console.log("Could not parse number value: " + value);
                    return [];
                }
                break;
                
            case "checkbox":
                var boolValue = value === "true" || value === true || value === "1" || value === 1;
                filter = {
                    property: propertyId,
                    checkbox: {
                        equals: boolValue
                    }
                };
                break;
                
            case "select":
            case "status":
                filter = {
                    property: propertyId,
                    [property.type]: {
                        equals: valueStr
                    }
                };
                break;
                
            case "multi_select":
                // For multi-select, we can check if it contains the value
                filter = {
                    property: propertyId,
                    multi_select: {
                        contains: valueStr
                    }
                };
                break;
                
            case "date":
                try {
                    var dateValue = new Date(value);
                    if (!isNaN(dateValue.getTime())) {
                        filter = {
                            property: propertyId,
                            date: {
                                equals: dateValue.toISOString().split('T')[0] // Date only (YYYY-MM-DD)
                            }
                        };
                    }
                } catch (e) {
                    console.log("Could not parse date value: " + value);
                }
                break;
                
            default:
                console.log("Property type " + property.type + " not supported for automatic matching");
                return [];
        }
        
        if (Object.keys(filter).length === 0) {
            console.log("No valid filter constructed");
            return [];
        }
        
        console.log("Constructed filter:", JSON.stringify(filter, null, 2));
        
        // Search the database
        var response = UrlFetchApp.fetch(
            "https://api.notion.com/v1/databases/" + databaseId + "/query",
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + apiKey,
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json"
                },
                payload: JSON.stringify({
                    filter: filter,
                    page_size: 10  // Limit results
                }),
                muteHttpExceptions: true
            }
        );
        
        if (response.getResponseCode() === 200) {
            var result = JSON.parse(response.getContentText());
            console.log("Found " + result.results.length + " matching pages");
            return result.results.map(function(page) { return page.id; });
        } else {
            console.error("Error searching database: " + response.getContentText());
            return [];
        }
    } catch (e) {
        console.error("Error in searchRelatedDatabase:", e);
        return [];
    }
}

/**
 * Refresh relation fields via user action
 * @param {Object} e - Event object with parameters
 * @returns {CardService.ActionResponse} Action response
 */
function refreshRelationFields(e) {
    console.log("=== refreshRelationFields called ===");
    var propertyId = e.parameters.propertyId;
    var propertyName = e.parameters.propertyName;
    var relationConfig = JSON.parse(e.parameters.relationConfig || "{}");
    
    console.log("Refreshing fields for " + propertyName + " (" + propertyId + ")");
    
    try {
        // Clear cache for this database
        var relatedDbId = getRelatedDatabaseId(relationConfig);
        if (relatedDbId) {
            var cacheKey = "relation_props_" + relatedDbId;
            if (RELATION_PROPERTY_CACHE[cacheKey]) {
                delete RELATION_PROPERTY_CACHE[cacheKey];
                console.log("Cleared cache for database: " + relatedDbId.substring(0,8));
            }
        }
        
        // Force a fresh fetch
        var freshProperties = fetchRelatedDatabaseProperties(relationConfig);
        console.log("Refreshed " + freshProperties.length + " properties");
        
        // Return success notification and refresh the card
        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText("✅ Fields refreshed! The form has been updated.")
            )
            .setNavigation(
                CardService.newNavigation()
                    .updateCard(buildMappingsCard())
            )
            .build();
            
    } catch (error) {
        console.error("Error refreshing fields:", error);
        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText("❌ Failed to refresh fields: " + error.message)
            )
            .setNavigation(
                CardService.newNavigation()
                    .updateCard(buildMappingsCard())
            )
            .build();
    }
}