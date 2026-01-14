/**
 * @fileoverview Checkbox property handler
 */

/**
 * Checkbox Property Handler
 * @class CheckboxPropertyHandler
 * @extends BasePropertyHandler
 */
class CheckboxPropertyHandler extends BasePropertyHandler {
  constructor() {
    super('checkbox');
  }

  /**
   * @inheritdoc
   */
  buildUI(property, currentConfig) {
    const widgets = [];
    const propId = property.id;

    // Header
    widgets.push(this._createHeader(property));

    // Required indicator
    if (property.isRequired) {
      widgets.push(this._createRequiredIndicator());
    }

    // Checkbox value
    const isChecked = currentConfig.checkboxValue === true || 
                      currentConfig.checkboxValue === 'true' ||
                      currentConfig.enabled === true;

    const checkbox = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName(`checkbox_${propId}`)
      .setTitle('Checkbox Setting')
      .addItem('Check this box in Notion', 'true', isChecked);

    widgets.push(checkbox);

    return widgets;
  }

  /**
   * @inheritdoc
   */
  processConfiguration(property, formInput) {
    const propId = property.id;
    const isChecked = this._isEnabled(formInput, `checkbox_${propId}`);

    return {
      type: 'checkbox',
      notionPropertyName: property.name,
      enabled: isChecked,
      checkboxValue: isChecked,
      isStaticOption: true,
      isRequired: property.isRequired || false
    };
  }

  /**
   * @inheritdoc
   */
  processForNotion(mapping, emailData, apiKey) {
    if (!mapping.enabled) return null;

    return {
      checkbox: mapping.checkboxValue !== false
    };
  }
}