/**
 * @fileoverview Google Apps Script entry points
 * @description Global functions called by GAS triggers
 */

/**
 * Global application instance.
 * @type {Application}
 */
var app;

/**
 * Checks if the app is initialized, and if not, runs bootstrap.
 * This prevents "app is not defined" ReferenceErrors.
 * 
 * @returns {Application} The initialized Application instance.
 */
function getApp() {
    if (!app) {
        app = bootstrap();
    }
    return app;
}

/**
 * Helper: safely build error card
 * @private
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {CardService.Card} Error card
 */
function _buildErrorCardSafely(title, message) {
    if (typeof buildErrorCard === 'function') {
        return buildErrorCard(title, message);
    }
    
    return CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader().setTitle(`❌ ${title}`))
        .addSection(
            CardService.newCardSection()
                .addWidget(CardService.newTextParagraph().setText(message))
                .addWidget(
                    CardService.newButtonSet()
                        .addButton(
                            CardService.newTextButton()
                                .setText('🔄 Retry')
                                .setOnClickAction(
                                    CardService.newAction()
                                        .setFunctionName('onG2NHomepage')
                                )
                        )
                )
        )
        .build();
}

/**
 * Homepage trigger
 * @param {Object} event - GAS event
 * @returns {CardService.Card} Homepage card
 */
function onG2NHomepage(event) {
    try {
        return getApp().showHomepage(event);
    } catch (error) {
        console.error('Homepage error:', error);
        return _buildErrorCardSafely('Homepage Error', error.message || 'Unknown error');
    }
}

/**
 * Gmail message trigger
 * @param {Object} event - GAS event with gmail data
 * @returns {CardService.Card} Email preview card
 */
function onG2NGmailMessage(event) {
    try {
        return getApp().showEmailPreview(event);
    } catch (error) {
        console.error('Email preview error:', error);
        return _buildErrorCardSafely('Email Preview Error', error.message || 'Unknown error');
    }
}

/**
 * Show email preview
 * @param {Object} event - GAS event with gmail data
 * @returns {CardService.Card} Email preview card
 */
function showEmailPreview(event) {
    try {
        return getApp().showEmailPreview(event);
    } catch (error) {
        console.error('Email preview error:', error);
        return _buildErrorCardSafely('Error', error.message || 'Unknown error');
    }
}

/**
 * Show settings
 * @param {Object} event - GAS event
 * @returns {CardService.Card} Settings card
 */
function showG2NSettings(event) {
    try {
        return getApp().showSettings(event);
    } catch (error) {
        console.error('Settings error:', error);
        return _buildErrorCardSafely('Settings Error', error.message || 'Unknown error');
    }
}

/**
 * Quick save email action
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function quickG2NSaveEmail(event) {
    try {
        return getApp().quickG2NSaveEmail(event);
    } catch (error) {
        console.error('Save email error:', error);
        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText('❌ Error: ' + (error.message || 'Unknown error'))
            )
            .build();
    }
}

/**
 * Save configuration action
 * @param {Object} event - GAS event with form input
 * @returns {CardService.ActionResponse} Action response
 */
function saveConfiguration(event) {
    try {
        const apiKey = event?.formInput?.api_key;
        if (!apiKey) {
            return CardService.newActionResponseBuilder()
                .setNotification(
                    CardService.newNotification()
                        .setText('⚠️ Please enter an API key')
                )
                .build();
        }

        // Initialize app and get container
        const appInstance = getApp();
        const configRepo = appInstance.getContainer().resolve('configRepo');
        configRepo.set({ apiKey });

        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText('✅ API key saved!')
            )
            .setNavigation(
                CardService.newNavigation()
                    .updateCard(buildSettingsCard())
            )
            .build();
    } catch (error) {
        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText('❌ ' + (error.message || 'Unknown error'))
            )
            .build();
    }
}

/**
 * Show database selection
 * @returns {CardService.Card} Database selection card
 */
function showDatabaseSelection() {
    try {
        getApp();  // Initialize
        return buildDatabaseSelectionCard();
    } catch (error) {
        console.error('Database selection error:', error);
        return _buildErrorCardSafely('Database Selection Error', error.message || 'Unknown error');
    }
}

/**
 * Show mappings configuration
 * @param {Object} event - GAS event with page parameter
 * @returns {CardService.Card} Mappings configuration card
 */
