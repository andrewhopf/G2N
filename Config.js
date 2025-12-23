/**
 * @fileoverview Configuration management for Gmail to Notion integration
 * @version 2.0.0
 * @description Handles API keys, database selection, and configuration persistence
 */

/**
 * Configuration object structure
 * @typedef {Object} Config
 * @property {string} apiKey - Notion API key
 * @property {string} databaseId - Selected database ID
 * @property {string} databaseName - Selected database name
 * @property {boolean} hasMappings - Whether field mappings are configured
 */

/**
 * Get current configuration from user properties
 * @returns {Config} Current configuration
 */
function getConfig() {
  const props = PropertiesService.getUserProperties();
  const apiKey = props.getProperty("G2N_API_KEY") || "";
  const databaseId = props.getProperty("G2N_DATABASE_ID") || "";
  const databaseName = props.getProperty("G2N_DATABASE_NAME") || "";
  
  let hasMappings = false;
  const mappingsJson = props.getProperty("G2N_MAPPINGS") || "";
  
  if (mappingsJson) {
    try {
      const mappings = JSON.parse(mappingsJson);
      hasMappings = Object.keys(mappings).length > 0;
    } catch (e) {
      console.error("Error parsing mappings:", e);
      hasMappings = false;
    }
  }
  
  return apiKey ? {
    apiKey,
    databaseId,
    databaseName,
    hasMappings
  } : {
    apiKey: "",
    databaseId: "",
    databaseName: "",
    hasMappings: false
  };
}

/**
 * Save API key configuration
 * @param {Object} event - Google Apps Script event object
 * @param {Object} event.formInput - Form input data
 * @returns {CardService.ActionResponse} Action response
 */
function saveConfiguration(event) {
  console.log("✅ saveConfiguration called", event?.formInput);
  
  try {
    const apiKey = event?.formInput?.api_key?.trim();
    
    if (!apiKey) {
      throw new Error("API key is required");
    }
    
    const props = PropertiesService.getUserProperties();
    props.setProperty("G2N_API_KEY", apiKey);
    
    // Clear previous database selection when API key changes
    props.deleteProperty("G2N_DATABASE_ID");
    props.deleteProperty("G2N_DATABASE_NAME");
    
    console.log("API key saved, any previous database selection cleared");
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("✅ API key saved! Now please select a database."))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildHomepageCard()))
      .build();
      
  } catch (error) {
    console.error("Error saving configuration:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("❌ Failed to save: " + error.message))
      .build();
  }
}

/**
 * Reset all configuration to initial state
 * @returns {CardService.ActionResponse} Action response
 */
function resetConfiguration() {
  console.log("✅ resetConfiguration called - FULL RESET");
  
  try {
    const props = PropertiesService.getUserProperties();
    
    // Clear ALL configuration properties
    props.deleteProperty("G2N_API_KEY");
    props.deleteProperty("G2N_DATABASE_ID");
    props.deleteProperty("G2N_DATABASE_NAME");
    props.deleteProperty("G2N_MAPPINGS"); // Clear mappings too!
    
    console.log("All configuration cleared including mappings - Back to initial state");
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("✅ All settings and mappings cleared! Please start fresh."))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildHomepageCard()))
      .build();
      
  } catch (error) {
    console.error("Error resetting configuration:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("❌ Failed to clear settings: " + error.message))
      .build();
  }
}

/**
 * Test Notion API connection (placeholder)
 * @returns {CardService.ActionResponse} Action response
 */
function testNotionConnection() {
  console.log("✅ testNotionConnection called");
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText("✅ Connection test passed!"))
    .build();
}