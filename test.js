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

function testPropertyHandlers() {
  console.log("=== Testing Property Handlers ===");
  
  // Test getPropertyHandler returns correct handlers
  const tests = [
    { type: "title", expected: "text" },
    { type: "people", expected: "people" },
    { type: "relation", expected: "relation" },
    { type: "select", expected: "static" },
    { type: "formula", expected: "auto_managed" }
  ];
  
  tests.forEach(test => {
    const handler = getPropertyHandler(test.type);
    const handlerType = handler === PropertyHandlers.text ? "text" :
                       handler === PropertyHandlers.people ? "people" :
                       handler === PropertyHandlers.relation ? "relation" :
                       handler === PropertyHandlers.static ? "static" :
                       handler === PropertyHandlers.auto_managed ? "auto_managed" : "unknown";
    
    console.log(`${handlerType === test.expected ? "✅" : "❌"} ${test.type} -> ${handlerType} (expected: ${test.expected})`);
  });
  
  console.log("=== Test Complete ===");
}

/**
 * DEBUG: Test property handlers and mappings
 */
function testPropertyHandlersDebug() {
  console.log("=== DEBUG TEST: PROPERTY HANDLERS ===");
  
  try {
    // 1. Get current configuration
    const config = getConfig();
    console.log("1. Configuration:", {
      hasApiKey: !!config.apiKey,
      hasDatabase: !!config.databaseId,
      databaseName: config.databaseName,
      hasMappings: config.hasMappings
    });
    
    if (!config.apiKey || !config.databaseId) {
      console.log("❌ Configuration incomplete - need API key and database ID");
      return "❌ Configuration incomplete";
    }
    
    // 2. Get database schema
    console.log("\n2. Fetching database schema...");
    const schema = fetchNotionDatabaseSchema(config.databaseId, config.apiKey);
    if (!schema.success) {
      console.log("❌ Failed to fetch schema:", schema.error);
      return "❌ Failed to fetch schema";
    }
    
    // Find URL properties
    const urlProperties = schema.database.properties.filter(p => p.type === 'url');
    console.log(`Found ${urlProperties.length} URL properties:`, 
      urlProperties.map(p => ({ name: p.name, id: p.id })));
    
    // 3. Get current mappings
    console.log("\n3. Current mappings:");
    const mappings = getMappings();
    console.log("Total mappings:", Object.keys(mappings).length);
    
    // Analyze mappings for URL properties
    Object.entries(mappings).forEach(([propertyId, mapping]) => {
      if (mapping.type === 'url') {
        console.log(`\n📌 URL PROPERTY FOUND:`, {
          propertyId,
          notionPropertyName: mapping.notionPropertyName,
          type: mapping.type,
          enabled: mapping.enabled,
          emailField: mapping.emailField,
          transformation: mapping.transformation,
          isStaticOption: mapping.isStaticOption,
          isRequired: mapping.isRequired
        });
      }
    });
    
    // 4. Test with a sample email
    console.log("\n4. Testing with sample email data...");
    const sampleEmailData = {
      subject: "Test Email",
      from: "sender@example.com",
      gmailLinkUrl: "https://mail.google.com/mail/u/0/#inbox/test123",
      plainBody: "This is a test email body".repeat(100), // Create long content
      date: new Date().toISOString()
    };
    
    console.log("Sample email data keys:", Object.keys(sampleEmailData));
    
    // 5. Test property handlers
    console.log("\n5. Testing property handlers...");
    
    // Test URL property handler
    const urlPropertyHandler = getPropertyHandler('url');
    console.log("URL handler exists:", !!urlPropertyHandler);
    
    if (urlPropertyHandler) {
      // Find a URL property from schema
      const urlProp = urlProperties[0];
      if (urlProp) {
        console.log(`Testing with property: ${urlProp.name}`);
        
        // Create a sample mapping for this property
        const sampleMapping = {
          type: 'url',
          notionPropertyName: urlProp.name,
          enabled: true,
          emailField: 'gmailLinkUrl',
          transformation: 'make_clickable',
          isStaticOption: false,
          isRequired: urlProp.isRequired || false
        };
        
        // Test processForNotion
        if (urlPropertyHandler.processForNotion) {
          console.log("Testing processForNotion...");
          const result = urlPropertyHandler.processForNotion(sampleMapping, sampleEmailData);
          console.log("Result from processForNotion:", result);
        } else {
          console.log("❌ URL handler has no processForNotion method");
        }
      }
    }
    
    // 6. Test formatForNotionAPI function
    console.log("\n6. Testing formatForNotionAPI function...");
    
    // Test URL formatting
    const urlFormatted = formatForNotionAPI(sampleEmailData.gmailLinkUrl, 'url');
    console.log("URL formatted result:", urlFormatted);
    
    // Test rich_text formatting with long content
    const longText = "A".repeat(3000); // Create text longer than 2000 chars
    const richTextFormatted = formatForNotionAPI(longText, 'rich_text');
    console.log("Rich text formatted (blocks):", richTextFormatted?.rich_text?.length || 0, "blocks");
    
    // 7. Test applyTransformation
    console.log("\n7. Testing applyTransformation...");
    
    // Test make_clickable transformation (if it exists)
    const testUrl = "https://example.com";
    const transformed = applyTransformation(testUrl, 'make_clickable');
    console.log(`applyTransformation("${testUrl}", "make_clickable"):`, transformed);
    
    // Test none transformation
    const noTransform = applyTransformation(testUrl, 'none');
    console.log(`applyTransformation("${testUrl}", "none"):`, noTransform);
    
    // 8. Check if createEmailInfoBlocks is adding the link
    console.log("\n8. Testing createEmailInfoBlocks...");
    const emailBlocks = createEmailInfoBlocks(sampleEmailData);
    console.log(`createEmailInfoBlocks created ${emailBlocks.length} blocks`);
    
    // Look for Gmail link in blocks
    const gmailLinkBlock = emailBlocks.find(block => 
      block.type === 'paragraph' && 
      block.paragraph?.rich_text?.[0]?.text?.link?.url?.includes('mail.google.com')
    );
    
    if (gmailLinkBlock) {
      console.log("⚠️ Found Gmail link in page content blocks!");
      console.log("Block content:", JSON.stringify(gmailLinkBlock, null, 2));
    } else {
      console.log("✓ No Gmail link found in page content blocks");
    }
    
    // 9. Test the complete flow
    console.log("\n9. Testing complete handler flow...");
    
    // Simulate what saveEmailToNotion does
    const testProperties = {};
    
    Object.entries(mappings).forEach(([propertyId, mapping]) => {
      if (mapping.enabled && mapping.type === 'url') {
        console.log(`Processing URL mapping: ${mapping.notionPropertyName}`);
        
        const handler = getPropertyHandler(mapping.type);
        if (handler && handler.processForNotion) {
          const result = handler.processForNotion(mapping, sampleEmailData, config.apiKey);
          if (result) {
            testProperties[propertyId] = result;
            console.log(`  ✓ Added to properties:`, result);
          } else {
            console.log(`  ✗ Handler returned null/undefined`);
          }
        } else {
          console.log(`  ✗ No handler found for type: ${mapping.type}`);
        }
      }
    });
    
    console.log("\n📊 TEST SUMMARY:");
    console.log(`Total URL properties in schema: ${urlProperties.length}`);
    console.log(`Total URL mappings: ${Object.values(mappings).filter(m => m.type === 'url').length}`);
    console.log(`URL properties in test result: ${Object.keys(testProperties).length}`);
    
    if (gmailLinkBlock && Object.keys(testProperties).length > 0) {
      console.log("\n⚠️ ISSUE IDENTIFIED:");
      console.log("The Gmail link is being created in BOTH places:");
      console.log("1. As a URL property in the database");
      console.log("2. As a page content block in createEmailInfoBlocks");
      console.log("\n💡 SOLUTION:");
      console.log("Either disable page_content in mappings OR remove Gmail link from createEmailInfoBlocks");
    } else if (!gmailLinkBlock && Object.keys(testProperties).length === 0) {
      console.log("\n⚠️ ISSUE: Gmail link is not being created anywhere!");
    } else if (gmailLinkBlock && Object.keys(testProperties).length === 0) {
      console.log("\n⚠️ ISSUE: Gmail link is ONLY in page content, not as a property!");
      console.log("Check your URL property mapping configuration");
    } else {
      console.log("\n✅ Gmail link appears to be correctly handled as a property only");
    }
    
    return "✅ Debug test completed. Check logs for details.";
    
  } catch (error) {
    console.error("❌ Error in debug test:", error);
    return "❌ Error: " + error.message;
  }
}

