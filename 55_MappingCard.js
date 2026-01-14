/**
 * @fileoverview Mapping configuration card
 * @description Card for configuring field mappings with pagination
 */

/**
 * Mapping Card Renderer
 * @class MappingCard
 */
class MappingCard {
  /**
   * @param {DatabaseService} databaseService
   * @param {MappingRepository} mappingRepo
   * @param {PropertyHandlerFactory} handlerFactory
   * @param {Logger} logger
   */
  constructor(databaseService, mappingRepo, handlerFactory, logger) {
    /** @private */
    this._database = databaseService;
    /** @private */
    this._mappings = mappingRepo;
    /** @private */
    this._handlers = handlerFactory;
    /** @private */
    this._logger = logger;
    /** @private */
    this._propertiesPerPage = 4;
    /** @private */
    this._excludedPropertyNames = ['Gmail link', 'Gmail Link'];
    /** @private */this._maxWidgetsPerSection = 15; // New: Maximum widgets per card section
  }

  /**
   * Build the mapping card
   * @param {number} page - Page number (0-indexed)
   * @returns {CardService.Card}
   */
  build(page = 0) {
    this._logger.debug('Building mapping card', { page });

    // Check configuration
    const status = this._database.getStatus();
    if (!status.hasApiKey || !status.hasDatabaseId) {
      return this._buildConfigErrorCard();
    }

    // Get schema
    const schema = this._database.getCurrentSchema();
    if (!schema) {
      return this._buildSchemaErrorCard('Could not load database');
    }

    const savedMappings = this._mappings.getAll();
    let properties = this._database.getMappableProperties();

    // ✅ FILTER: Remove excluded properties AND properties without handlers
    properties = properties.filter(prop => {
      // 1. Filter by property name (Gmail link, etc.)
      const isExcludedByName = this._excludedPropertyNames.some(excluded => 
        prop.name.toLowerCase() === excluded.toLowerCase()
      );
      
      if (isExcludedByName) {
        this._logger.debug('Hiding property by name', { name: prop.name });
        return false;
      }
      
      // 2. Filter properties without handlers (relation, files, etc.)
      const handler = this._handlers.getHandler(prop.type);
      if (!handler) {
        this._logger.debug('Hiding property - no handler available', { 
          name: prop.name, 
          type: prop.type 
        });
        return false;
      }
      
      return true;
    });

    this._logger.info('Filtered properties for mapping', { 
      total: properties.length,
      excludedNames: this._excludedPropertyNames 
    });

    // Sort: title first, then required, then alphabetical
    properties.sort((a, b) => {
      if (a.isTitle) return -1;
      if (b.isTitle) return 1;
      if (a.isRequired && !b.isRequired) return -1;
      if (!a.isRequired && b.isRequired) return 1;
      return a.name.localeCompare(b.name);
    });

    // Build card
    const card = CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle('📋 Map Email → Notion')
          .setSubtitle(`Database: ${schema.title}`)
      );

    // Database info section
    card.addSection(this._buildInfoSection(schema, properties.length));

    // Properties section with pagination
    card.addSection(this._buildPropertiesSection(properties, savedMappings, page));

