// ============================================/
// FILE: EntryPoints.js
// DESCRIPTION: Entry point functions for Google Workspace Add-on
// ============================================

/**
 * Homepage entry point - called when add-on loads
 * @param {Object} event - Event object
 * @returns {CardService.Card} Homepage card
 */
function onG2NHomepage(event) {
  console.log("✅ onG2NHomepage called");
  
  try {
    return buildHomepageCard();
  } catch (error) {
    console.error("Error in homepage:", error);
    return buildErrorCard("Homepage Error", error.message);
  }
}

/**
 * Gmail message entry point - called when viewing an email
 * @param {Object} event - Event object with Gmail data
 * @returns {CardService.Card} Email preview card
 */
function onG2NGmailMessage(event) {
  console.log("✅ onG2NGmailMessage called", event?.gmail?.messageId);
  
  try {
    return buildEmailPreviewCard(event);
  } catch (error) {
    console.error("Error in email preview:", error);
    return buildErrorCard("Email Error", error.message);
  }
}

/**
 * Settings entry point
 * @param {Object} event - Event object
 * @returns {CardService.Card} Settings card
 */
function showG2NSettings(event) {
  console.log("✅ showG2NSettings called");
  return buildSettingsCard();
}

/**
 * Process selected email from Gmail UI
 * @returns {CardService.ActionResponse} Action response
 */
function processSelectedEmail() {
  console.log("=== PROCESSING SELECTED EMAIL ===");
  
  try {
    var config = getConfig();
    if (!config.apiKey || !config.databaseId) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification()
            .setText("⚠️ Configuration incomplete. Please set up API key and database.")
        )
        .setNavigation(
          CardService.newNavigation()
            .updateCard(buildConfigErrorCard())
        )
        .build();
    }
    
    // Get the active/selected email
    var selectedMessages = GmailApp.getSelectedMessages();
    if (selectedMessages.length === 0) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification()
            .setText("⚠️ No email selected. Please select an email first.")
        )
        .build();
    }
    
    var result = processEmailToNotion(selectedMessages[0].getId());
    if (result.success) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification()
            .setText("✅ Email saved to Notion!")
        )
        .setNavigation(
          CardService.newNavigation()
            .updateCard(buildSuccessCard(result))
        )
        .build();
    }
    
    throw new Error(result.error || "Failed to process email");
    
  } catch (error) {
    console.error("Error processing selected email:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("❌ Error: " + error.message)
      )
      .build();
  }
}

/**
 * Process current email from sidebar context
 * @returns {CardService.ActionResponse} Action response
 */
function processCurrentEmail() {
  console.log("=== PROCESSING CURRENT EMAIL (FROM SIDEBAR) ===");
  
  try {
    // This function is called from the Gmail sidebar
    var config = getConfig();
    
    if (!config.apiKey || !config.databaseId) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification()
            .setText("⚠️ Please configure API key and database first")
        )
        .setNavigation(
          CardService.newNavigation()
            .popCard()
            .pushCard(buildConfigErrorCard())
        )
        .build();
    }
    
    // Get the current email from Gmail context
    var currentEmail = getCurrentGmailMessage(ScriptApp.getOAuthToken());
    
    if (currentEmail && currentEmail.messageId) {
      processEmailToNotion(currentEmail.messageId);
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification()
            .setText("✅ Saved to Notion!")
        )
        .setNavigation(
          CardService.newNavigation()
            .popCard()
            .updateCard(buildHomepageCard())
        )
        .build();
    } else {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification()
            .setText("⚠️ Could not get current email. Please open an email first.")
        )
        .build();
    }
    
  } catch (error) {
    console.error("Error processing current email:", error);
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText("❌ Failed: " + error.message)
      )
      .build();
  }
}

/**
 * Alias for showG2NSettings for backward compatibility
 * @param {Object} event - Event object
 * @returns {CardService.Card} Settings card
 */
function showSettingsConfiguration(event) {
  return showG2NSettings(event);
}