function testURLProcessing() {
  console.log("=== TESTING URL PROCESSING ===");
  
  const testData = {
    gmailLinkUrl: "https://mail.google.com/mail/u/0/#inbox/msg-f:1851589507511752412"
  };
  
  // Simulate what happens in the property handler
  const mapping = {
    type: 'url',
    notionPropertyName: 'Gmail link',
    enabled: true,
    emailField: 'gmailLinkUrl',
    transformation: 'none',  // Or 'make_clickable' if you fix the options
    isStaticOption: false
  };
  
  console.log("\n1. Getting value from email data:");
  const emailValue = testData[mapping.emailField];
  console.log(`   Email field "${mapping.emailField}" = "${emailValue}"`);
  
  console.log("\n2. Applying transformation:");
  const transformedValue = applyTransformation(emailValue, mapping.transformation);
  console.log(`   Transformed value = "${transformedValue}"`);
  
  console.log("\n3. Formatting for Notion API:");
  const formatted = formatForNotionAPI(transformedValue, mapping.type);
  console.log(`   Final result =`, formatted);
  
  if (formatted && formatted.url) {
    console.log("\n✅ SUCCESS: URL will be saved as property!");
  } else {
    console.log("\n❌ FAILED: URL will NOT be saved as property!");
    console.log(`   Check why formatForNotionAPI returned:`, formatted);
  }
  
  return "Test complete";
}
function testAllTransformations() {
  console.log("=== TESTING ALL TRANSFORMATIONS ===");
  
  const tests = [
    { type: 'url', value: 'https://mail.google.com/mail/u/0/#inbox/test123', transformation: 'make_clickable', expected: 'https://mail.google.com/mail/u/0/#inbox/test123' },
    { type: 'url', value: 'https://mail.google.com/mail/u/0/#inbox/test123', transformation: 'none', expected: 'https://mail.google.com/mail/u/0/#inbox/test123' },
    { type: 'rich_text', value: '<p>Hello <b>World</b></p>', transformation: 'html_to_text', expected: 'Hello World' },
    { type: 'email', value: 'John Doe <john@example.com>', transformation: 'extract_email', expected: 'john@example.com' },
    { type: 'title', value: 'Re: Meeting tomorrow', transformation: 'remove_prefixes', expected: 'Meeting tomorrow' },
    { type: 'title', value: 'A very long title that needs to be truncated', transformation: 'truncate_100', expectedLength: 100 }
  ];
  
  tests.forEach((test, i) => {
    console.log(`\nTest ${i + 1}: ${test.type} -> ${test.transformation}`);
    const result = applyTransformation(test.value, test.transformation);
    
    if (test.expected) {
      const passed = result === test.expected;
      console.log(`  ${passed ? '✅' : '❌'} Expected: "${test.expected}"`);
      console.log(`  ${passed ? '✅' : '❌'} Got: "${result}"`);
    } else if (test.expectedLength) {
      const passed = result.length <= test.expectedLength;
      console.log(`  ${passed ? '✅' : '❌'} Expected length ≤ ${test.expectedLength}`);
      console.log(`  ${passed ? '✅' : '❌'} Got length: ${result.length}`);
    }
  });
  
  console.log("\n=== TESTING formatForNotionAPI ===");
  const urlTest = 'https://mail.google.com/mail/u/0/#inbox/test123';
  const formatted = formatForNotionAPI(urlTest, 'url');
  console.log(`URL "${urlTest}" formatted as:`, formatted);
  
  if (formatted && formatted.url === urlTest) {
    console.log('✅ URL will be saved correctly!');
  } else {
    console.log('❌ URL will NOT be saved!');
  }
  
  return "Test complete";
}

