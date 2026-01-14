/**
 * @fileoverview Date property handler
 */

/**
 * Date Property Handler
 * @class DatePropertyHandler
 * @extends BasePropertyHandler
 */
class DatePropertyHandler extends BasePropertyHandler {
  constructor() {
    super('date');
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

    // Enable checkbox (unless required)
    if (!isRequired) {
      const isEnabled = currentConfig.enabled === true || currentConfig.enabled === 'true';
      widgets.push(this._createEnableCheckbox(`enabled_${propId}`, isEnabled));
    }

    // Date source dropdown
    const dateSource = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName(`emailField_${propId}`)
      .setTitle('Date Source');

    const currentField = currentConfig.emailField || '';
    dateSource.addItem('', '', !currentField);
    dateSource.addItem('Email Date', 'date', currentField === 'date');
    dateSource.addItem('Current Time', 'now', currentField === 'now');

    widgets.push(dateSource);

    return widgets;
  }

  /**
   * @inheritdoc
   */
  processConfiguration(property, formInput) {
    const propId = property.id;
    const isEnabled = property.isRequired || this._isEnabled(formInput, `enabled_${propId}`);

    return {
      type: 'date',
      notionPropertyName: property.name,
      enabled: isEnabled,
      emailField: formInput[`emailField_${propId}`] || 'date',
      isStaticOption: false,
      isRequired: property.isRequired || false
    };
  }

  /**
   * @inheritdoc
   */
  processForNotion(mapping, emailData, apiKey) {
    if (!mapping.enabled) return null;

    let dateValue;
    if (mapping.emailField === 'now') {
      dateValue = new Date();
    } else {
      dateValue = emailData.date;
    }

    if (!(dateValue instanceof Date) || isNaN(dateValue.getTime())) {
      dateValue = new Date();
    }

    return {
      date: { start: dateValue.toISOString() }
    };
  }
}