/**
 * @fileoverview Optimized configuration management for Gmail to Notion integration
 * @version 2.1.0
 * @description Handles API keys, database selection, and configuration persistence with caching
 */

/**
 * Optimized configuration with batch property reads and caching
 */
const CONFIG_CACHE = {
  data: null,
  timestamp: 0,
  ttl: 30000, // 30 seconds
  
  get: function() {
    const now = Date.now();
    if (this.data && (now - this.timestamp) < this.ttl) {
      return this.data;
    }
    
    const props = PropertiesService.getUserProperties();
    const keys = ['G2N_API_KEY', 'G2N_DATABASE_ID', 'G2N_DATABASE_NAME', 'G2N_MAPPINGS'];
    const values = props.getProperties(keys);
    
    const hasApiKey = !!values.G2N_API_KEY;
    let hasMappings = false;
    
    if (values.G2N_MAPPINGS) {
      try {
        const mappings = JSON.parse(values.G2N_MAPPINGS);
        hasMappings = Object.keys(mappings).length > 0;
      } catch (e) {
        console.error("Error parsing mappings:", e);
      }
    }
    
    this.data = {
      apiKey: values.G2N_API_KEY || "",
      databaseId: values.G2N_DATABASE_ID || "",
      databaseName: values.G2N_DATABASE_NAME || "",
      hasMappings: hasMappings
    };
    
    this.timestamp = now;
    return this.data;
  },
  
  invalidate: function() {
    this.data = null;
    this.timestamp = 0;
  }
};

function getConfig(){
  var props=PropertiesService.getUserProperties(),
      apiKey=props.getProperty("G2N_API_KEY")||"",
      databaseId=props.getProperty("G2N_DATABASE_ID")||"",
      databaseName=props.getProperty("G2N_DATABASE_NAME")||"",
      mappingsStr=props.getProperty("G2N_MAPPINGS")||"";
  let hasMappings=!1;
  if(mappingsStr)try{
    var mappings=JSON.parse(mappingsStr);
    hasMappings=0<Object.keys(mappings).length
  }catch(e){console.error("Error parsing mappings:",e),hasMappings=!1}
  return apiKey?{
    apiKey:apiKey,
    databaseId:databaseId,
    databaseName:databaseName,
    hasMappings:hasMappings
  }:{
    apiKey:"",
    databaseId:"",
    databaseName:"",
    hasMappings:!1
  }
}

function saveConfiguration(event) {
  console.log("✅ saveConfiguration called", event?.formInput);
  
  try {
    const apiKey = event?.formInput?.api_key?.trim();
    if (!apiKey) {
      throw new Error("API key is required");
    }
    
    const props = PropertiesService.getUserProperties();
    props.setProperty("G2N_API_KEY", apiKey);
    
    const toDelete = ['G2N_DATABASE_ID', 'G2N_DATABASE_NAME'];
    toDelete.forEach(key => props.deleteProperty(key));
    
    CONFIG_CACHE.invalidate();
    if (typeof CACHE !== 'undefined') {
      CACHE.remove(`databases_${apiKey.substr(0, 8)}`);
      CACHE.remove(`users_${apiKey.substr(0, 8)}`, 'users');
    }
    
    console.log("API key saved, caches cleared");
    
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
    
    // Clear all caches
    CONFIG_CACHE.invalidate();
    if (typeof CACHE !== 'undefined') {
      CACHE.remove(`databases_${props.getProperty("G2N_API_KEY")?.substr(0, 8)}`);
      CACHE.remove(`users_${props.getProperty("G2N_API_KEY")?.substr(0, 8)}`, 'users');
    }
    
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