/**
 * @fileoverview Success card renderer
 * @description Card displayed after successful email save
 */

/**
 * Success Card Renderer
 * Modified to simplify actions and reroute View Email back to the Preview.
 */
class SuccessCard {
  /**
   * Build success card
   * @param {Object} result - Save result
   */
  build(result) {
    const card = CardService.newCardBuilder()
      .setHeader(
        CardService.newCardHeader()
          .setTitle('✅ Success!')
          .setSubtitle('Email saved to Notion')
      );

    // Success message section
    const successSection = CardService.newCardSection()
      .addWidget(
        CardService.newTextParagraph()
          .setText('<b>Your email has been successfully saved to Notion!</b>')
      );

    if (result.subject) {
      successSection.addWidget(
        CardService.newTextParagraph()
          .setText(`<b>Subject:</b> ${Utils.escapeHtml(result.subject)}`)
      );
    }

    // Keep the text link as requested, removing the separate button later
    if (result.pageUrl) {
      successSection.addWidget(
        CardService.newTextParagraph()
          .setText(`<b>Notion Page:</b> <a href="${result.pageUrl}">Open in Notion</a>`)
      );
    }

    card.addSection(successSection);

    // Actions section
    const actionsSection = CardService.newCardSection();
    const buttonSet = CardService.newButtonSet();

    // 1. Reroute View Email: Instead of opening a URL, we call the preview function
    // This allows the user to stay within the Add-on UI
    if (result.emailId) {
      buttonSet.addButton(
        CardService.newTextButton()
          .setText('📨 Back to Preview')
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('onG2NGmailMessage')
              .setParameters({ messageId: result.emailId })
          )
      );
    }

    // 2. Simple Home button to get back to the start
    buttonSet.addButton(
      CardService.newTextButton()
        .setText('🏠 Home')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('onG2NHomepage')
        )
    );

    actionsSection.addWidget(buttonSet);
    card.addSection(actionsSection);

    return card.build();
  }
}

/**
 * Global function for building success card
 * @param {Object} result - Result object
 * @returns {CardService.Card}
 */
function buildSuccessCard(result) {
  const successCard = new SuccessCard();
  return successCard.build(result);
}