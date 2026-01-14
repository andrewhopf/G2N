/**
 * @fileoverview Multi-select property handler
 */

/**
 * Multi-Select Property Handler
 * @class MultiSelectPropertyHandler
 * @extends BasePropertyHandler
 */
class MultiSelectPropertyHandler extends BasePropertyHandler {
  constructor() {
    super('multi_select');
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

    // Enable checkbox
    const isEnabled = currentConfig.enabled === true || currentConfig.enabled === 'true';
    widgets.push(this._createEnableCheckbox(`enabled_${propId}`, isEnabled, 'Set values'));

    // Multi-select checkboxes
    const options = property.config?.options || [];
    if (options.length > 0) {
      const multiSelect = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .setFieldName(`options_${propId}`)
        .setTitle(`Select ${property.name} values`);

      const selectedOptions = Array.isArray(currentConfig.selectedOptions) 
        ? currentConfig.selectedOptions 
        : [];

      options.forEach(opt => {
        multiSelect.addItem(opt.name, opt.name, selectedOptions.includes(opt.name));
      });

      widgets.push(multiSelect);
    } else {
      widgets.push(
        CardService.newTextParagraph()
          .setText("<font color='#FF6B6B'>⚠️ No options available</font>")
      );
    }

    return widgets;
  }

  /**
   * @inheritdoc
   */
  processConfiguration(property, formInput) {
    const propId = property.id;
    const isEnabled = this._isEnabled(formInput, `enabled_${propId}`);
    
    let selectedOptions = [];
    const formValue = formInput[`options_${propId}`];
    if (Array.isArray(formValue)) {
      selectedOptions = formValue;
    } else if (formValue) {
      selectedOptions = [formValue];
    }

    return {
      type: 'multi_select',
      notionPropertyName: property.name,
      enabled: isEnabled && selectedOptions.length > 0,
      selectedOptions: selectedOptions,
      isStaticOption: true,
      isRequired: property.isRequired || false
    };
  }

  /**
   * @inheritdoc
   */
  processForNotion(mapping, emailData, apiKey) {
    if (!mapping.enabled || !mapping.selectedOptions || mapping.selectedOptions.length === 0) {
      return null;
    }

    return {
      multi_select: mapping.selectedOptions.map(name => ({ name }))
    };
  }
}