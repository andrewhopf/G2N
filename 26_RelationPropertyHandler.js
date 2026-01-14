/**
 * @fileoverview Relation property handler
 * @description Handles relation properties with database browsing/search
 */

/**
 * Relation Property Handler
 * @class RelationPropertyHandler
 * @extends BasePropertyHandler
 */
class RelationPropertyHandler extends BasePropertyHandler {
  /**
   * @param {NotionAdapter} notionAdapter - Notion adapter for lookups
   */
  constructor(notionAdapter) {
    super('relation');
    /** @private */
    this._notion = notionAdapter;
  }

  /**
   * @inheritdoc
   */
buildUI(property, currentConfig, page = 0) { // Added page argument
  const widgets = [];
  const propId = property.id;
  const relatedDbId = this._extractRelatedDatabaseId(property.config);

    // Header
    widgets.push(this._createHeader(property));

    // Required indicator
    if (property.isRequired) {
      widgets.push(this._createRequiredIndicator());
    }

    // Show related database info
    if (relatedDbId) {
      widgets.push(
        CardService.newTextParagraph()
          .setText(`<font color="#5F6368"><i>Links to database: ${relatedDbId.substring(0, 8)}...</i></font>`)
      );
    } else {
      widgets.push(
        CardService.newTextParagraph()
          .setText("<font color='#FF6B6B'>⚠️ Could not identify related database</font>")
      );
    }

    // Enable checkbox
    const isEnabled = currentConfig.enabled === true || currentConfig.enabled === 'true';
    widgets.push(
      CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .setFieldName(`relation_enabled_${propId}`)
        .addItem('Enable relation linking', 'true', isEnabled)
    );

    if (relatedDbId) {
      // Search input
      widgets.push(
        CardService.newTextParagraph()
          .setText('<b>Search for pages to link:</b>')
      );

      widgets.push(
        CardService.newTextInput()
          .setFieldName(`relation_search_${propId}`)
          .setTitle('Search Query')
          .setHint('Type to search pages in the related database')
          .setValue(currentConfig.searchQuery || '')
      );

      // Search button
      const buttonSet = CardService.newButtonSet();
      buttonSet.addButton(
        CardService.newTextButton()
        .setText('🔍 Search Pages')
        .setOnClickAction(
            CardService.newAction()
            .setFunctionName('searchRelationPages')
            .setParameters({
                propertyId: propId,
                propertyName: property.name,
                databaseId: relatedDbId,
                returnPage: String(page) // Pass the page number to the search function
              })
          )
      );
      widgets.push(buttonSet);

      // Show selected pages
      const selectedPages = currentConfig.selectedPages || [];
      if (selectedPages.length > 0) {
        widgets.push(
          CardService.newTextParagraph()
            .setText('<b>Selected Pages:</b>')
        );

        selectedPages.forEach((page, index) => {
          widgets.push(
            CardService.newTextParagraph()
              .setText(`${index + 1}. ${page.title}`)
          );
        });

        // Clear button
        const clearButton = CardService.newButtonSet();
        clearButton.addButton(
          CardService.newTextButton()
            .setText('🗑️ Clear Selection')
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName('clearRelationSelection')
                .setParameters({ propertyId: propId })
            )
        );
        widgets.push(clearButton);
      } else {
        widgets.push(
          CardService.newTextParagraph()
            .setText('<i>No pages selected yet. Use search above to find pages.</i>')
        );
      }
    }

    // Info text
    widgets.push(
      CardService.newTextParagraph()
        .setText("<font color='#5F6368'><i>Links the Notion page to selected pages in the related database.</i></font>")
    );