    return card.build();
  }


  /**
   * Build info section
   * @private
   */
  _buildInfoSection(schema, mappableCount) {
    return CardService.newCardSection()
      .addWidget(
        CardService.newTextParagraph()
          .setText('<b>✅ Database Loaded Successfully</b>')
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText(`<b>Mappable Properties:</b> ${mappableCount}`)
      );
  }

  /**
   * Build properties section with pagination
   * @private
  */
  _buildPropertiesSection(properties, savedMappings, page) {
    const section = CardService.newCardSection().setHeader('Property Mappings');
    const totalPages = Math.ceil(properties.length / this._propertiesPerPage);
    const startIdx = page * this._propertiesPerPage;
    const endIdx = Math.min(startIdx + this._propertiesPerPage, properties.length);
    const pageProperties = properties.slice(startIdx, endIdx);

    // Build UI for each property
    pageProperties.forEach((property, idx) => {
      const mapping = savedMappings[property.id] || {};
      const handler = this._handlers.getHandler(property.type);

      // ✅ ONLY render if handler exists
      if (handler) {
        try {
          const widgets = handler.buildUI(property, mapping, page);
          widgets.forEach(widget => section.addWidget(widget));
        } catch (error) {
          this._logger.warn('Handler error', {
            property: property.name,
            error: error.message
          });
          section.addWidget(this._createFallbackUI(property));
        }

        // Add divider between properties (not after last)
        if (idx < pageProperties.length - 1) {
          section.addWidget(CardService.newDivider());
        }
      }
      // ✅ Properties without handlers are completely skipped
    });

    // Pagination info
    section.addWidget(CardService.newDivider());
    section.addWidget(
      CardService.newTextParagraph()
        .setText(`<i>Page ${page + 1} of ${totalPages} (${startIdx + 1}-${endIdx} of ${properties.length})</i>`)
    );

    // Navigation buttons
    const navButtons = CardService.newButtonSet();

    // Previous button
    if (page > 0) {
      navButtons.addButton(
        CardService.newTextButton()
          .setText('◀ Previous')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('saveAndNavigateMappingsPage')
              .setParameters({ 
                targetPage: String(page - 1), 
                currentPage: String(page) 
              })
          )
      );
    }

    // Next button
    if (page < totalPages - 1) {
      navButtons.addButton(
        CardService.newTextButton()
          .setText('Next ▶')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('saveAndNavigateMappingsPage')
              .setParameters({ 
                targetPage: String(page + 1), 
                currentPage: String(page) 
              })
          )
      );
    }

    section.addWidget(navButtons);

    // Bottom action buttons
    section.addWidget(CardService.newDivider());
    
    const actionButtons = CardService.newButtonSet();

    // Cancel button
    actionButtons.addButton(
      CardService.newTextButton()
        .setText('✖ Cancel')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('cancelMappingsConfiguration')
        )
    );

    // Done button
    actionButtons.addButton(
      CardService.newTextButton()
        .setText('✔ Done')
        .setBackgroundColor('#0F9D58')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('finishMappingsConfiguration')
            .setParameters({ currentPage: String(page) })
        )
    );

    section.addWidget(actionButtons);

    return section;
  }
   


  /**
   * Create fallback UI for property
   * @private
   */
  _createFallbackUI(property) {
    return CardService.newTextParagraph()
      .setText(`<b>${property.name}</b> - <font color="#FF6B6B">Handler error</font>`);
  }

  /**
   * Build config error card
   * @private
   */
  _buildConfigErrorCard() {
    return CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle('⚠️ Configuration Required')
      )
      .addSection(
        CardService.newCardSection()
          .addWidget(
            CardService.newTextParagraph()
              .setText('Please configure your API key and select a database first.')
          )
          .addWidget(
            CardService.newButtonSet()
              .addButton(
                CardService.newTextButton()
                  .setText('⚙️ Go to Settings')
                  .setOnClickAction(
                    CardService.newAction()
                      .setFunctionName('showG2NSettings')
                  )
              )
          )
      )
      .build();
  }

  /**
   * Build schema error card
   * @private
   */
  _buildSchemaErrorCard(message) {
    return CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle('⚠️ Database Error')
      )
      .addSection(
        CardService.newCardSection()
          .addWidget(
            CardService.newTextParagraph()
              .setText(message)
          )
          .addWidget(
            CardService.newButtonSet()
              .addButton(
                CardService.newTextButton()
                  .setText('🔄 Retry')
                  .setOnClickAction(
                    CardService.newAction()
                      .setFunctionName('showMappingsConfiguration')
                  )
              )
          )
      )
      .build();
  }
}

/**
 * Global function for building mapping card
 * @param {number} page - Page number
 * @returns {CardService.Card}
 */
function buildMappingsCard(page = 0) {
  const mappingCard = new MappingCard(
    container.resolve('databaseService'),
    container.resolve('mappingRepo'),
    container.resolve('handlerFactory'),
    container.resolve('logger')
  );
  return mappingCard.build(page);
}

/**
 * Debug what's being rendered
 */
function debugMappingCardRendering() {
  const app = getApp();
  const container = app.getContainer();
  const dbService = container.resolve('databaseService');
  const handlerFactory = container.resolve('handlerFactory');
  const logger = container.resolve('logger');
  
  const schema = dbService.getCurrentSchema();
  const allProperties = dbService.getMappableProperties();
  
  console.log('=== BEFORE FILTERING ===');
  allProperties.forEach(prop => {
    const handler = handlerFactory.getHandler(prop.type);
    console.log(`${prop.name} (${prop.type}) - Handler exists: ${handler !== null}`);
  });
  
  // Simulate the actual filter from MappingCard
  const excludedNames = ['Gmail link', 'Gmail Link'];
  const filtered = allProperties.filter(prop => {
    // Name filter
    const isExcludedByName = excludedNames.some(excluded => 
      prop.name.toLowerCase() === excluded.toLowerCase()
    );
    if (isExcludedByName) {
      console.log(`FILTERED OUT by name: ${prop.name}`);
      return false;
    }
    
    // Handler filter
    const handler = handlerFactory.getHandler(prop.type);
    if (!handler) {
      console.log(`FILTERED OUT no handler: ${prop.name} (${prop.type})`);
      return false;
    }
    
    return true;
  });
  
  console.log('\n=== AFTER FILTERING (SHOULD RENDER) ===');
  filtered.forEach(prop => {
    console.log(`✅ ${prop.name} (${prop.type})`);
  });
  
  console.log(`\nTotal: ${allProperties.length} → Filtered: ${filtered.length}`);
}
