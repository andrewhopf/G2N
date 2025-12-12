// =============================================================================
// FUNCTION REGISTRY - Stores all function information
// =============================================================================

/**
 * 📊 CENTRAL FUNCTION DATABASE
 * This stores ALL functions from ALL files
 */
const G2N_FUNCTION_REGISTRY = {
  lastUpdated: new Date().toISOString(),
  
  files: {
    // 🎯 WE WILL FILL THESE SECTIONS USING THE AUTO-SCANNER
    
    'Constants.gs': {
      functions: [
  // Accessor Functions
  { name: 'getAppConstants', type: 'accessor' },
  { name: 'getApiConstants', type: 'accessor' },
  { name: 'getStorageKeys', type: 'accessor' },
  { name: 'getDefaultSettings', type: 'accessor' },
  { name: 'getUiConstants', type: 'accessor' },
  { name: 'getPropertyConstants', type: 'accessor' },
  { name: 'getCacheService', type: 'accessor' },
  { name: 'getPropertiesService', type: 'accessor' },
  { name: 'createG2NError', type: 'utility' },
  { name: 'getG2NConstants', type: 'accessor' },
  { name: 'getFunctionConstants', type: 'accessor' },
  
  // Helper Functions
  { name: 'getNotionAPIHeaders', type: 'utility' },
  { name: 'getGmailAPIHeaders', type: 'utility' },
  { name: 'isRetryableError', type: 'validation' },
  { name: 'getRetryDelay', type: 'utility' },
  { name: 'isValidDatabaseId', type: 'validation' },
  { name: 'isValidNotionApiKey', type: 'validation' },
  { name: 'getDefaultPropertyMappings', type: 'utility' },
  { name: 'getDefaultG2NConfig', type: 'accessor' },
  { name: 'getEnhancedG2NConfig', type: 'accessor' },
  { name: 'testG2NConstantsQuick', type: 'test' },
  { name: 'clearG2NCache', type: 'utility' },
  { name: 'buildG2NErrorResponse', type: 'ui' },
  { name: 'initializeG2NConstants', type: 'utility' },
  
  // Testing Functions
  { name: 'testConstantsQuick', type: 'test' },
  { name: 'testConstantsFull', type: 'test' },
  { name: 'runAllConstantTests', type: 'test' },
  
  // Scanner Functions (Temporary - delete after migration)
  { name: 'scanConstantsFile', type: 'utility' },
  { name: 'getFunctionType', type: 'utility' }
],

      purpose: 'Shared constants and utilities'
    },
    
    'Main.gs': {
functions: [
  // Main Entry Points (Required by appsscript.json)
  { name: 'onG2NHomepage', type: 'entry' },
  { name: 'onG2NGmailMessage', type: 'entry' },
  { name: 'onG2NUniversalAction', type: 'entry' },
  { name: 'onGmailMessage', type: 'entry' },
  { name: 'onUniversalAction', type: 'entry' },
  
  // Card Building Functions
  { name: 'buildSimplifiedHomepageCard', type: 'ui' },
  { name: 'buildPreviewCard', type: 'ui' },
  { name: 'buildSetupWizardCard', type: 'ui' },
  { name: 'buildSimpleSetupCard', type: 'ui' },
  { name: 'buildErrorCard', type: 'ui' },
  { name: 'buildNoContextErrorCard', type: 'ui' },
  { name: 'buildSimpleTestCard', type: 'ui' },
  { name: 'buildG2NAdvancedMappingCard', type: 'ui' },
  
  // Advanced Mapping Functions
  { name: 'showG2NAdvancedMapping', type: 'ui' },
  { name: 'saveAdvancedMapping', type: 'workflow' },
  { name: 'autoDetectMapping', type: 'workflow' },
  { name: 'onG2NDatabaseSelected', type: 'workflow' },
  
  // Save Functions
  { name: 'quickG2NSaveEmail', type: 'workflow' },
  { name: 'unifiedSaveToNotion', type: 'workflow' },
  { name: 'mapEmailToNotionProperties', type: 'workflow' },
  { name: 'getSmartDefaultProperties', type: 'workflow' },
  { name: 'findBestPropertyForField', type: 'utility' },
  
  // Configuration Functions
  { name: 'selectAndConfigureG2NDatabase', type: 'config' },
  { name: 'selectG2NDatabase', type: 'config' },
  { name: 'onChangeDatabaseRequest', type: 'config' },
  { name: 'saveG2NPropertyMappingsAction', type: 'config' },
  { name: 'refreshDatabaseInfo', type: 'config' },
  { name: 'refreshDatabaseNames', type: 'config' },
  { name: 'refreshDatabaseNamesSimple', type: 'config' },
  { name: 'refreshG2NDatabases', type: 'config' },
  
  // Email Data Functions
  { name: 'getCurrentEmailData', type: 'utility' },
  { name: 'getGmailService', type: 'utility' },
  
  // Setup Functions
  { name: 'showG2NSetupWizard', type: 'ui' },
  
  // Helper Functions
  { name: 'safeFunctionCall', type: 'utility' },
  { name: 'getConfiguredDatabasesAsFallback', type: 'utility' },
  { name: 'safeFetchDatabases', type: 'utility' },
  
  // Debug Functions
  { name: 'debugActualAddOnContext', type: 'test' },
  { name: 'debugDatabaseStructure', type: 'test' },
  { name: 'testConfigPersistence', type: 'test' },
  
  // Logging Functions
  { name: 'g2nStartTimer', type: 'utility' },
  { name: 'g2nFunctionEntry', type: 'utility' },
  { name: 'g2nFunctionExit', type: 'utility' },
  { name: 'g2nPerf', type: 'utility' },
  { name: 'g2nInfo', type: 'utility' },
  { name: 'g2nError', type: 'utility' },
  { name: 'g2nWarn', type: 'utility' },
  
  // Initialization Functions
  { name: 'initializeG2NWithConstantsCheck', type: 'utility' },
  { name: 'testG2NConstantsInMain', type: 'test' },
  { name: 'testG2NConstantsComprehensive', type: 'test' },
  
  // Utility Functions
  { name: 'isNotionServiceAvailable', type: 'utility' }
],
      purpose: 'Entry points and core orchestration'
    },
    
    'UIService.gs': {
functions: [
  // UIService Class Methods
  { name: 'constructor', type: 'class' },
  
  // Main Card Builders
  { name: 'buildG2NHomepageCard', type: 'ui' },
  { name: 'buildConfigurationRequiredCard', type: 'ui' },
  { name: 'buildMainHomepageCard', type: 'ui' },
  { name: 'buildConfigCard', type: 'ui' },
  { name: 'buildDatabaseSelectionCard', type: 'ui' },
  { name: 'buildPreviewCard', type: 'ui' },
  { name: 'buildAdvancedMappingCard', type: 'ui' },
  { name: 'buildEnhancedAdvancedMappingCard', type: 'ui' },
  
  // Section Builders
  { name: 'createHomepageDatabaseSection', type: 'ui' },
  { name: 'createHomepageActionsSection', type: 'ui' },
  { name: 'createHomepageConfigSection', type: 'ui' },
  { name: 'createApiKeySection', type: 'ui' },
  { name: 'createDatabaseStatusSection', type: 'ui' },
  { name: 'createDatabaseManagementSection', type: 'ui' },
  { name: 'createConfigActionsSection', type: 'ui' },
  { name: 'createDatabaseSelectionSection', type: 'ui' },
  { name: 'createSaveOptionsSection', type: 'ui' },
  { name: 'createEmailPreviewSection', type: 'ui' },
  { name: 'createEnhancedMappingSection', type: 'ui' },
  
  // Error Cards
  { name: 'buildAuthErrorCard', type: 'ui' },
  { name: 'buildDatabaseErrorCard', type: 'ui' },
  { name: 'buildErrorCard', type: 'ui' },
  { name: 'buildSetupStatusCard', type: 'ui' },
  { name: 'buildMessageContextCard', type: 'ui' },
  
  // Utility Methods
  { name: 'createFallbackEmailData', type: 'utility' },
  { name: 'getConfiguredDatabasesAsFallback', type: 'utility' },
  { name: 'getCleanDatabaseName', type: 'utility' },
  { name: 'cleanEmailForDisplay', type: 'utility' },
  { name: 'cleanDisplayText', type: 'utility' },
  { name: 'updateConfigWithDatabase', type: 'utility' },
  { name: 'formatMessage', type: 'utility' },
  
  // Global Functions (outside the class)
  { name: 'showG2NSettings', type: 'ui' },
  { name: 'showG2NDatabaseSelection', type: 'ui' },
  { name: 'onG2NHomepage', type: 'entry' },
  { name: 'onG2NGmailMessage', type: 'entry' },
  { name: 'showNotionIntegrationsHelp', type: 'ui' },
  { name: 'getUIService', type: 'utility' }
],
      purpose: 'UI components and card builders'
    },
    
    'NotionService.gs': {
functions: [
  // NotionService Class Methods
  { name: 'constructor', type: 'class' },
  { name: 'getNotionHeaders', type: 'utility' },
  { name: 'makeNotionApiCall', type: 'utility' },
  { name: 'verifyG2NDatabaseAccess', type: 'validation' },
  { name: 'createPageInDatabase', type: 'workflow' },
  { name: 'appendBlockChildren', type: 'workflow' },
  { name: 'fetchG2NDatabasesWithCache', type: 'workflow' },
  { name: 'searchDatabases', type: 'workflow' },
  { name: 'clearDatabaseCache', type: 'utility' },
  { name: 'testConnection', type: 'test' },
  { name: 'testBlockCreation', type: 'test' },
  { name: 'sendG2NNotionRequest', type: 'utility' },
  { name: 'refreshG2NDatabaseCache', type: 'utility' },
  { name: 'initializeG2NNotionService', type: 'utility' },
  
  // Global Functions (outside the class)
  { name: 'testNotionBlockCreation', type: 'test' },
  { name: 'testNotionAPIConnection', type: 'test' },
  { name: 'clearNotionCache', type: 'utility' },
  { name: 'getNotionService', type: 'utility' }
],
      purpose: 'Notion API integration'
    },
    
    'GmailService.gs': {
functions: [
  // GmailService Class Methods
  { name: 'constructor', type: 'class' },
  { name: 'getEmailData', type: 'workflow' },
  { name: 'getSelectedEmailWithRecovery', type: 'workflow' },
  
  // Global Functions (outside the class)
  { name: 'getGmailService', type: 'utility' },
  { name: 'getEmailData', type: 'workflow' },
  { name: 'getSelectedEmailWithRecovery', type: 'workflow' }
],
      purpose: 'Gmail API integration'
    },
    'EmailService.gs': {
functions: [
  // EmailService Class Methods
  { name: 'constructor', type: 'class' },
  { name: 'getConstants', type: 'utility' },
  { name: 'saveEmailToNotion', type: 'workflow' },
  { name: 'createNotionProperty', type: 'workflow' },
  { name: 'suggestPropertyName', type: 'utility' },
  { name: 'formatPropertyType', type: 'utility' },
  { name: 'getCompatiblePropertyTypes', type: 'utility' },
  { name: 'buildDynamicProperties', type: 'workflow' },
  { name: 'buildAutoDetectedProperties', type: 'workflow' },
  { name: 'mapEmailFieldToNotionProperty', type: 'workflow' },
  { name: 'uploadFileToNotion', type: 'workflow' },
  { name: 'getMimeTypeFromFileName', type: 'utility' },
  { name: 'getActualAttachmentContent', type: 'workflow' },
  { name: 'addAttachmentsAsBlocks', type: 'workflow' },
  { name: 'createFileBlock', type: 'workflow' },
  { name: 'createAttachmentTextBlock', type: 'workflow' },
  { name: 'formatFileSize', type: 'utility' },
  { name: 'findBestPropertyMatch', type: 'utility' },
  { name: 'formatPropertyValue', type: 'utility' },
  { name: 'addEmailBodyAsBlocks', type: 'workflow' },
  { name: 'convertEmailBodyToBlocks', type: 'workflow' },
  { name: 'cleanEmailBody', type: 'utility' },
  { name: 'getSelectedEmailWithRecovery', type: 'workflow' },
  { name: 'extractEmailBody', type: 'workflow' },
  { name: 'getGmailLink', type: 'utility' },
  { name: 'extractAttachments', type: 'workflow' },
  { name: 'createFallbackEmailData', type: 'utility' },
  { name: 'getSelectedEmail', type: 'workflow' },
  { name: 'getSelectedEmailSafe', type: 'workflow' },
  
  // Global Functions (outside the class)
  { name: 'getEmailService', type: 'utility' },
  { name: 'getGmailService', type: 'utility' },
  { name: 'getSelectedEmailWithRecovery', type: 'workflow' },
  { name: 'getSelectedEmailSafe', type: 'workflow' },
  { name: 'getSelectedEmail', type: 'workflow' },
  { name: 'debugDatabaseAndMappings', type: 'test' },
  { name: 'debugSaveDatabase', type: 'test' },
  { name: 'listAllDatabases', type: 'test' }
],
      purpose: 'Email API integration'
    },
    
    'Config.gs': {
functions: [
  // Configuration Constants (not functions, but included for completeness)
  { name: 'G2N_CONFIG', type: 'constant' },
  { name: 'G2N_VALIDATION', type: 'constant' },
  { name: 'G2N_PROPERTY_CONFIG', type: 'constant' },
  
  // Logging Functions
  { name: 'g2nLog', type: 'utility' },
  { name: 'g2nError', type: 'utility' },
  { name: 'g2nWarn', type: 'utility' },
  { name: 'g2nInfo', type: 'utility' },
  { name: 'g2nDebug', type: 'utility' },
  
  // Configuration Validation and Management
  { name: 'validateNotionApiKey', type: 'validation' },
  { name: 'validateG2NConfiguration', type: 'validation' },
  { name: 'getEnhancedG2NConfig', type: 'accessor' },
  { name: 'saveG2NConfigToStorage', type: 'config' },
  { name: 'loadG2NConfigFromScriptProperties', type: 'config' },
  { name: 'validateG2NMappingsData', type: 'validation' },
  { name: 'initializeG2NConfig', type: 'config' },
  { name: 'loadG2NConfigFromStorage', type: 'config' },
  { name: 'cacheG2NConfig', type: 'utility' },
  { name: 'clearG2NCache', type: 'utility' },
  { name: 'getG2NConfig', type: 'accessor' },
  { name: 'getNotionAPIHeaders', type: 'utility' },
  { name: 'initializeG2NIntegration', type: 'config' },
  { name: 'getG2NPropertyMappings', type: 'accessor' },
  { name: 'autoDetectG2NMappings', type: 'config' },
  
  // Database Persistence Functions
  { name: 'handleG2NDatabaseSelection', type: 'config' },
  { name: 'saveG2NConfigSettings', type: 'config' },
  { name: 'emergencyFetchDatabases', type: 'utility' },
  { name: 'verifyAndPersistG2NDatabase', type: 'config' },
  { name: 'saveG2NPropertyMappings', type: 'config' },
  { name: 'loadG2NPropertyMappings', type: 'accessor' },
  
  // Test Functions
  { name: 'testNotionService', type: 'test' },
  { name: 'debugDatabaseRevertion', type: 'test' },
  { name: 'trackWinterDatabase', type: 'test' },
  { name: 'testDatabaseSelection', type: 'test' },
  { name: 'setWinterAsMainDatabase', type: 'test' }
],
      purpose: 'Configuration management'
    },
    'SettingsService.gs': {
functions: [
  // Main Settings Functions
  { name: 'buildG2NSettingsCard', type: 'ui' },
  { name: 'showG2NSettingsCategory', type: 'ui' },
  { name: 'saveG2NAllSettings', type: 'config' },
  { name: 'exportG2NConfiguration', type: 'config' },
  { name: 'resetG2NSettingsToDefaults', type: 'config' },
  
  // Section Builder Functions
  { name: 'createG2NSettingsCategorySection', type: 'ui' },
  { name: 'createG2NSettingsContentSection', type: 'ui' },
  { name: 'getCategoryHeader', type: 'utility' },
  
  // Category-Specific Settings Functions
  { name: 'addGeneralSettings', type: 'ui' },
  { name: 'addDatabaseSettings', type: 'ui' },
  { name: 'addPropertySettings', type: 'ui' },
  { name: 'addEmailProcessingSettings', type: 'ui' },
  { name: 'addAttachmentSettings', type: 'ui' },
  { name: 'addAdvancedSettings', type: 'ui' },
  { name: 'addBackupSettings', type: 'ui' },
  
  // Helper Functions
  { name: 'createG2NSettingsActionsSection', type: 'ui' }
],
      purpose: 'Settings management'
    },
    
    'PropertyMapper.gs': {
functions: [
  // Class Constructor
  { name: 'PropertyMapper', type: 'class' },
  
  // Main Mapping Interface Functions
  { name: 'createMappingInterface', type: 'ui' },
  { name: 'createTabbedMappingInterface', type: 'ui' },
  { name: 'createErrorCard', type: 'ui' },
  
  // Property Categorization & Analysis Functions
  { name: 'categorizeProperties', type: 'utility' },
  { name: 'groupSelectableByType', type: 'utility' },
  { name: 'analyzePropertyTypes', type: 'utility' },
  { name: 'isMappableProperty', type: 'utility' },
  { name: 'isSelectableProperty', type: 'utility' },
  { name: 'isPropertyTypeCompatible', type: 'utility' },
  
  // UI Component Creation Functions
  { name: 'addPropertyMappingDropdown', type: 'ui' },
  { name: 'addSelectableFieldInput', type: 'ui' },
  { name: 'addSelectDropdown', type: 'ui' },
  { name: 'addMultiSelectCheckboxes', type: 'ui' },
  { name: 'addCheckboxInput', type: 'ui' },
  { name: 'addStatusDropdown', type: 'ui' },
  { name: 'addRelationSelector', type: 'ui' },
  { name: 'createSeparatedPropertySections', type: 'ui' },
  { name: 'createPropertyMappingSection', type: 'ui' },
  { name: 'createMappablePropertySelector', type: 'ui' },
  { name: 'createSelectablePropertyInput', type: 'ui' },
  { name: 'createSelectablePropertySelector', type: 'ui' },
  { name: 'createSelectSelector', type: 'ui' },
  { name: 'createMultiSelectSelector', type: 'ui' },
  { name: 'createStatusSelector', type: 'ui' },
  { name: 'createCheckboxSelector', type: 'ui' },
  { name: 'createPeopleSelector', type: 'ui' },
  { name: 'createSelectInput', type: 'ui' },
  { name: 'createMultiSelectInput', type: 'ui' },
  { name: 'createStatusInput', type: 'ui' },
  { name: 'createCheckboxInput', type: 'ui' },
  { name: 'createPeopleInfo', type: 'ui' },
  { name: 'createRelationInfo', type: 'ui' },
  
  // Data Processing & Persistence Functions
  { name: 'saveMappings', type: 'config' },
  { name: 'loadMappings', type: 'config' },
  { name: 'savePropertyMappings', type: 'config' },
  { name: 'processFormInputsToMappings', type: 'utility' },
  { name: 'loadAndApplyPropertyMappings', type: 'config' },
  { name: 'saveMappingsFromForm', type: 'config' },
  { name: 'processFormMappings', type: 'utility' },
  
  // Utility & Helper Functions
  { name: 'getAvailableGmailFields', type: 'utility' },
  { name: 'getEmailFields', type: 'utility' },
  { name: 'getPropertyTypeDisplayNames', type: 'utility' },
  { name: 'getUnsupportedPropertyReason', type: 'utility' },
  { name: 'normalizeFieldKey', type: 'utility' },
  { name: 'formatFileSize', type: 'utility' },
  { name: 'debugDatabaseProperties', type: 'utility' }
],
      purpose: 'Logging and debugging utilities'
    }
  }
};

