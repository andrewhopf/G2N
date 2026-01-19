// 00_Shims.js - Minimal BaseCardRenderer shim to guarantee availability
if (typeof BaseCardRenderer === 'undefined') {
  class BaseCardRenderer {
    constructor(container, logger) { this.container = container || null; this.logger = logger || console; }
    buildHeader(title = '', subtitle = '', imageUrl = '') {
      const h = CardService.newCardHeader().setTitle(String(title || ''));
      if (subtitle) h.setSubtitle(String(subtitle));
      if (imageUrl) h.setImageUrl(String(imageUrl));
      return h;
    }
    sectionWithHeader(title = '') { return CardService.newCardSection().setHeader(String(title || '')); }
    textParagraph(htmlOrText = '') { return CardService.newTextParagraph().setText(String(htmlOrText || '')); }
    keyValue(topLabel = '', content = '', multiline = false) {
      return CardService.newKeyValue().setTopLabel(String(topLabel || '')).setContent(String(content || '')).setMultiline(Boolean(multiline));
    }
    newButton(text = 'Button', functionName, params = {}, options = {}) {
      const btn = CardService.newTextButton().setText(String(text || 'Button'));
      if (functionName) { const action = CardService.newAction().setFunctionName(functionName); if (params && Object.keys(params).length) action.setParameters(params); btn.setOnClickAction(action); }
      if (options.backgroundColor) btn.setBackgroundColor(options.backgroundColor);
      if (options.filled) btn.setTextButtonStyle(CardService.TextButtonStyle.FILLED);
      if (options.openUrl) btn.setOpenLink(CardService.newOpenLink().setUrl(options.openUrl));
      if (options.disabled) btn.setDisabled(Boolean(options.disabled));
      return btn;
    }
    buttonSet(...buttons) { const set = CardService.newButtonSet(); buttons.forEach(b => { if (b) set.addButton(b); }); return set; }
    divider() { return CardService.newDivider(); }
    buildCard(header, sections = []) { const builder = CardService.newCardBuilder(); if (header) builder.setHeader(header); sections.forEach(s => { if (s) builder.addSection(s); }); return builder.build(); }
    notify(text) { return CardService.newActionResponseBuilder().setNotification(CardService.newNotification().setText(String(text || ''))).build(); }
  }
}