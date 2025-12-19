function testCompleteSave() {
  console.log("=== TEST COMPLETE SAVE ===");
  
  try {
    // Get a real email
    const threads = GmailApp.getInboxThreads(0, 1);
    const message = threads[0].getMessages()[0];
    const messageId = message.getId();
    
    console.log("Using email:", message.getSubject());
    
    // Get config
    const config = getConfig();
    if (!config.apiKey || !config.databaseId) {
      return "❌ Please configure API key and database first";
    }
    
    console.log("Database:", config.databaseName);
    
    // Extract email data
    const emailData = extractCompleteEmailData(messageId);
    if (!emailData) {
      return "❌ Could not extract email data";
    }
    
    // Get mappings
    const props = PropertiesService.getUserProperties();
    const mappingsJson = props.getProperty('G2N_MAPPINGS');
    const mappings = JSON.parse(mappingsJson);
    
    console.log("Mappings:", Object.keys(mappings).length);
    
    // Apply mappings
    const notionProperties = applyMappings(emailData, mappings);
    
    console.log("Properties created:", Object.keys(notionProperties).length);
    
    if (Object.keys(notionProperties).length === 0) {
      return "❌ No properties created. Check applyMappings function.";
    }
    
    // Log what will be sent
    console.log("\nProperties to send to Notion:");
    Object.entries(notionProperties).forEach(([propName, propValue], i) => {
      const propStr = JSON.stringify(propValue);
      console.log(`${i + 1}. ${propName}: ${propStr.substring(0, 80)}${propStr.length > 80 ? '...' : ''}`);
    });
    
    // Save to Notion
    console.log("\nSaving to Notion...");
    const result = saveToNotionAPI(config.apiKey, config.databaseId, notionProperties);
    
    console.log("✅ SUCCESS! Saved to Notion");
    console.log("Page ID:", result.id);
    console.log("Page URL:", result.url);
    
    return `✅ Email saved to Notion!\n${result.url}`;
    
  } catch (error) {
    console.error("❌ Error:", error);
    console.error("Full error:", error.stack || error.toString());
    return `❌ Failed: ${error.message}`;
  }
}
function testQuickSetup() {
  console.log("=== TEST QUICK SETUP ===");
  
  // First, ensure we have mappings
  const props = PropertiesService.getUserProperties();
  let mappingsJson = props.getProperty('G2N_MAPPINGS');
  
  if (!mappingsJson) {
    console.log("No mappings found, creating test mappings...");
    
    // Get database schema to create test mappings
    const config = getConfig();
    const notionSchema = fetchNotionDatabaseSchema(config.databaseId, config.apiKey);
    
    if (!notionSchema.success) {
      return "❌ Cannot test: Need database schema first";
    }
    
    // Create test mappings (simulating what saveMappingsConfiguration would create)
    const testMappings = {};
    notionSchema.database.properties.forEach(prop => {
      if (prop.supportedForMapping) {
        testMappings[prop.id] = {
          type: prop.type,
          notionPropertyName: prop.name,
          enabled: false,
          isStaticOption: prop.type === 'select' || prop.type === 'status' || prop.type === 'multi_select' || prop.type === 'checkbox'
        };
      }
    });
    
    props.setProperty('G2N_MAPPINGS', JSON.stringify(testMappings));
    mappingsJson = JSON.stringify(testMappings);
    console.log("Created test mappings");
  }
  
  // Now test enableCommonFields
  console.log("\nCalling enableCommonFields...");
  
  try {
    // We can't call the CardService response directly in test, so call the logic
    const mappings = JSON.parse(mappingsJson);
    let enabledCount = 0;
    
    Object.values(mappings).forEach(mapping => {
      const propName = mapping.notionPropertyName.toLowerCase();
      const propType = mapping.type;
      
      const shouldEnable = 
        propType === 'title' ||
        (propType === 'email' && propName.includes('sender')) ||
        (propType === 'rich_text' && propName.includes('body')) ||
        (propType === 'url' && propName.includes('gmail'));
      
      if (shouldEnable && !mapping.enabled) {
        mapping.enabled = true;
        enabledCount++;
      }
    });
    
    console.log(`Would enable ${enabledCount} fields`);
    console.log("\nFields that would be enabled:");
    Object.values(mappings).forEach(m => {
      if (m.enabled) {
        console.log(`• ${m.notionPropertyName} (${m.type})`);
      }
    });
    
    return `✅ Quick Setup would enable ${enabledCount} fields`;
    
  } catch (error) {
    console.error("Test failed:", error);
    return `❌ Test failed: ${error.message}`;
  }
}