/**
 * BaseCardRenderer.js
 * Common helpers to build cards/sections/buttons consistently
 */
class BaseCardRenderer {
  /**
   * @param {ServiceContainer} container
   * @param {Logger} logger
   */
  constructor(container, logger) {
    this.container = container;
    this.logger = logger || (container && container.resolve ? container.resolve('logger') : console);
  }

  buildHeader(title = '', subtitle = '', imageUrl = '') {
    const header = CardService.newCardHeader().setTitle(String(title || ''));
    if (subtitle) header.setSubtitle(String(subtitle));
    if (imageUrl) header.setImageUrl(String(imageUrl));
    return header;
  }

  sectionWithHeader(title) {
    return CardService.newCardSection().setHeader(String(title || ''));
  }

  textParagraph(htmlOrText) {
    return CardService.newTextParagraph().setText(String(htmlOrText || ''));
  }

  keyValue(topLabel, content, multiline = false) {
    return CardService.newKeyValue().setTopLabel(String(topLabel || '')).setContent(String(content || '')).setMultiline(Boolean(multiline));
  }

  newButton(text, functionName, params = {}, options = {}) {
    const btn = CardService.newTextButton().setText(String(text || 'Button'));
    if (functionName) {
      const action = CardService.newAction().setFunctionName(functionName);
      if (params && Object.keys(params).length) action.setParameters(params);
      btn.setOnClickAction(action);
    }
    if (options.backgroundColor) btn.setBackgroundColor(options.backgroundColor);
    if (options.filled) btn.setTextButtonStyle(CardService.TextButtonStyle.FILLED);
    if (options.openUrl) btn.setOpenLink(CardService.newOpenLink().setUrl(options.openUrl));
    if (options.disabled) btn.setDisabled(Boolean(options.disabled));
    return btn;
  }

  buttonSet(...buttons) {
    const set = CardService.newButtonSet();
    buttons.forEach(b => {
      if (b) set.addButton(b);
    });
    return set;
  }

  divider() {
    return CardService.newDivider();
  }

  buildCard(header, sections = []) {
    const builder = CardService.newCardBuilder();
    if (header) builder.setHeader(header);
    sections.forEach(sec => {
      if (sec) builder.addSection(sec);
    });
    return builder.build();
  }

  notify(text) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(String(text || '')))
      .build();
  }
}