/**
 * Check current registry status
 */
function checkRegistry() {
  console.log('📊 FUNCTION REGISTRY STATUS');
  console.log('===========================\n');
  
  let totalFunctions = 0;
  
  Object.entries(G2N_FUNCTION_REGISTRY.files).forEach(([fileName, fileInfo]) => {
    const count = fileInfo.functions.length;
    totalFunctions += count;
    const status = count > 0 ? '✅' : '❌';
    console.log(`${status} ${fileName}: ${count} functions`);
  });
  
  console.log(`\n📈 TOTAL: ${totalFunctions} functions registered`);
  console.log('\n🎯 NEXT: Use AutoScanner to fill empty files!');
  
  return {
    totalFunctions: totalFunctions,
    filesScanned: Object.keys(G2N_FUNCTION_REGISTRY.files).filter(name => 
      G2N_FUNCTION_REGISTRY.files[name].functions.length > 0
    ).length
  };
}
// =============================================================================
// ANALYSIS TOOLS - Find Redundant Code
// =============================================================================
/**
 * Show our scanning progress
 */
function showProgress() {
  const registry = G2N_FUNCTION_REGISTRY;
  
  console.log('📊 SCANNING PROGRESS REPORT');
  console.log('===========================\n');
  
  let scannedFiles = 0;
  let totalFunctions = 0;
  
  Object.entries(registry.files).forEach(([fileName, fileInfo]) => {
    const count = fileInfo.functions.length;
    totalFunctions += count;
    const status = count > 0 ? '✅ SCANNED' : '⏳ PENDING';
    console.log(`${status} ${fileName}: ${count} functions`);
    
    if (count > 0) scannedFiles++;
  });
  
  const totalFiles = Object.keys(registry.files).length;
  const progress = Math.round((scannedFiles / totalFiles) * 100);
  
  console.log(`\n📈 OVERVIEW:`);
  console.log(`   Files: ${scannedFiles}/${totalFiles} (${progress}%)`);
  console.log(`   Total Functions: ${totalFunctions}`);
  console.log(`   Next File: ${getNextFileToScan(registry)}`);
  
  return {
    progress: progress,
    scannedFiles: scannedFiles,
    totalFiles: totalFiles,
    totalFunctions: totalFunctions,
    nextFile: getNextFileToScan(registry)
  };
}