function showMappingsConfiguration(event) {
    try {
        getApp();  // Initialize
        const page = event?.parameters?.targetPage 
            ? parseInt(event.parameters.targetPage, 10) 
            : 0;
        return buildMappingsCard(page);
    } catch (error) {
        console.error('Mappings configuration error:', error);
        return _buildErrorCardSafely('Mappings Configuration Error', error.message || 'Unknown error');
    }
}

/**
 * Save database selection action
 * @param {Object} event - GAS event with form input
 * @returns {CardService.ActionResponse} Action response
 */
function saveDatabaseSelection(event) {
    try {
        const appInstance = getApp();
        const selectedDatabase = event?.formInput?.selected_database;
        
        if (!selectedDatabase) {
            return CardService.newActionResponseBuilder()
                .setNotification(
                    CardService.newNotification()
                        .setText('⚠️ Please select a database')
                )
                .build();
        }

        const databaseService = appInstance.getContainer().resolve('databaseService');
        const database = databaseService.selectDatabase(selectedDatabase);

        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText(`✅ Selected: ${database.title}`)
            )
            .setNavigation(
                CardService.newNavigation()
                    .popCard()
                    .updateCard(buildSettingsCard())
            )
            .build();
    } catch (error) {
        console.error('Database selection error:', error);
        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText('❌ ' + (error.message || 'Unknown error'))
            )
            .build();
    }
}

/**
 * Reset mappings to defaults
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function resetMappingsOnly(event) {
    try {
        const appInstance = getApp();
        const container = appInstance.getContainer();
        
        const configRepo = container.resolve('configRepo');
        const mappingRepo = container.resolve('mappingRepo');

        mappingRepo.clear();
        configRepo.reset();

        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText('↺ Mappings reset')
            )
            .setNavigation(
                CardService.newNavigation()
                    .popToRoot()
            )
            .build();
    } catch (error) {
        console.error('Reset error:', error);
        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText('❌ ' + (error.message || 'Unknown error'))
            )
            .build();
    }
}

/**
 * Navigate between mapping pages (auto-saves current page)
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function saveAndNavigateMappingsPage(event) {
    try {
        getApp();  // Initialize
        
        // Save current page from form inputs if present
        try {
            _saveMappingsFromForm(event.formInput);
        } catch (saveErr) {
            console.error('Failed to save mappings before navigation:', saveErr);
            return CardService.newActionResponseBuilder()
                .setNotification(
                    CardService.newNotification()
                        .setText('❌ Failed to save page. Please try again.')
                )
                .build();
        }
        
        // Determine target page
        const targetPage = parseInt(event?.parameters?.targetPage || '0', 10);
        const card = buildMappingsCard(targetPage);
        
        return CardService.newActionResponseBuilder()
            .setNavigation(
                CardService.newNavigation()
                    .updateCard(card)
            )
            .build();
    } catch (error) {
        console.error('Navigation error:', error);
        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText('❌ ' + (error.message || 'Unknown error'))
            )
            .build();
    }
}

/**
 * Cancel mappings configuration
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function cancelMappingsConfiguration(event) {
    try {
        return CardService.newActionResponseBuilder()
            .setNavigation(
                CardService.newNavigation()
                    .popCard()
            )
            .build();
    } catch (error) {
        console.error('Cancel error:', error);
        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText('❌ ' + (error.message || 'Unknown error'))
            )
            .build();
    }
}

/**
 * Finish mappings configuration - save all and return
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function finishMappingsConfiguration(event) {
    try {
        getApp();  // Initialize
        
        // Save current page
        _saveMappingsFromForm(event.formInput);
        
        // Return to homepage
        const card = buildHomepageCard();
        
        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText('✅ Mappings saved!')
            )
            .setNavigation(
                CardService.newNavigation()
                    .popToRoot()
                    .updateCard(card)
            )
            .build();
    } catch (error) {
        console.error('Finish error:', error);
        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText('❌ ' + (error.message || 'Unknown error'))
            )
            .build();
    }
}

/**
 * Save mappings from form input to repository
 * @private
 * @param {Object} formInput - Form input from CardService
 */