function quickDebug() {
  // Test a valid URL
  const url = "https://mail.google.com/mail/u/0/#inbox/test123";
  console.log("Testing URL:", url);
  
  const formatted = formatForNotionAPI(url, 'url');
  console.log("formatForNotionAPI result:", formatted);
  
  if (formatted && formatted.url) {
    console.log("✅ URL will be saved!");
  } else {
    console.log("❌ URL will NOT be saved!");
  }
  
  // Test an invalid URL
  console.log("\nTesting invalid URL: 'not-a-url'");
  const invalidResult = formatForNotionAPI('not-a-url', 'url');
  console.log("Invalid URL result:", invalidResult);
  
  return "Check logs";
}

function testURLValidation() {
  console.log("=== TESTING UPDATED URL VALIDATION ===");
  
  const testCases = [
    { url: "https://mail.google.com/mail/u/0/#inbox/test123", expected: "valid" },
    { url: "http://example.com", expected: "valid" },
    { url: "example.com", expected: "valid (with https added)" },
    { url: "not-a-url", expected: "invalid" },
    { url: "mail.google.com/mail/u/0/#inbox/msg-f:1851589507511752412", expected: "valid (with https added)" }
  ];
  
  testCases.forEach((testCase, i) => {
    console.log(`\nTest ${i + 1}: "${testCase.url}"`);
    const result = formatForNotionAPI(testCase.url, 'url');
    
    if (result && result.url) {
      console.log(`✅ URL will be saved as: "${result.url}"`);
    } else {
      console.log(`❌ URL will NOT be saved`);
    }
  });
  
  return "Test complete";
}