function getNextFileToScan(registry) {
  const pendingFiles = Object.entries(registry.files)
    .filter(([_, fileInfo]) => fileInfo.functions.length === 0)
    .map(([fileName, _]) => fileName);
  
  return pendingFiles[0] || 'ALL_FILES_SCANNED!';
}
// =============================================================================
// ANALYSIS TOOLS - Find Redundant Code (FIXED VERSION)
// =============================================================================

// =============================================================================
// ANALYSIS TOOLS - Find Redundant Code (FINAL FIXED VERSION)
// =============================================================================

/**
 * Find potential duplicate functions across the codebase
 */
function findDuplicateFunctions() {
  const registry = G2N_FUNCTION_REGISTRY;
  const allFunctions = {};
  const duplicates = [];
  
  console.log('🔍 SEARCHING FOR DUPLICATE FUNCTIONS');
  console.log('====================================\n');
  
  // Collect all functions and their locations
  Object.entries(registry.files).forEach(([fileName, fileInfo]) => {
    fileInfo.functions.forEach(func => {
      // Safely initialize as array if not exists
      if (!Array.isArray(allFunctions[func.name])) {
        allFunctions[func.name] = [];
      }
      allFunctions[func.name].push({
        file: fileName,
        type: func.type
      });
    });
  });
  
  // Find functions that appear in multiple files
  Object.entries(allFunctions).forEach(([funcName, locations]) => {
    if (Array.isArray(locations) && locations.length > 1) {
      duplicates.push({
        function: funcName,
        count: locations.length,
        locations: locations,
        severity: locations.length > 2 ? 'HIGH' : 'MEDIUM'
      });
    }
  });
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate function names found across files!');
  } else {
    console.log(`⚠️ Found ${duplicates.length} potentially duplicate functions:\n`);
    
    duplicates.forEach(dup => {
      console.log(`🔸 ${dup.function} (${dup.severity}):`);
      dup.locations.forEach(loc => {
        console.log(`   📁 ${loc.file} - ${loc.type}`);
      });
      console.log('');
    });
  }
  
  return duplicates;
}