    return widgets;
  }

  /**
   * @inheritdoc
   */
  processConfiguration(property, formInput) {
    const propId = property.id;
    const isEnabled = formInput[`relation_enabled_${propId}`] === 'true';
    const searchQuery = formInput[`relation_search_${propId}`] || '';

    // Get selected pages from stored mappings (not form input)
    let selectedPages = [];
    try {
      const props = PropertiesService.getUserProperties();
      const mappingsStr = props.getProperty('G2N_MAPPINGS');
      if (mappingsStr) {
        const mappings = JSON.parse(mappingsStr);
        if (mappings[propId]?.selectedPages) {
          selectedPages = mappings[propId].selectedPages;
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }

    return {
      type: 'relation',
      notionPropertyName: property.name,
      enabled: isEnabled,
      selectedPages: selectedPages,
      searchQuery: searchQuery,
      isStaticOption: false,
      isRelation: true,
      isRequired: property.isRequired || false,
      relationConfig: property.config || {}
    };
  }

  /**
   * @inheritdoc
   */
  processForNotion(mapping, emailData, apiKey) {
    if (!mapping.enabled) return null;
    if (!mapping.selectedPages || mapping.selectedPages.length === 0) return null;

    return {
      relation: mapping.selectedPages.map(page => ({ id: page.id }))
    };
  }

  /**
   * Extract related database ID from relation config
   * @private
   * @param {Object} config - Relation configuration
   * @returns {string|null}
   */
  _extractRelatedDatabaseId(config) {
    if (!config) return null;

    // Direct database_id
    if (config.database_id) {
      return this._normalizeId(config.database_id);
    }

    // data_source_id (used in some relation types)
    if (config.data_source_id) {
      return this._normalizeId(config.data_source_id);
    }

    // Dual property relation
    if (config.type === 'dual_property' && config.dual_property) {
      if (config.data_source_id) {
        return this._normalizeId(config.data_source_id);
      }
    }

    // Try to extract from stringified config
    const configStr = JSON.stringify(config);
    
    // UUID pattern with hyphens
    const uuidMatch = configStr.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (uuidMatch) {
      return uuidMatch[1].replace(/-/g, '');
    }

    // 32-char hex pattern
    const hexMatch = configStr.match(/([a-f0-9]{32})/);
    if (hexMatch) {
      return hexMatch[1];
    }

    return null;
  }

  /**
   * Normalize Notion ID
   * @private
   */
  _normalizeId(id) {
    if (!id) return null;
    if (typeof id === 'string') {
      const cleaned = id.replace(/-/g, '');
      if (cleaned.length === 32 && /^[a-f0-9]{32}$/.test(cleaned)) {
        return cleaned;
      }
    }
    return null;
  }
}

/**
 * Search relation pages - Global function for action handler
 * @param {Object} event - Event with parameters
 * @returns {CardService.ActionResponse}
 */
function searchRelationPages(event) {
  const appInstance = getApp();
  const c = appInstance.getContainer();
  console.log('searchRelationPages services:', c.getRegisteredServices());

  if (event.formInput) {
    _saveMappingsFromForm(event.formInput);
  }

  const propId = event.parameters.propertyId;
  const propName = event.parameters.propertyName;
  const databaseId = event.parameters.databaseId;
  const returnPage = event.parameters.returnPage || "0";
  const searchQuery = event.formInput ? event.formInput[`relation_search_${propId}`] : '';

  try {
    const notionAdapter = container.resolve('notionAdapter');
    const configRepo = container.resolve('configRepo');
    const apiKey = configRepo.get('apiKey');

    // Build query with optional search filter
    let queryPayload = { page_size: 100 };
    
    if (searchQuery && searchQuery.trim()) {
      try {
        const relatedDbSchema = notionAdapter.getDatabase(databaseId, apiKey);
        const titleProp = Object.values(relatedDbSchema.properties || {}).find(p => p.type === 'title');
        const titlePropName = titleProp ? titleProp.name : 'Name';
        
        queryPayload.filter = {
          property: titlePropName,
          title: { contains: searchQuery.trim() }
        };
      } catch (e) {
        console.warn('Could not set search filter', e.message);
      }
    }

    const pages = notionAdapter.queryDatabase(databaseId, queryPayload, apiKey);

    if (pages.length === 0) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification()
            .setText(`ℹ️ No pages found${searchQuery ? ` for "${searchQuery}"` : ''}`)
        )
        .build();
    }

    const card = CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle('📄 Select Pages to Link')
          .setSubtitle(`Found ${pages.length} pages`)
      );

    const section = CardService.newCardSection();
    const selection = CardService.newSelectionInput()
      .setFieldName(`relation_selected_pages_${propId}`)
      .setTitle('Select Pages')
      .setType(CardService.SelectionInputType.CHECK_BOX);

    pages.slice(0, 20).forEach(page => {
      // CORRECTED: Extract title from page properties
      const pageTitle = (page && page.properties)
        ? (function extractTitle(p) {
            const titleProp = Object.values(p.properties).find(v => v && v.type === 'title');
            const text = titleProp?.title?.map(t => t.plain_text || '').join('') || 'Untitled';
            return text;
        })(page)
        : 'Untitled';

      const shortTitle = pageTitle.substring(0, 50) + (pageTitle.length > 50 ? '...' : '');

      selection.addItem(
        shortTitle,
        JSON.stringify({ id: page.id, title: pageTitle }),
        false
      );
    });

    section.addWidget(selection);

    const buttonSet = CardService.newButtonSet();
    buttonSet.addButton(
      CardService.newTextButton()
        .setText('✅ Select These Pages')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('saveRelationSelection')
            .setParameters({
              propertyId: propId,
              propertyName: propName,
              databaseId: databaseId,
              returnPage: returnPage
            })
        )
    );
    
    buttonSet.addButton(
      CardService.newTextButton()
        .setText('🔙 Back')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('showMappingsConfiguration')
            .setParameters({ targetPage: returnPage })
        )
    );

    section.addWidget(buttonSet);
    card.addSection(section);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().pushCard(card.build()))
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('❌ Error searching pages: ' + error.message)
      )
      .build();
  }
}