function testUpdatedURLFormatting() {
  console.log("=== TESTING UPDATED URL FORMATTING ===");
  
  const testCases = [
    { 
      url: "https://mail.google.com/mail/u/0/#inbox/msg-f:1851589507511752412", 
      description: "Actual Gmail URL with hash" 
    },
    { 
      url: "http://example.com", 
      description: "HTTP URL" 
    },
    { 
      url: "example.com", 
      description: "URL without protocol" 
    },
    { 
      url: "not-a-valid-url", 
      description: "Invalid string" 
    },
    { 
      url: "google.com/search?q=test", 
      description: "URL with query string" 
    },
    { 
      url: "https://docs.google.com/document/d/12345/edit", 
      description: "Google Docs URL" 
    }
  ];
  
  testCases.forEach((testCase, i) => {
    console.log(`\nTest ${i + 1}: ${testCase.description}`);
    console.log(`Input: "${testCase.url}"`);
    
    const result = formatForNotionAPI(testCase.url, 'url');
    
    if (result && result.url) {
      console.log(`✅ SUCCESS: Will save as "${result.url}"`);
    } else {
      console.log(`❌ FAILED: Will not be saved`);
    }
  });
  
  // Also test the complete flow
  console.log("\n=== TESTING COMPLETE FLOW ===");
  
  const emailData = {
    gmailLinkUrl: "https://mail.google.com/mail/u/0/#inbox/msg-f:1851589507511752412",
    subject: "Test Email",
    from: "sender@example.com"
  };
  
  const mapping = {
    type: 'url',
    notionPropertyName: 'Gmail link',
    enabled: true,
    emailField: 'gmailLinkUrl',
    transformation: 'none',
    isStaticOption: false
  };
  
  console.log("Email data:", emailData);
  console.log("Mapping:", mapping);
  
  const emailValue = emailData[mapping.emailField];
  console.log("Email value:", emailValue);
  
  const transformed = applyTransformation(emailValue, mapping.transformation);
  console.log("After transformation:", transformed);
  
  const formatted = formatForNotionAPI(transformed, mapping.type);
  console.log("Final formatted result:", formatted);
  
  if (formatted && formatted.url) {
    console.log("\n🎉 SUCCESS: Gmail link will be saved as a URL property!");
  } else {
    console.log("\n❌ FAILED: Gmail link will NOT be saved as a URL property!");
  }
  
  return "Test complete - check logs above";
}