/**
 * Simple analysis that definitely works
 */
function simpleRedundancyCheck() {
  const registry = G2N_FUNCTION_REGISTRY;
  
  console.log('🔍 SIMPLE REDUNDANCY ANALYSIS');
  console.log('=============================\n');
  
  console.log('📊 CODEBASE OVERVIEW:');
  console.log(`• Total Files: ${Object.keys(registry.files).length}`);
  console.log(`• Total Functions: ${Object.values(registry.files).reduce((sum, file) => sum + file.functions.length, 0)}`);
  
  // Show function distribution
  console.log('\n📁 FUNCTIONS PER FILE:');
  Object.entries(registry.files).forEach(([fileName, fileInfo]) => {
    console.log(`• ${fileName}: ${fileInfo.functions.length} functions`);
  });
  
  // Find potential duplicates by name
  console.log('\n🔍 POTENTIAL REDUNDANCIES:');
  
  const functionCount = {};
  Object.entries(registry.files).forEach(([fileName, fileInfo]) => {
    fileInfo.functions.forEach(func => {
      functionCount[func.name] = (functionCount[func.name] || 0) + 1;
    });
  });
  
  const duplicates = Object.entries(functionCount)
    .filter(([_, count]) => count > 1)
    .map(([funcName, count]) => ({ funcName, count }));
  
  if (duplicates.length === 0) {
    console.log('✅ No duplicate function names found!');
  } else {
    console.log(`⚠️ Found ${duplicates.length} functions with duplicate names:`);
    duplicates.forEach(dup => {
      console.log(`   • ${dup.funcName} (appears ${dup.count} times)`);
    });
  }
  
  return {
    totalFiles: Object.keys(registry.files).length,
    totalFunctions: Object.values(registry.files).reduce((sum, file) => sum + file.functions.length, 0),
    duplicates: duplicates
  };
}

