/**
 * @fileoverview Text property handler
 * @description Handles title, rich_text, email, url, number, phone_number types
 */

/**
 * Text Property Handler
 * @class TextPropertyHandler
 * @extends BasePropertyHandler
 */
class TextPropertyHandler extends BasePropertyHandler {
  /**
   * @param {string} type - Property type
   * @param {GmailFieldRegistry} fieldRegistry - Gmail field registry
   * @param {TransformerRegistry} transformerRegistry - Transformer registry
   */
  constructor(type, fieldRegistry, transformerRegistry) {
    super(type);
    /** @private */
    this._fieldRegistry = fieldRegistry;
    /** @private */
    this._transformerRegistry = transformerRegistry;
  }

  /**
   * @inheritdoc
   */
  buildUI(property, currentConfig) {
    const widgets = [];
    const propId = property.id;
    const isRequired = property.isRequired || false;

    // Header
    widgets.push(this._createHeader(property));

    // Required indicator
    if (isRequired) {
      widgets.push(this._createRequiredIndicator());
    }

    // Enable checkbox (skip for title - always enabled)
    if (this._type !== 'title') {
      const isEnabled = currentConfig.enabled === true || currentConfig.enabled === 'true';
      widgets.push(this._createEnableCheckbox(`enabled_${propId}`, isEnabled));
    }

    // Gmail field dropdown
    const fieldDropdown = this._createFieldDropdown(propId, currentConfig.emailField || '');
    widgets.push(fieldDropdown);

    // Transformation dropdown
    const transformations = this._transformerRegistry.getOptionsForType(this._type);
    if (transformations.length > 1) {
      const transformDropdown = this._createTransformDropdown(
        propId,
        transformations,
        currentConfig.transformation || 'none'
      );
      widgets.push(transformDropdown);
    }

    return widgets;
  }

  /**
   * @inheritdoc
   */
  processConfiguration(property, formInput) {
    const propId = property.id;
    const isEnabled = this._type === 'title' || 
                      property.isRequired || 
                      this._isEnabled(formInput, `enabled_${propId}`);

    return {
      type: this._type,
      notionPropertyName: property.name,
      enabled: isEnabled,
      emailField: formInput[`emailField_${propId}`] || 
                  this._fieldRegistry.getRecommendedField(this._type) || 
                  'subject',
      transformation: formInput[`transformation_${propId}`] || 'none',
      isStaticOption: false,
      isRequired: property.isRequired || false
    };
  }

  /**
   * @inheritdoc
   */
  processForNotion(mapping, emailData, apiKey) {
    if (!mapping.enabled) return null;

    // Get value from email data
    let value = emailData.getValue(mapping.emailField);
    if (value === null || value === undefined) return null;

    // Apply transformation
    value = this._transformerRegistry.apply(value, mapping.transformation);
    if (!value && value !== false && value !== 0) return null;

    // Format for Notion
    return this._formatForNotion(value);
  }

  /**
   * Create Gmail field dropdown
   * @private
   */
  _createFieldDropdown(propId, currentValue) {
    const dropdown = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName(`emailField_${propId}`)
      .setTitle('Email Source');

    dropdown.addItem('-- Select field --', '', !currentValue);

    const fields = this._fieldRegistry.getFieldsForType(this._type);
    fields.forEach(field => {
      dropdown.addItem(field.label, field.value, currentValue === field.value);
    });

    return dropdown;
  }

  /**
   * Create transformation dropdown
   * @private
   */
  _createTransformDropdown(propId, options, currentValue) {
    const dropdown = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName(`transformation_${propId}`)
      .setTitle('Data Processing');

    options.forEach(opt => {
      dropdown.addItem(opt.label, opt.value, currentValue === opt.value);
    });

    return dropdown;
  }

  /**
   * Format value for Notion API
   * @private
   */
  _formatForNotion(value) {
    const stringValue = String(value);

    switch (this._type) {
      case 'title':
        return {
          title: [{ type: 'text', text: { content: stringValue } }]
        };

      case 'rich_text':
        // Split into 2000-char chunks
        const chunks = [];
        for (let i = 0; i < stringValue.length; i += 2000) {
          chunks.push({
            type: 'text',
            text: { content: stringValue.substring(i, Math.min(i + 2000, stringValue.length)) }
          });
        }
        return { rich_text: chunks };

      case 'email':
        const emailMatch = stringValue.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
        return emailMatch ? { email: emailMatch[0] } : null;

      case 'url':
        if (stringValue.startsWith('http://') || stringValue.startsWith('https://')) {
          return { url: stringValue };
        }
        if (stringValue.includes('.') && !stringValue.includes(' ')) {
          return { url: `https://${stringValue}` };
        }
        return null;

      case 'number':
        const num = parseFloat(stringValue);
        return isNaN(num) ? null : { number: num };

      case 'phone_number':
        return { phone_number: stringValue };

      default:
        return null;
    }
  }
}