function _saveMappingsFromForm(formInput) {
    // Guard: no formInput
    if (!formInput || Object.keys(formInput).length === 0) {
        console.warn('_saveMappingsFromForm: no formInput received, skipping');
        return;
    }

    try {
        getApp(); // runs bootstrap() once; registers databaseService, etc.
    } catch (e) {
        console.error('_saveMappingsFromForm: getApp() failed', e);
        // Continue; container.resolve will throw and you'll see the real cause in logs
    }

    try {
        // Get logger
        const logger = (typeof container !== 'undefined' && container.has && container.has('logger'))
            ? container.resolve('logger')
            : console;

        // Decode URL-encoded keys
        const decodedFormInput = {};
        Object.keys(formInput).forEach(key => {
            const value = formInput[key];
            decodedFormInput[key] = value;
            
            try {
                const decodedKey = decodeURIComponent(key);
                if (decodedKey !== key) {
                    decodedFormInput[decodedKey] = value;
                }
            } catch (e) {
                // Decoding failed, use original
            }
        });

        // Get services
        const dbService = container.resolve('databaseService');
        const schema = dbService.getCurrentSchema();
        const repo = container.resolve('mappingRepo');
        const handlerFactory = container.resolve('handlerFactory');

        if (!schema) {
            logger.warn('_saveMappingsFromForm: no schema available, skipping');
            return;
        }

        const existingMappings = repo.getAll();
        let updatedCount = 0;
        let skippedCount = 0;

        schema.properties.forEach(prop => {
            const propId = prop.id;
            
            // Check if property has form fields
            const hasFormField = Object.keys(decodedFormInput).some(key => 
                key.includes(propId) || key.includes(encodeURIComponent(propId))
            );
            
            if (!hasFormField) {
                skippedCount++;
                return;
            }
            
            const handler = handlerFactory.getHandler(prop.type);
            if (!handler) {
                skippedCount++;
                return;
            }
            
            try {
                const config = handler.processConfiguration(prop, decodedFormInput);
                if (config) {
                    const existing = existingMappings[propId] || {};
                    const merged = { ...existing, ...config };
                    repo.update(propId, merged);
                    updatedCount++;
                    
                    if (config.enabled) {
                        console.log(`✅ Property "${prop.name}" enabled`);
                    }
                }
            } catch (e) {
                console.warn(`Error processing property ${prop.name}: ${e.message}`);
                skippedCount++;
            }
        });
        
        console.log(`_saveMappingsFromForm: updated=${updatedCount}, preserved=${skippedCount}`);
    } catch (error) {
        console.error('_saveMappingsFromForm error:', error);
        throw error;
    }
}

/**
 * Test Notion connection
 * @param {Object} event - GAS event
 * @returns {CardService.ActionResponse} Action response
 */
function testNotionConnection(event) {
    try {
        const appInstance = getApp();
        const result = appInstance.testConnection();

        const message = result.success 
            ? `✅ Connected! ${result.message}`
            : `❌ Connection failed: ${result.message}`;

        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText(message)
            )
            .build();
    } catch (error) {
        return CardService.newActionResponseBuilder()
            .setNotification(
                CardService.newNotification()
                    .setText('❌ Error: ' + (error.message || 'Unknown error'))
            )
            .build();
    }
}

/**
 * Build homepage card
 * @returns {CardService.Card}
 */
function buildHomepageCard() {
    try {
        return getApp().showHomepage();
    } catch (error) {
        console.error('buildHomepageCard error:', error);
        return _buildErrorCardSafely('Homepage Error', error.message || 'Unknown error');
    }
}

/**
 * Build settings card
 * @returns {CardService.Card}
 */
function buildSettingsCard() {
    try {
        return getApp().showSettings();
    } catch (error) {
        console.error('buildSettingsCard error:', error);
        return _buildErrorCardSafely('Settings Error', error.message || 'Unknown error');
    }
}

/**
 * Build database selection card
 * @returns {CardService.Card}
 */
function buildDatabaseSelectionCard() {
    try {
        return getApp().showDatabaseSelection();
    } catch (error) {
        console.error('buildDatabaseSelectionCard error:', error);
        return _buildErrorCardSafely('Database Selection Error', error.message || 'Unknown error');
    }
}

/**
 * Build mappings configuration card
 * @param {number} [page=0] - 0-indexed page number
 * @returns {CardService.Card}
 */
function buildMappingsCard(page) {
    try {
        const pageNum = typeof page === 'number' ? page : 0;
        return getApp().showMappings(pageNum);
    } catch (error) {
        console.error('buildMappingsCard error:', error);
        return _buildErrorCardSafely('Mappings Error', error.message || 'Unknown error');
    }
}