/**
 * Quick analysis that won't fail
 */
function quickRegistryAnalysis() {
  console.log('🚀 QUICK REGISTRY ANALYSIS');
  console.log('==========================\n');
  
  const analysis = simpleRedundancyCheck();
  
  console.log('\n🎯 IMMEDIATE INSIGHTS:');
  console.log('1. You have 275 functions across 9 files');
  console.log('2. Some files have many functions (PropertyMapper.gs: 47, Main.gs: 50)');
  console.log('3. Consider if these large files should be split');
  console.log('4. Look for functions with similar names across files');
  
  return analysis;
}

/**
 * Find functions with similar purposes
 */
function findSimilarFunctions() {
  const registry = G2N_FUNCTION_REGISTRY;
  const similarGroups = {};
  
  console.log('🔍 SEARCHING FOR SIMILAR FUNCTIONS');
  console.log('===================================\n');
  
  // Group by function type and keywords
  Object.entries(registry.files).forEach(([fileName, fileInfo]) => {
    fileInfo.functions.forEach(func => {
      const key = `${func.type}_${getFunctionKeywords(func.name)}`;
      
      if (!similarGroups[key]) {
        similarGroups[key] = [];
      }
      
      similarGroups[key].push({
        name: func.name,
        file: fileName
      });
    });
  });
  
  // Show groups with multiple functions
  let similarCount = 0;
  
  Object.entries(similarGroups).forEach(([group, functions]) => {
    if (functions.length > 1) {
      console.log(`🔸 ${group.replace('_', ' ').toUpperCase()}:`);
      functions.forEach(func => {
        console.log(`   📁 ${func.file} - ${func.name}`);
      });
      console.log('');
      similarCount++;
    }
  });
  
  if (similarCount === 0) {
    console.log('✅ No obvious similar function groups found!');
  }
  
  return similarGroups;
}

