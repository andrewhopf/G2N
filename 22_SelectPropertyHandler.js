/**
 * Select/Status Property Handler
 * @class SelectPropertyHandler
 */
class SelectPropertyHandler extends BasePropertyHandler {
  constructor(type) {
    super(type); // 'select' or 'status'
  }

  /* Inside SelectPropertyHandler.js (File 22) */

buildUI(property, currentConfig) {
  const widgets = [];
  const propId = property.id;
  
  // 1. We use the Header as the label instead of setTitle() to prevent overlap
  widgets.push(this._createHeader(property));
  
  if (property.isRequired) widgets.push(this._createRequiredIndicator());

  const isEnabled = currentConfig.enabled === true || currentConfig.enabled === 'true';
  widgets.push(this._createEnableCheckbox(`enabled_${propId}`, isEnabled, 'Select'));

  const options = property.config?.options || [];
  if (options.length > 0) {
    const optionsDropdown = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName(`option_${propId}`);
      // REMOVED .setTitle() from here because it causes the ghosting/overlap

    const currentOption = currentConfig.selectedOption || '';
    
    // 2. Add a blank/prompt option. 
    // We only set it as 'selected' if there is no current config.
    optionsDropdown.addItem('-- Select Option --', '', currentOption === '');

    options.forEach(opt => {
      optionsDropdown.addItem(opt.name, opt.name, currentOption === opt.name);
    });
    
    widgets.push(optionsDropdown);
  } else {
    widgets.push(CardService.newTextParagraph().setText("<font color='#FF6B6B'>⚠️ No options found in Notion</font>"));
  }
  return widgets;
}

    /* Inside SelectPropertyHandler.js */
    processConfiguration(property, formInput) {
    const propId = property.id;
    const selectedOption = formInput[`option_${propId}`] || '';
    
    return {
        type: this._type, // This MUST be 'status' if the handler was created for status
        notionPropertyName: property.name,
        enabled: (formInput[`enabled_${propId}`] === 'true') && (selectedOption !== ''),
        selectedOption: selectedOption,
        isStaticOption: true,
        isRequired: property.isRequired || false
    };
    }

  processForNotion(mapping, emailData, apiKey) {
    if (!mapping.enabled || !mapping.selectedOption) return null;

    // Use mapping.type as source of truth for the wrapper key
    const typeKey = mapping.type || this._type;

    if (typeKey === 'status') {
      return { status: { name: mapping.selectedOption } };
    }
    
    return { select: { name: mapping.selectedOption } };
  }
}