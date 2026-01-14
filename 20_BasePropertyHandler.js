/**
 * @fileoverview Abstract base property handler
 * @description Base class for all Notion property type handlers
 */

/**
 * Abstract Base Property Handler
 * @abstract
 * @class BasePropertyHandler
 */
class BasePropertyHandler {
  /**
   * @param {string} type - Property type name
   */
  constructor(type) {
    if (new.target === BasePropertyHandler) {
      throw new Error('BasePropertyHandler is abstract and cannot be instantiated directly');
    }
    /** @protected */
    this._type = type;
  }

  /**
   * Get the property type
   * @returns {string}
   */
  get type() {
    return this._type;
  }

  /**
   * Check if this handler supports the given type
   * @param {string} type - Property type to check
   * @returns {boolean}
   */
  supports(type) {
    return this._type === type;
  }

  /**
   * Build UI widgets for property configuration
   * @abstract
   * @param {Object} property - Notion property object
   * @param {Object} currentConfig - Current configuration
   * @returns {Array<CardService.Widget>}
   */
buildUI(property, currentConfig, page = 0) {
  throw new Error('buildUI must be implemented by subclass');
}

  /**
   * Process form input into configuration
   * @abstract
   * @param {Object} property - Notion property object
   * @param {Object} formInput - Form input data
   * @returns {Object} Processed configuration
   */
  processConfiguration(property, formInput) {
    throw new Error('processConfiguration must be implemented by subclass');
  }

  /**
   * Convert email data to Notion property format
   * @abstract
   * @param {Object} mapping - Mapping configuration
   * @param {EmailData} emailData - Email data
   * @param {string} apiKey - Optional API key for lookups
   * @returns {Object|null} Notion property format
   */
  processForNotion(mapping, emailData, apiKey) {
    throw new Error('processForNotion must be implemented by subclass');
  }

  /**
   * Get display name for the property type
   * @returns {string}
   */
  getDisplayName() {
    const names = {
      'title': 'Title',
      'rich_text': 'Text',
      'select': 'Select',
      'status': 'Status',
      'multi_select': 'Multi-select',
      'checkbox': 'Checkbox',
      'date': 'Date',
      'url': 'URL',
      'email': 'Email',
      'number': 'Number',
      'phone_number': 'Phone',
      'files': 'Files',
      'relation': 'Relation',
      'people': 'People'
    };
    return names[this._type] || this._type;
  }

  /**
   * Create property header widget
   * @protected
   * @param {Object} property - Property object
   * @returns {CardService.TextParagraph}
   */
  _createHeader(property) {
    return CardService.newTextParagraph()
      .setText(`<b>${property.name}</b> <font color="#666">(${this.getDisplayName()})</font>`);
  }

  /**
   * Create required field indicator
   * @protected
   * @returns {CardService.TextParagraph}
   */
  _createRequiredIndicator() {
    return CardService.newTextParagraph()
      .setText("<font color='#d93025'>⚠️ Required field</font>");
  }

  /**
   * Create enable/disable checkbox
   * @protected
   * @param {string} fieldName - Field name
   * @param {boolean} isEnabled - Current enabled state
   * @param {string} label - Checkbox label
   * @returns {CardService.SelectionInput}
   */
  _createEnableCheckbox(fieldName, isEnabled, label = 'Map this property') {
    return CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName(fieldName)
      .addItem(label, 'true', isEnabled);
  }

  /**
   * Check if mapping is enabled from form input
   * @protected
   * @param {Object} formInput - Form input
   * @param {string} fieldName - Field name to check
   * @returns {boolean}
   */
  _isEnabled(formInput, fieldName) {
    return formInput[fieldName] === 'true' || formInput[fieldName] === true;
  }
}