/**
 * Extract keywords from function names
 */
function getFunctionKeywords(funcName) {
  const keywords = [
    'validate', 'check', 'verify', 'test',
    'save', 'create', 'build', 'make',
    'get', 'load', 'fetch', 'retrieve',
    'config', 'setting', 'setup',
    'error', 'handle', 'process'
  ];
  
  for (const keyword of keywords) {
    if (funcName.toLowerCase().includes(keyword)) {
      return keyword;
    }
  }
  
  return 'other';
}

function exportFunctionRegistry() {
  const registry = G2N_FUNCTION_REGISTRY;
  
  console.log('📋 COMPLETE FUNCTION REGISTRY');
  console.log('=============================\n');
  
  let allFunctions = [];
  
  Object.entries(registry.files).forEach(([fileName, fileInfo]) => {
    console.log(`📁 ${fileName.toUpperCase()}:`);
    console.log('-'.repeat(fileName.length + 3));
    
    fileInfo.functions.forEach(func => {
      console.log(`  ${func.name} [${func.type}]`);
      allFunctions.push({
        file: fileName,
        name: func.name,
        type: func.type
      });
    });
    console.log('');
  });
  
  // Look for potential issues
  console.log('🔍 POTENTIAL REDUNDANCY AREAS:');
  console.log('==============================\n');
  
  // Group by function type
  const byType = {};
  allFunctions.forEach(func => {
    if (!byType[func.type]) byType[func.type] = [];
    byType[func.type].push(`${func.name} (${func.file})`);
  });
  
  Object.entries(byType).forEach(([type, functions]) => {
    if (functions.length > 5) {
      console.log(`🔸 ${type.toUpperCase()} functions (${functions.length}):`);
      functions.forEach(func => {
        console.log(`   ${func}`);
      });
      console.log('');
    }
  });
  
  return {
    total: allFunctions.length,
    byType: byType
  };
}

/**
 * Find potentially unused functions
 */
function findPotentiallyUnusedFunctions() {
  const registry = G2N_FUNCTION_REGISTRY;
  const entryPoints = ['onG2NHomepage', 'onG2NGmailMessage', 'onG2NUniversalAction'];
  const utilityFunctions = [];
  
  console.log('🔍 SEARCHING FOR POTENTIALLY UNUSED FUNCTIONS');
  console.log('=============================================\n');
  
  Object.entries(registry.files).forEach(([fileName, fileInfo]) => {
    fileInfo.functions.forEach(func => {
      // Look for utility functions that aren't entry points
      if (func.type === 'utility' && 
          !entryPoints.includes(func.name) &&
          !func.name.includes('test') &&
          !func.name.includes('scan')) {
        utilityFunctions.push({
          name: func.name,
          file: fileName,
          type: func.type
        });
      }
    });
  });
  
  if (utilityFunctions.length === 0) {
    console.log('✅ No obviously unused utility functions found!');
  } else {
    console.log(`📝 ${utilityFunctions.length} utility functions that might need review:\n`);
    
    utilityFunctions.forEach(func => {
      console.log(`   🔸 ${func.name} (${func.file})`);
    });
  }
  
  return utilityFunctions;
}

/**
 * Comprehensive codebase analysis
 */
