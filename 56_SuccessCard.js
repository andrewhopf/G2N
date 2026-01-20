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

    if (typeof result.attachmentsSavedText === 'string') {
      successSection.addWidget(
        CardService.newTextParagraph()
          .setText(`<b>Attachments saved:</b> ${Utils.escapeHtml(result.attachmentsSavedText)}`)
      );
    } else if (typeof result.attachmentsSaved === 'number') {
      successSection.addWidget(
        CardService.newTextParagraph()
          .setText(`<b>Attachments saved:</b> ${result.attachmentsSaved}`)
      );
    }

    try {
      const configRepo = container.resolve('configRepo');
      const config = configRepo.getAll();
      const mappingRepo = container.resolve('mappingRepo');
      const enabledEmailMappings = mappingRepo.getEnabledCount();
      successSection.addWidget(
        CardService.newTextParagraph()
          .setText(`<b>Email mappings enabled:</b> ${enabledEmailMappings}`)
      );

      if (config.attachmentUseSeparateDatabase) {
        const attachmentMappingRepo = container.resolve('attachmentMappingRepo');
        const enabledAttachmentMappings = attachmentMappingRepo.getEnabledCount();
        successSection.addWidget(
          CardService.newTextParagraph()
            .setText(`<b>Attachment mappings enabled:</b> ${enabledAttachmentMappings}`)
        );
      }
    } catch (e) {
      // Non-fatal; keep success card minimal if lookup fails.
    }

    try {
      const attachmentService = container.resolve('attachmentService');
      const last = attachmentService.getLastUploadedAttachments();
      if (last && last.uploaded && last.uploaded.length > 0) {
        const expectedIds = [];
        if (result.selectionKey) expectedIds.push(result.selectionKey);
        if (result.emailId) expectedIds.push(result.emailId);
        if (expectedIds.length > 0 && last.messageId && !expectedIds.includes(last.messageId)) {
          return card.build();
        }

        const links = last.uploaded
          .filter(f => f && f.url)
          .map(f => `<a href="${f.url}">${Utils.escapeHtml(f.name || 'Attachment')}</a>`)
          .join('<br/>');
        successSection.addWidget(
          CardService.newTextParagraph()
            .setText(`<b>Uploaded Files:</b><br/>${links}`)
        );
        attachmentService.clearLastUploadedAttachments();
      }
    } catch (e) {
      // Non-fatal; keep success card minimal if lookup fails.
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

    // 2. Settings button to manage configuration
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