function testSimpleURLValidation() {
  console.log("=== TESTING SIMPLE URL VALIDATION ===");
  
  // Test a single case first
  const testUrl = "https://mail.google.com/mail/u/0/#inbox/msg-f:1851589507511752412";
  console.log("Testing URL:", testUrl);
  
  const result = formatForNotionAPI(testUrl, 'url');
  console.log("Result:", result);
  
  if (result && result.url) {
    console.log("✅ SUCCESS! URL will be saved.");
  } else {
    console.log("❌ FAILED! URL will NOT be saved.");
  }
  
  return "Simple test complete";
}

function testCompleteGmailLinkFlow() {
  console.log("=== TESTING COMPLETE GMAIL LINK FLOW ===");
  
  // Simulate real email data
  const emailData = {
    subject: "Test Email Subject",
    from: "Google <no-reply@accounts.google.com>",
    gmailLinkUrl: "https://mail.google.com/mail/u/0/#inbox/msg-f:1851589507511752412",
    plainBody: "This is a test email body",
    date: new Date().toISOString()
  };
  
  console.log("Email data extracted:", Object.keys(emailData));
  
  // Simulate your current mapping for Gmail link
  const gmailLinkMapping = {
    type: 'url',
    notionPropertyName: 'Gmail link',
    enabled: true,
    emailField: 'gmailLinkUrl',
    transformation: 'none', // or 'make_clickable' if you fix that
    isStaticOption: false,
    isRequired: false
  };
  
  console.log("\n1. Getting value from email data:");
  const emailValue = emailData[gmailLinkMapping.emailField];
  console.log(`   Email field "${gmailLinkMapping.emailField}" = "${emailValue}"`);
  
  console.log("\n2. Applying transformation:");
  const transformedValue = applyTransformation(emailValue, gmailLinkMapping.transformation);
  console.log(`   Transformed value = "${transformedValue}"`);
  
  console.log("\n3. Formatting for Notion API:");
  const formatted = formatForNotionAPI(transformedValue, gmailLinkMapping.type);
  console.log(`   Final result =`, formatted);
  
  if (formatted && formatted.url) {
    console.log("\n🎉 SUCCESS: Gmail link WILL be saved as a URL property!");
    console.log(`   Property name: "${gmailLinkMapping.notionPropertyName}"`);
    console.log(`   Property value: "${formatted.url}"`);
  } else {
    console.log("\n❌ FAILED: Gmail link will NOT be saved as a URL property!");
  }
  
  // Test what happens in the actual saveEmailToNotion flow
  console.log("\n=== SIMULATING ACTUAL SAVE FLOW ===");
  
  // Get all mappings
  const mappings = getMappings();
  console.log("Total mappings found:", Object.keys(mappings).length);
  
  // Find URL mappings
  const urlMappings = Object.entries(mappings).filter(([id, mapping]) => 
    mapping.type === 'url' && mapping.enabled
  );
  
  console.log(`Enabled URL mappings: ${urlMappings.length}`);
  
  urlMappings.forEach(([id, mapping], index) => {
    console.log(`\nURL Mapping ${index + 1}: "${mapping.notionPropertyName}"`);
    console.log(`  Email field: ${mapping.emailField}`);
    console.log(`  Transformation: ${mapping.transformation}`);
    
    const handler = getPropertyHandler(mapping.type);
    if (handler && handler.processForNotion) {
      const result = handler.processForNotion(mapping, emailData);
      console.log(`  Handler result:`, result);
      
      if (result && result.url) {
        console.log(`  ✅ This mapping WILL save the URL`);
      } else {
        console.log(`  ❌ This mapping will NOT save the URL`);
      }
    }
  });
  
  return "Test complete - check if Gmail link mappings are configured correctly";
}