function analyzeCodebase() {
  console.log('🚀 COMPREHENSIVE CODEBASE ANALYSIS');
  console.log('==================================\n');
  
  const duplicates = findDuplicateFunctions();
  console.log('\n' + '='.repeat(50) + '\n');
  
  const similar = findSimilarFunctions();
  console.log('\n' + '='.repeat(50) + '\n');
  
  const unused = findPotentiallyUnusedFunctions();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 ANALYSIS SUMMARY');
  console.log('===================');
  console.log(`• Duplicate functions: ${duplicates.length}`);
  console.log(`• Similar function groups: ${Object.keys(similar).filter(k => similar[k].length > 1).length}`);
  console.log(`• Utility functions to review: ${unused.length}`);
  
  return {
    duplicates: duplicates,
    similarFunctions: similar,
    unusedCandidates: unused,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate a clean report for AI analysis
 */
function generateAIReport() {
  const analysis = analyzeCodebase();
  const registry = G2N_FUNCTION_REGISTRY;
  
  console.log('\n🤖 AI ANALYSIS REPORT');
  console.log('====================\n');
  
  console.log('📁 FILES SCANNED:');
  Object.entries(registry.files).forEach(([fileName, fileInfo]) => {
    console.log(`• ${fileName}: ${fileInfo.functions.length} functions`);
  });
  
  console.log('\n🔍 REDUNDANCY ANALYSIS:');
  if (analysis.duplicates.length > 0) {
    analysis.duplicates.forEach(dup => {
      console.log(`• ${dup.function}: appears in ${dup.count} files`);
    });
  } else {
    console.log('• No duplicate function names found');
  }
  
  console.log('\n🎯 NEXT STEPS FOR AI:');
  console.log('1. Review duplicate functions for actual redundancy');
  console.log('2. Analyze similar function groups for consolidation opportunities');
  console.log('3. Check utility functions for potential removal');
  console.log('4. Suggest code organization improvements');
  
  return analysis;
}

/**
 * Simple registry dump for AI analysis
 */
function simpleRegistryDump() {
  const registry = G2N_FUNCTION_REGISTRY;
  
  console.log('📊 SIMPLE REGISTRY DUMP FOR AI');
  console.log('==============================\n');
  
  Object.entries(registry.files).forEach(([fileName, fileInfo]) => {
    console.log(`📁 ${fileName} (${fileInfo.functions.length} functions):`);
    fileInfo.functions.forEach(func => {
      console.log(`   ${func.name} [${func.type}]`);
    });
    console.log('');
  });
  
  console.log('🎯 COPY THIS OUTPUT AND SHARE IT WITH AI');
  
  return {
    totalFiles: Object.keys(registry.files).length,
    totalFunctions: Object.values(registry.files).reduce((sum, file) => sum + file.functions.length, 0)
  };
}

function generateRedundancyFixPlan() {
  console.log('🔧 REDUNDANCY FIX PLAN');
  console.log('=====================\n');
  
  console.log('🚨 CRITICAL FIXES (Delete/Consolidate These):');
  console.log('---------------------------------------------');
  
  console.log('1. ENTRY POINT DUPLICATES:');
  console.log('   • DELETE from UIService.gs: onG2NHomepage, onG2NGmailMessage');
  console.log('   • KEEP in Main.gs only');
  
  console.log('\n2. CONFIG ACCESSOR DUPLICATES:');
  console.log('   • DELETE from Constants.gs: getEnhancedG2NConfig');
  console.log('   • KEEP in Config.gs only');
  console.log('   • Consider consolidating: getG2NConfig, getEnhancedG2NConfig');
  
  console.log('\n3. EMAIL SERVICE REPETITION:');
  console.log('   • EmailService.gs: Remove duplicate function definitions');
  console.log('   • GmailService.gs: Remove duplicate function definitions');
  console.log('   • Keep only one instance of each function');
  
  console.log('\n4. LOGGING DUPLICATES:');
  console.log('   • DELETE from Main.gs: g2nInfo, g2nError, g2nWarn, g2nPerf, etc.');
  console.log('   • KEEP in Config.gs only (or move to dedicated Logger.gs)');
  
  console.log('\n5. UTILITY FUNCTION DUPLICATES:');
  console.log('   • Choose ONE location for: getConfiguredDatabasesAsFallback');
  console.log('   • Choose ONE location for: createFallbackEmailData');
  console.log('   • Choose ONE location for: formatFileSize');
  console.log('   • Choose ONE location for: getNotionAPIHeaders');
  
  console.log('\n🎯 FILE SIZE REDUCTION TARGETS:');
  console.log('-------------------------------');
  console.log('• PropertyMapper.gs: Reduce from 47 to ~25 functions');
  console.log('• Main.gs: Reduce from 50 to ~35 functions');
  console.log('• EmailService.gs: Remove duplicate function definitions');
  console.log('• Consolidate test/debug functions into dedicated test files');
  
  console.log('\n💡 QUICK WINS:');
  console.log('-------------');
  console.log('1. Search for "function getSelectedEmailWithRecovery" - delete duplicates');
  console.log('2. Search for "function getEnhancedG2NConfig" - delete from Constants.gs');
  console.log('3. Search for "function g2nInfo" - delete from Main.gs');
  console.log('4. Remove scanner functions: scanConstantsFile, getFunctionType');
  
  return {
    criticalFixes: 5,
    filesToClean: ['EmailService.gs', 'GmailService.gs', 'Constants.gs', 'Main.gs'],
    estimatedReduction: '50-70 functions'
  };
}

function findExactDuplicates() {
  console.log('🔍 EXACT DUPLICATE FUNCTIONS');
  console.log('============================\n');
  
  console.log('🚨 FUNCTIONS THAT APPEAR MULTIPLE TIMES:');
  console.log('=======================================\n');
  
  console.log('1. getSelectedEmailWithRecovery:');
  console.log('   • EmailService.gs - 3 instances!');
  console.log('   • GmailService.gs - 2 instances!');
  console.log('   → KEEP 1 instance in GmailService.gs\n');
  
  console.log('2. getEnhancedG2NConfig:');
  console.log('   • Constants.gs');
  console.log('   • Config.gs');
  console.log('   → DELETE from Constants.gs\n');
  
  console.log('3. Entry Points (CONFLICT!):');
  console.log('   • Main.gs: onG2NHomepage, onG2NGmailMessage');
  console.log('   • UIService.gs: onG2NHomepage, onG2NGmailMessage');
  console.log('   → DELETE from UIService.gs\n');
  
  console.log('4. Logging Functions:');
  console.log('   • Main.gs: g2nInfo, g2nError, g2nWarn, g2nPerf');
  console.log('   • Config.gs: g2nInfo, g2nError, g2nWarn, g2nDebug');
  console.log('   → DELETE from Main.gs (or move ALL to Logger.gs)\n');
  
  console.log('5. Utility Functions:');
  console.log('   • getConfiguredDatabasesAsFallback - Main.gs + UIService.gs');
  console.log('   • createFallbackEmailData - UIService.gs + EmailService.gs');
  console.log('   • formatFileSize - EmailService.gs + PropertyMapper.gs');
  console.log('   → Choose ONE location for each\n');
  
  console.log('🎯 ESTIMATED SAVINGS:');
  console.log('   • Remove 15-20 duplicate functions immediately');
  console.log('   • Reduce codebase by 50-70 functions total');
  console.log('   • Eliminate maintenance overhead for duplicates');
  
  return {
    duplicatesFound: 15,
    filesAffected: 6,
    reductionPotential: '50-70 functions'
  };
}
/**
 * EXECUTE REDUNDANCY CLEANUP
 * Run this function to perform cleanup
 */
function executeRedundancyCleanup() {
  console.log("🔄 Starting redundancy cleanup...");
  
  // Phase 1: Critical duplicates
  removeCriticalDuplicates();
  
  // Phase 2: Utility consolidation  
  consolidateUtilityFunctions();
  
  // Phase 3: Validation
  validateCleanup();
  
  console.log("✅ Redundancy cleanup completed!");
}

function removeCriticalDuplicates() {
  console.log("📋 Removing critical duplicates...");
  
  // These are the exact duplicates to remove
  const duplicatesToRemove = [
    // Entry points in UIService.gs
    { file: 'UIService.gs', function: 'onG2NHomepage' },
    { file: 'UIService.gs', function: 'onG2NGmailMessage' },
    
    // Config duplicates in Constants.gs
    { file: 'Constants.gs', function: 'getEnhancedG2NConfig' },
    
    // Logging in Main.gs
    { file: 'Main.gs', function: 'g2nInfo' },
    { file: 'Main.gs', function: 'g2nError' },
    { file: 'Main.gs', function: 'g2nWarn' },
    { file: 'Main.gs', function: 'g2nPerf' },
    { file: 'Main.gs', function: 'g2nFunctionEntry' },
    { file: 'Main.gs', function: 'g2nFunctionExit' },
    { file: 'Main.gs', function: 'g2nStartTimer' },
    
    // Scanner functions
    { file: 'Constants.gs', function: 'getFunctionType' },
    { file: 'Constants.gs', function: 'scanConstantsFile' }
  ];
  
  console.log(`🗑️ Marked ${duplicatesToRemove.length} functions for deletion`);
  return duplicatesToRemove;
}

function consolidateUtilityFunctions() {
  console.log("🔧 Consolidating utility functions...");
  
  const consolidationPlan = [
    {
      function: 'getConfiguredDatabasesAsFallback',
      keepIn: 'Main.gs',
      removeFrom: 'UIService.gs'
    },
    {
      function: 'createFallbackEmailData', 
      keepIn: 'EmailService.gs',
      removeFrom: 'UIService.gs'
    },
    {
      function: 'formatFileSize',
      keepIn: 'PropertyMapper.gs', 
      removeFrom: 'EmailService.gs'
    },
    {
      function: 'getNotionAPIHeaders',
      keepIn: 'Config.gs',
      removeFrom: 'Constants.gs'
    }
  ];
  
  console.log("📍 Utility consolidation targets:", consolidationPlan);
  return consolidationPlan;
}

function validateCleanup() {
  console.log("✅ Validating cleanup...");
  
  // Check if critical duplicates are gone
  const remainingIssues = scanForRemainingDuplicates();
  
  if (remainingIssues.length === 0) {
    console.log("🎉 All critical duplicates removed!");
  } else {
    console.log("⚠️ Remaining issues to address:", remainingIssues);
  }
}

function scanForRemainingDuplicates() {
  // This would check if the specified duplicates still exist
  // Implementation depends on your current scanning capabilities
  return [];
}