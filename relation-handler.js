// relation-handler.js
function buildRelationUI(property, savedMapping) {
  const widgets = [];
  
  widgets.push(CardService.newTextParagraph()
    .setText(`<b>${property.name}</b> <font color="#666">(Relation)</font>`));
  
  widgets.push(CardService.newTextParagraph()
    .setText("<i>Configure relation to another database</i>"));
  
  // Simple relation configuration UI
  widgets.push(CardService.newSelectionInput()
    .setFieldName("relation_enabled_" + property.id)
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .addItem("Enable this relation", "true", savedMapping.enabled || false));
  
  return widgets;  // ✅ Return array
}

function processRelationForNotion(mapping, emailData, apiKey) {
  // Return null for now - will be implemented later
  return null;
}