/**
 * Save relation selection - Global function for action handler
 * @param {Object} event - Event with parameters and form input
 * @returns {CardService.ActionResponse}
 */
function saveRelationSelection(event) {
  const propId = event.parameters.propertyId;
  const propName = event.parameters.propertyName;
  // Get the page number we came from (default to 0)
  const returnPage = parseInt(event.parameters.returnPage || "0", 10);
  const formValue = event.formInput ? event.formInput[`relation_selected_pages_${propId}`] : [];

  try {
    // Parse selected pages
    const selectedPages = [];
    const values = Array.isArray(formValue) ? formValue : (formValue ? [formValue] : []);
    
    values.forEach(v => {
      try {
        const page = JSON.parse(v);
        selectedPages.push(page);
      } catch (e) {
        // Skip invalid entries
      }
    });

    if (selectedPages.length === 0) {
      return CardService.newActionResponseBuilder()
        .setNotification(CardService.newNotification().setText('ℹ️ No pages selected'))
        .setNavigation(CardService.newNavigation().popCard())
        .build();
    }

    // Save to mappings repository
    const props = PropertiesService.getUserProperties();
    const mappingsStr = props.getProperty('G2N_MAPPINGS') || '{}';
    const mappings = JSON.parse(mappingsStr);

    if (mappings[propId]) {
      mappings[propId].selectedPages = selectedPages;
      mappings[propId].enabled = true;
    }

    props.setProperty('G2N_MAPPINGS', JSON.stringify(mappings));

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText(`✅ Selected ${selectedPages.length} page(s)`)
      )
      .setNavigation(
        CardService.newNavigation()
          .popCard() // Remove selection card
          .popCard() // Remove search card
          .updateCard(buildMappingsCard(returnPage)) // REFRESH the mapping card at the CORRECT page
      )
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('❌ Error: ' + error.message)
      )
      .build();
  }
}

/**
 * Clear relation selection - Global function for action handler
 * @param {Object} event - Event with parameters
 * @returns {CardService.ActionResponse}
 */
function clearRelationSelection(event) {
  const propId = event.parameters.propertyId;

  try {
    const props = PropertiesService.getUserProperties();
    const mappingsStr = props.getProperty('G2N_MAPPINGS') || '{}';
    const mappings = JSON.parse(mappingsStr);

    if (mappings[propId]) {
      delete mappings[propId].selectedPages;
      mappings[propId].enabled = false;
    }

    props.setProperty('G2N_MAPPINGS', JSON.stringify(mappings));

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('✅ Selection cleared'))
      .setNavigation(CardService.newNavigation().updateCard(buildMappingsCard()))
      .build();

  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
          .setText('❌ Error: ' + error.message)
      )
      .build();
  }
}