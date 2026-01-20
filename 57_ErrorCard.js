/**
 * @fileoverview Error card renderer
 * @description Card displayed when errors occur
 */

/**
 * Error Card Renderer
 * @class ErrorCard
 */
class ErrorCard {
  /**
   * Build error card
   * @param {string} title - Error title
   * @param {string} message - Error message
   * @param {Object} [options] - Additional options
   * @param {Array<string>} [options.details] - Error details
   * @param {boolean} [options.showRetry] - Show retry button
   * @param {string} [options.retryFunction] - Retry function name
   * @returns {CardService.Card}
   */
  build(title, message, options = {}) {
    const card = CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle(`❌ ${title}`)
      );

    // Error message section
    const errorSection = CardService.newCardSection()
      .addWidget(
        CardService.newTextParagraph()
          .setText(Utils.escapeHtml(message))
      );

    // Add details if provided
    if (options.details && options.details.length > 0) {
      errorSection.addWidget(CardService.newDivider());
      errorSection.addWidget(
        CardService.newTextParagraph()
          .setText('<b>Details:</b>')
      );
      
      options.details.forEach(detail => {
        errorSection.addWidget(
          CardService.newTextParagraph()
            .setText(`• ${Utils.escapeHtml(detail)}`)
        );
      });
    }

    card.addSection(errorSection);

    // Actions section
    const actionsSection = CardService.newCardSection();
    const buttonSet = CardService.newButtonSet();

    // Retry button
    if (options.showRetry !== false) {
      buttonSet.addButton(
        CardService.newTextButton()
          .setText('🔄 Try Again')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName(options.retryFunction || 'showG2NSettings')
          )
      );
    }

    // Settings button
    buttonSet.addButton(
      CardService.newTextButton()
        .setText('⚙️ Settings')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('showG2NSettings')
        )
    );

    actionsSection.addWidget(buttonSet);
    card.addSection(actionsSection);

    return card.build();
  }

  /**
   * Build configuration error card
   * @returns {CardService.Card}
   */
  buildConfigError() {
    return this.build(
      'Configuration Required',
      'Please complete the setup before using this feature.',
      {
        details: [
          'API key must be configured',
          'A database must be selected',
          'Field mappings should be configured'
        ],
        retryFunction: 'showG2NSettings'
      }
    );
  }

  /**
   * Build connection error card
   * @param {string} service - Service name (Notion/Gmail)
   * @returns {CardService.Card}
   */
  buildConnectionError(service) {
    return this.build(
      `${service} Connection Failed`,
      `Could not connect to ${service}. Please check your configuration.`,
      {
        details: [
          'Verify your API key is correct',
          'Check your internet connection',
          'Ensure the service is accessible'
        ]
      }
    );
  }
}

/**
 * Global function for building error card
 * @param {string} title - Error title
 * @param {string} message - Error message
 * @returns {CardService.Card}
 */
function buildErrorCard(title, message) {
  const errorCard = new ErrorCard();
  return errorCard.build(title, message);
}