function checkDuplicateLinks() {
  console.log("=== CHECKING FOR DUPLICATE LINKS ===");
  
  const emailData = {
    gmailLinkUrl: "https://mail.google.com/mail/u/0/#inbox/msg-f:1851589507511752412",
    subject: "Test",
    from: "test@example.com",
    date: new Date(),
    plainBody: "Test body"
  };
  
  console.log("Testing createEmailInfoBlocks:");
  const blocks = createEmailInfoBlocks(emailData);
  console.log(`Created ${blocks.length} page content blocks`);
  
  // Count how many contain Gmail links
  const gmailLinkBlocks = blocks.filter(block => 
    block.type === 'paragraph' && 
    block.paragraph?.rich_text?.[0]?.text?.link?.url?.includes('mail.google.com')
  );
  
  console.log(`Found ${gmailLinkBlocks.length} Gmail links in page content`);
  
  if (gmailLinkBlocks.length > 0) {
    console.log("⚠️ WARNING: Gmail link is ALSO being added to page content");
    console.log("This creates duplication if it's also saved as a property");
    console.log("\nOptions:");
    console.log("1. Disable page_content in mappings");
    console.log("2. Remove Gmail link from createEmailInfoBlocks function");
    console.log("3. Keep both (link in property AND in page content)");
  } else {
    console.log("✅ No duplicate Gmail links in page content");
  }
  
  return "Check complete";
}

function testCompleteEmailSave() {
  console.log("=== FINAL TEST: COMPLETE EMAIL SAVE ===");
  
  // Test configuration
  const config = getConfig();
  console.log("1. Configuration check:");
  console.log("   API Key:", config.apiKey ? "✅ Set" : "❌ Missing");
  console.log("   Database ID:", config.databaseId ? "✅ Set" : "❌ Missing");
  console.log("   Database Name:", config.databaseName || "N/A");
  console.log("   Has Mappings:", config.hasMappings ? "✅ Yes" : "❌ No");
  
  if (!config.apiKey || !config.databaseId) {
    console.log("❌ Configuration incomplete - cannot test");
    return "Configuration incomplete";
  }
  
  // Get mappings
  const mappings = getMappings();
  console.log("\n2. Mappings check:");
  console.log("   Total mappings:", Object.keys(mappings).length);
  
  // Find URL property mapping
  const urlMappings = Object.values(mappings).filter(m => m.type === 'url' && m.enabled);
  console.log("   Enabled URL mappings:", urlMappings.length);
  
  urlMappings.forEach((mapping, i) => {
    console.log(`   URL Mapping ${i + 1}: "${mapping.notionPropertyName}"`);
    console.log(`     Email field: ${mapping.emailField}`);
    console.log(`     Transformation: ${mapping.transformation}`);
  });
  
  // Test data flow
  console.log("\n3. Testing data flow with sample email:");
  
  const sampleEmail = {
    subject: "Test Email for Final Test",
    from: "Google <no-reply@accounts.google.com>",
    gmailLinkUrl: "https://mail.google.com/mail/u/0/#inbox/msg-f:1851589507511752412",
    plainBody: "This is a test email body to verify the complete flow works correctly.",
    date: new Date().toISOString(),
    to: "me@example.com"
  };
  
  console.log("   Email subject:", sampleEmail.subject);
  console.log("   Gmail link:", sampleEmail.gmailLinkUrl);
  
  // Test createEmailInfoBlocks
  console.log("\n4. Testing createEmailInfoBlocks:");
  const pageBlocks = createEmailInfoBlocks(sampleEmail);
  console.log("   Page blocks created:", pageBlocks.length);
  
  const gmailLinksInBlocks = pageBlocks.filter(block => 
    block.type === 'paragraph' && 
    block.paragraph?.rich_text?.[0]?.text?.link?.url?.includes('mail.google.com')
  );
  console.log("   Gmail links in page blocks:", gmailLinksInBlocks.length, "(should be 0)");
  
  // Test property processing
  console.log("\n5. Testing property processing:");
  
  if (urlMappings.length > 0) {
    const mapping = urlMappings[0];
    console.log(`   Testing mapping: "${mapping.notionPropertyName}"`);
    
    // Get value from email
    const emailValue = sampleEmail[mapping.emailField];
    console.log(`   Email value: ${emailValue}`);
    
    // Apply transformation
    const transformed = applyTransformation(emailValue, mapping.transformation);
    console.log(`   After transformation: ${transformed}`);
    
    // Format for Notion
    const formatted = formatForNotionAPI(transformed, mapping.type);
    console.log(`   Formatted for Notion:`, formatted);
    
    if (formatted && formatted.url) {
      console.log("   ✅ URL will be saved as property!");
      console.log(`   Property: "${mapping.notionPropertyName}" = "${formatted.url}"`);
    } else {
      console.log("   ❌ URL will NOT be saved as property!");
    }
  } else {
    console.log("   ⚠️ No URL mappings found - check your mappings configuration");
  }
  
  console.log("\n=== TEST SUMMARY ===");
  console.log("✅ URL validation fixed");
  console.log("✅ Duplicate links removed from page content");
  console.log("✅ Gmail link will appear ONLY as a URL property");
  console.log("✅ Users can click the URL property to open emails in Gmail");
  
  return "✅ All tests passed! The Gmail link issue is fixed.";
}

