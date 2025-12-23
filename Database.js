/**
 * @fileoverview Database selection and management/
 * @version 2.0.0
 * @description Handles fetching and selecting Notion databases
 */

/**
 * Fetch real databases from Notion API
 * @returns {Array<{id: string, name: string, url: string, icon: Object, lastEdited: string}>} Array of databases
 */
function fetchRealNotionDatabases() {
  console.log("=== DEBUG: fetchRealNotionDatabases called ===");
  
  const config = getConfig();
  
  if (!config.apiKey) {
    console.log("ERROR: No API key configured");
    return [];
  }
  
  try {
    const options = {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      payload: JSON.stringify({
        filter: {
          property: "object",
          value: "database"
        },
        sort: {
          direction: "descending",
          timestamp: "last_edited_time"
        }
      }),
      muteHttpExceptions: true
    };
    
    console.log("Making API request to Notion...");
    const response = UrlFetchApp.fetch("https://api.notion.com/v1/search", options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("Notion API response status: " + statusCode);
    
    if (statusCode === 200) {
      const data = JSON.parse(responseText);
      const databases = data.results || [];
      
      console.log(`Found ${databases.length} databases`);
      
      return databases.map(db => {
        let name = "Untitled Database";
        
        // Extract title from database properties
        if (db.title && db.title.length > 0) {
          name = db.title[0].plain_text;
        } else if (db.properties) {
          const titleProp = Object.values(db.properties).find(prop => prop.type === "title");
          if (titleProp) {
            name = titleProp.name || "Untitled Database";
          }
        }
        
        return {
          id: db.id,
          name: name,
          url: db.url,
          icon: db.icon,
          lastEdited: db.last_edited_time
        };
      });
    } else {
      console.error(`Notion API error ${statusCode}:`, responseText.substring(0, 200));
      return [];
    }
    
  } catch (error) {
    console.error("Error fetching databases:", error);
    return [];
  }
}

/**
 * Save selected database to user properties
 * @param {Object} event - Google Apps Script event object
 * @param {Object} event.formInput - Form input data
 * @returns {CardService.ActionResponse} Action response
 */
function saveDatabaseSelection(event) {
  console.log("saveDatabaseSelection called", event?.formInput);
  
  try {
    const selectedDatabaseId = event?.formInput?.selected_database;
    
    if (!selectedDatabaseId) {
      throw new Error("No database selected");
    }
    
    // Find the database name
    const databases = fetchRealNotionDatabases();
    const selectedDatabase = databases.find(db => db.id === selectedDatabaseId);
    const databaseName = selectedDatabase ? selectedDatabase.name : "Selected Database";
    
    // Save to properties
    const props = PropertiesService.getUserProperties();
    props.setProperty("G2N_DATABASE_ID", selectedDatabaseId);
    props.setProperty("G2N_DATABASE_NAME", databaseName);
    
    console.log(`Database saved: ${databaseName} (${selectedDatabaseId})`);
    
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("✅ Selected: " + databaseName))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildMappingsCard()))
      .build();
      
  } catch (error) {
    console.error("Error saving database selection:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("❌ Failed to select database: " + error.message))
      .build();
  }
}

/**
 * Show database selection interface
 * @returns {CardService.ActionResponse|CardService.Card} Database selection card
 */
function showDatabaseSelection() {
  console.log("✅ showDatabaseSelection called");
  
  // If no API key, redirect to settings first
  if (!getConfig().apiKey) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification()
        .setText("⚠️ Please enter your Notion API key first"))
      .setNavigation(CardService.newNavigation()
        .updateCard(buildSettingsCard()))
      .build();
  }
  
  return buildDatabaseSelectionCard();
}

/**
 * Handle database selection completion
 * @returns {CardService.Card} Next card to display
 */
function handleDatabaseSelected() {
  console.log("handleDatabaseSelected called");
  
  const config = getConfig();
  
  if (config.databaseId) {
    // After database selection, show mappings configuration
    return buildMappingsCard();
  } else {
    console.error("No database selected");
    return buildErrorCard("Error", "No database selected");
  }
}