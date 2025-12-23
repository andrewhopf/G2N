// ============================================/
// FILE: FileHandler.js
// DESCRIPTION: File attachment handling for Notion integration
// ============================================

/**
 * Process email attachments based on configuration
 * @param {Array} attachments - Array of GmailAttachment objects
 * @param {string} emailSubject - Email subject for naming
 * @returns {Array} Array of processed attachment objects
 */
function processEmailAttachments(attachments, emailSubject) {
  var userProps = PropertiesService.getUserProperties();
  var handlingOption = userProps.getProperty("G2N_FILE_HANDLING") || "upload_to_drive";
  var driveFolderId = userProps.getProperty("G2N_DRIVE_FOLDER");
  
  // Skip attachments if configured
  if (handlingOption === "skip_attachments" || !attachments || attachments.length === 0) {
    return [];
  }
  
  var processedAttachments = [];
  
  attachments.forEach((attachment, index) => {
    try {
      var result;
      
      if (handlingOption === "upload_to_notion" && attachment.size <= 5 * 1024 * 1024) {
        // Upload directly to Notion (under 5MB)
        var notionUrl = uploadToNotion(attachment, emailSubject);
        processedAttachments.push({
          name: attachment.name,
          url: notionUrl,
          type: "notion",
          size: attachment.size
        });
      } else {
        // Upload to Google Drive
        var driveResult = uploadToGoogleDrive(attachment, emailSubject, driveFolderId);
        processedAttachments.push({
          name: attachment.name,
          url: driveResult.webViewLink,
          type: "drive",
          size: attachment.size,
          driveId: driveResult.id
        });
      }
    } catch (error) {
      console.error(`Failed to process attachment ${attachment.name}:`, error);
    }
  });
  
  return processedAttachments;
}

/**
 * Upload attachment to Google Drive
 * @param {GmailAttachment} attachment - Gmail attachment
 * @param {string} emailSubject - Email subject for naming
 * @param {string} folderId - Optional Drive folder ID
 * @returns {Object} Drive file info object
 * @throws {Error} If upload fails
 */
function uploadToGoogleDrive(attachment, emailSubject, folderId = null) {
  try {
    var folder;
    
    // Get or create folder
    if (folderId) {
      folder = DriveApp.getFolderById(folderId);
    } else {
      folder = getOrCreateDefaultFolder();
    }
    
    // Create file in Drive
    var file = folder.createFile(attachment.getBlob());
    
    // Set metadata
    var safeSubject = emailSubject.replace(/[^\w\s-]/g, '_').substring(0, 50);
    file.setName(safeSubject + "_" + attachment.name);
    file.setDescription("Uploaded from Gmail email: " + emailSubject);
    
    // Set sharing permissions
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return {
      id: file.getId(),
      name: file.getName(),
      webViewLink: file.getUrl(),
      downloadLink: `https://drive.google.com/uc?id=${file.getId()}&export=download`
    };
  } catch (error) {
    console.error("Error uploading to Google Drive:", error);
    throw error;
  }
}

/**
 * Get or create default folder for attachments
 * @returns {Folder} Google Drive folder
 */
function getOrCreateDefaultFolder() {
  var folderName = "Gmail-to-Notion Attachments";
  var folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  }
  
  // Create new folder
  var newFolder = DriveApp.createFolder(folderName);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * Upload to Notion (for small files)
 * Note: Notion API doesn't support direct file upload in the same way.
 * This would need to use the Notion import API or base64 encoding.
 * For now, we'll upload to Drive and return the link.
 * @param {GmailAttachment} attachment - Gmail attachment
 * @param {string} emailSubject - Email subject for naming
 * @returns {string} URL to the uploaded file
 */
function uploadToNotion(attachment, emailSubject) {
  console.log("Direct Notion upload not implemented, using Drive instead");
  return uploadToGoogleDrive(attachment, emailSubject, null).webViewLink;
}

/**
 * Format files for Notion files property
 * @param {Array} attachments - Array of attachment objects
 * @returns {Array} Formatted files array for Notion API
 */
function formatFilesForNotion(attachments) {
  return attachments.map(attachment => ({
    name: attachment.name,
    type: "external",
    external: { url: attachment.url }
  }));
}