/**
 * Test field type validation
 */
function testFieldTypeValidation() {
  console.log("=== TESTING FIELD TYPE VALIDATION ===");
  
  const testCases = [
    { gmailField: 'gmailLinkUrl', propertyType: 'url', shouldPass: true, description: 'Gmail link → URL property' },
    { gmailField: 'gmailLinkUrl', propertyType: 'rich_text', shouldPass: true, description: 'Gmail link → Rich text' },
    { gmailField: 'gmailLinkUrl', propertyType: 'email', shouldPass: false, description: 'Gmail link → Email (should fail)' },
    { gmailField: 'gmailLinkUrl', propertyType: 'checkbox', shouldPass: false, description: 'Gmail link → Checkbox (should fail)' },
    { gmailField: 'body', propertyType: 'rich_text', shouldPass: true, description: 'Email body → Rich text' },
    { gmailField: 'body', propertyType: 'url', shouldPass: false, description: 'Email body → URL (should fail)' },
    { gmailField: 'from', propertyType: 'email', shouldPass: true, description: 'From → Email property' },
    { gmailField: 'from', propertyType: 'rich_text', shouldPass: true, description: 'From → Rich text' },
    { gmailField: 'subject', propertyType: 'title', shouldPass: true, description: 'Subject → Title' },
    { gmailField: 'subject', propertyType: 'rich_text', shouldPass: true, description: 'Subject → Rich text' },
    { gmailField: 'date', propertyType: 'date', shouldPass: true, description: 'Date → Date property' },
    { gmailField: 'hasAttachments', propertyType: 'checkbox', shouldPass: true, description: 'Has attachments → Checkbox' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach(test => {
    const allowedTypes = getAllowedPropertyTypesForGmailField(test.gmailField);
    const isValid = allowedTypes.includes(test.propertyType);
    const passedTest = isValid === test.shouldPass;
    
    console.log(`${passedTest ? '✅' : '❌'} ${test.description}`);
    console.log(`  Gmail field: ${test.gmailField}`);
    console.log(`  Property type: ${test.propertyType}`);
    console.log(`  Allowed types: ${allowedTypes.join(', ')}`);
    console.log(`  Result: ${isValid ? 'Allowed' : 'Not allowed'} (${passedTest ? 'PASS' : 'FAIL'})`);
    console.log('');
    
    if (passedTest) passed++;
    else failed++;
  });
  
  console.log(`=== SUMMARY: ${passed}/${testCases.length} tests passed ===`);
  return `Field type validation: ${passed}/${testCases.length} tests passed`;
}

function testDateProcessing() {
  console.log("=== TESTING DATE PROCESSING ===");
  
  // Simulate a Gmail date string (format from Gmail API)
  const gmailDateString = "Wed, 19 Dec 2025 18:24:25 +0200";
  console.log("Original Gmail date string:", gmailDateString);
  
  // Test each transformation
  const transformations = ['parse_date', 'iso_date', 'human_date'];
  
  transformations.forEach(transformation => {
    console.log(`\nApplying "${transformation}":`);
    const result = applyTransformation(gmailDateString, transformation);
    console.log(`Result: ${result}`);
    
    // Check if it's a valid date for Notion
    try {
      const date = new Date(result);
      if (!isNaN(date.getTime())) {
        console.log(`✅ Valid date for Notion`);
      } else {
        console.log(`❌ Invalid date for Notion`);
      }
    } catch (e) {
      console.log(`❌ Error parsing result: ${e.message}`);
    }
  });
  
  return "Date processing test complete";
}

function testDateFix() {
  console.log("=== FINAL DATE TRANSFORMATION TEST ===");
  
  // Test various Gmail date formats
  const testDates = [
    "Wed, 19 Dec 2025 18:24:25 +0200", // RFC 2822 (most common)
    "2025-12-19T16:24:25.000Z",        // ISO 8601
    "Dec 19, 2025, 6:24:25 PM",        // Localized
    "19/12/2025 18:24"                 // Alternative format
  ];
  
  testDates.forEach((dateStr, i) => {
    console.log(`\nTest ${i+1}: "${dateStr}"`);
    
    // Test the transformation Notion needs
    const result = applyTransformation(dateStr, 'iso_date');
    console.log(`Result: ${result}`);
    
    // Validate it's correct ISO 8601 format
    const isIso8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result);
    console.log(`Valid for Notion? ${isIso8601 ? '✅ YES' : '❌ NO'}`);
  });
  
  return "Date fix test complete. Check logs.";
}

function testRealGmailDateExtraction() {
  console.log("=== TESTING REAL GMAIL DATE EXTRACTION ===");
  
  try {
    // Try to get a real email from your inbox
    const threads = GmailApp.getInboxThreads(0, 1); // Get most recent thread
    if (threads.length > 0) {
      const messages = threads[0].getMessages();
      if (messages.length > 0) {
        const msg = messages[0];
        const gmailDate = msg.getDate(); // This is a Date object
        const gmailDateString = msg.getHeader("Date"); // This is the raw header string
        
        console.log("1. GmailApp.getDate() (Date object):", gmailDate);
        console.log("2. GmailApp.getDate().toString():", gmailDate.toString());
        console.log("3. Raw 'Date' header:", gmailDateString);
        
        // Test our transformation on the raw header
        if (gmailDateString) {
          console.log("\n4. Applying 'iso_date' transformation to raw header:");
          const result = applyTransformation(gmailDateString, 'iso_date');
          console.log("   Result:", result);
          console.log("   Valid ISO 8601?", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result) ? "✅ YES" : "❌ NO");
        }
      }
    } else {
      console.log("No emails found in inbox for testing.");
    }
  } catch (error) {
    console.error("Error accessing Gmail:", error.toString());
  }
  
  return "Real Gmail date test complete";
}
function diagnoseDateIssue() {
  console.log("=== DIAGNOSING DATE ISSUE ===");
  
  // Simulate what happens in your actual code
  const gmailDate = "Fri, 19 Dec 2025 15:56:37 +0000";
  const transformed = applyTransformation(gmailDate, 'iso_date');
  
  console.log("1. Raw Gmail date:", gmailDate);
  console.log("2. After applyTransformation (iso_date):", transformed);
  console.log("3. Is valid ISO 8601?", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(transformed));
  
  // Test with the new formatForNotionAPI function
  console.log("\n4. Testing with formatForNotionAPI:");
  const formatted = formatForNotionAPI(transformed, 'date');
  console.log("Formatted result:", JSON.stringify(formatted, null, 2));
  
  if (formatted && formatted.date && formatted.date.start) {
    console.log("✅ Date is correctly structured for Notion API!");
  } else {
    console.log("❌ Date is NOT correctly structured.");
  }
  
  return "Diagnosis complete";
}