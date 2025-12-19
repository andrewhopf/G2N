// file-handler.js
// Handle file attachments for Notion integration

/**
 * Process email attachments based on configuration
 */
function processEmailAttachments(attachments, emailId) {
  const props = PropertiesService.getUserProperties();
  const mode = props.getProperty('G2N_FILE_HANDLING') || 'upload_to_drive';
  const folderId = props.getProperty('G2N_DRIVE_FOLDER');
  
  if (mode === 'skip_attachments' || !attachments || attachments.length === 0) {
    return [];
  }
  
  const processedFiles = [];
  
  attachments.forEach((attachment, index) => {
    try {
      if (mode === 'upload_to_notion' && attachment.size <= 5 * 1024 * 1024) {
        // Upload directly to Notion (under 5MB)
        processedFiles.push({
          name: attachment.name,
          url: uploadToNotion(attachment, emailId),
          type: 'notion',
          size: attachment.size
        });
      } else {
        // Upload to Google Drive
        const fileInfo = uploadToGoogleDrive(attachment, emailId, folderId);
        processedFiles.push({
          name: attachment.name,
          url: fileInfo.webViewLink,
          type: 'drive',
          size: attachment.size,
          driveId: fileInfo.id
        });
      }
    } catch (error) {
      console.error(`Failed to process attachment ${attachment.name}:`, error);
    }
  });
  
  return processedFiles;
}

/**
 * Upload attachment to Google Drive
 */
function uploadToGoogleDrive(attachment, emailId, folderId = null) {
  try {
    let folder;
    
    if (folderId) {
      folder = DriveApp.getFolderById(folderId);
    } else {
      // Use default folder
      folder = getOrCreateDefaultFolder();
    }
    
    // Create file in Drive
    const file = folder.createFile(attachment.getBlob());
    file.setName(`${emailId}_${attachment.name}`);
    file.setDescription(`Uploaded from Gmail email: ${emailId}`);
    
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
 */
function getOrCreateDefaultFolder() {
  const folderName = "Gmail-to-Notion Attachments";
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    return folders.next();
  }
  
  // Create new folder
  const folder = DriveApp.createFolder(folderName);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return folder;
}

/**
 * Upload to Notion (for small files)
 */
function uploadToNotion(attachment, emailId) {
  // Note: Notion API doesn't support direct file upload in the same way
  // This would need to use the Notion import API or base64 encoding
  // For now, we'll upload to Drive and return the link
  
  console.log("Direct Notion upload not implemented, using Drive instead");
  const fileInfo = uploadToGoogleDrive(attachment, emailId, null);
  return fileInfo.webViewLink;
}

/**
 * Format files for Notion files property
 */
function formatFilesForNotion(files) {
  return files.map(file => {
    return {
      name: file.name,
      type: "external",
      external: {
        url: file.url
      }
    };
  });
}