/**
 * @fileoverview Attachment handler card for selecting individual attachments
 * @description Provides UI for users to select which attachments to save to Notion
 */

/**
 * Attachment Handler Card
 * @class AttachmentHandlerCard
 * @extends BaseCardRenderer
 */
class AttachmentHandlerCard extends BaseCardRenderer {
  /**
   * @param {ServiceContainer} container - DI container
   */
  constructor(container) {
    super(container);
    /** @private */
    this._emailService = container.resolve('emailService');
    /** @private */
    this._attachmentService = container.resolve('attachmentService');
  }

  /**
   * Build attachment selection card
   * @param {Object} event - GAS event with messageId parameter
   * @returns {CardService.Card}
   */
  build(event) {
    try {
      const messageId = event?.parameters?.messageId || event?.gmail?.messageId;
      if (!messageId) {
        return this._buildErrorCard('No email selected', 'Please select an email first.');
      }

      // Extract email data
      const emailData = this._emailService.extractById(messageId);
      if (!emailData) {
        return this._buildErrorCard('Email not found', 'Could not retrieve the selected email.');
      }

      if (!emailData.hasAttachments || emailData.attachmentCount === 0) {
        return this._buildNoAttachmentsCard(emailData);
      }

      const attachments = emailData.attachments || [];
      const attachmentInfo = this._attachmentService.getAttachmentInfo(attachments);

      return this._buildSelectionCard(emailData, attachmentInfo, messageId);

    } catch (error) {
      console.error('AttachmentHandlerCard build error:', error);
      return this._buildErrorCard('Error', error.message || 'Unknown error');
    }
  }

  /**
   * Build card for email with attachments
   * @private
   */
  _buildSelectionCard(emailData, attachmentInfo, messageId) {
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('📎 Select Attachments')
        .setSubtitle(`From: ${emailData.subject}`));

    // Info section
    const infoSection = CardService.newCardSection()
      .addWidget(
        CardService.newTextParagraph()
          .setText(`<b>Email:</b> ${emailData.subject}`)
      )
      .addWidget(
        CardService.newTextParagraph()
          .setText(`<b>Total attachments:</b> ${emailData.attachmentCount}`)
      );

    card.addSection(infoSection);

    // Attachment selection section
    const selectionSection = CardService.newCardSection()
      .setHeader('Select which attachments to save to Notion');

    const selection = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('selected_attachments')
      .setTitle('Attachments to Save');

    // Store only indices, not blobs
    attachmentInfo.forEach((att, index) => {
      const sizeFormatted = this._attachmentService.formatFileSize(att.size);
      const label = `${index + 1}. ${att.name} (${sizeFormatted}, ${att.type})`;
      
      const value = JSON.stringify({ 
        index: index,
        name: att.name,
        size: att.size 
      });
      
      const isSelected = att.size <= 5 * 1024 * 1024; // 5MB limit for auto-select
      selection.addItem(label, value, isSelected);
    });

    selectionSection.addWidget(selection);
    card.addSection(selectionSection);

    // Handling options
    const optionsSection = CardService.newCardSection()
      .setHeader('Processing Options');

    const handlingDropdown = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('file_handling')
      .setTitle('Attachment Handling')
      .addItem('Upload to Google Drive & Add to Notion', 'upload_to_drive', true)
      .addItem('Skip all attachments', 'skip', false);

    optionsSection.addWidget(handlingDropdown);
    optionsSection.addWidget(
      CardService.newTextParagraph()
        .setText("<i>Attachments will be uploaded to Google Drive and added as links in Notion.</i>")
    );
    optionsSection.addWidget(
      CardService.newTextParagraph()
        .setText("<font color='#5F6368'><i>⚠️ Attachments over 25MB will be skipped automatically.</i></font>")
    );

    card.addSection(optionsSection);

    // Action buttons
    const actionSection = CardService.newCardSection();
    const buttonSet = CardService.newButtonSet();

    buttonSet.addButton(
      CardService.newTextButton()
        .setText('💾 Save Selected to Notion')
        .setBackgroundColor('#0F9D58')
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('saveSelectedAttachments')
            .setParameters({ messageId: messageId })
        )
    );

    buttonSet.addButton(
      CardService.newTextButton()
        .setText('⬅ Back to Preview')
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('onG2NGmailMessage')
            .setParameters({ messageId: messageId })
        )
    );

    actionSection.addWidget(buttonSet);
    card.addSection(actionSection);

    return card.build();
  }

  /**
   * Build card for email with no attachments
   * @private
   */
  _buildNoAttachmentsCard(emailData) {
    const card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('📎 No Attachments')
        .setSubtitle(emailData.subject));

    const section = CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText('This email has no attachments to save.'))
      .addWidget(CardService.newButtonSet().addButton(
        CardService.newTextButton()
          .setText('⬅ Back')
          .setOnClickAction(CardService.newAction()
            .setFunctionName('onG2NGmailMessage')
            .setParameters({ messageId: emailData.messageId }))
      ));

    card.addSection(section);
    return card.build();
  }

  /**
   * Build error card
   * @private
   */
  _buildErrorCard(title, message) {
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle(`❌ ${title}`))
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(message))
        .addWidget(CardService.newButtonSet().addButton(
          CardService.newTextButton()
            .setText('🏠 Home')
            .setOnClickAction(CardService.newAction().setFunctionName('onG2NHomepage'))
        )))
      .build();
  }
}

/**
 * Global function to build attachment handler card
 * @param {Object} event - GAS event
 * @returns {CardService.Card}
 */
function buildAttachmentHandlerCard(event) {
    try {
        const container = (typeof getContainer === 'function') ? getContainer() : global.container;
        if (!container) {
            throw new Error('Container not initialized');
        }
        const card = new AttachmentHandlerCard(container);
        return card.build(event);
    } catch (error) {
        console.error('buildAttachmentHandlerCard error:', error);
        return CardService.newCardBuilder()
            .setHeader(CardService.newCardHeader().setTitle('❌ Error'))
            .addSection(
                CardService.newCardSection()
                    .addWidget(CardService.newTextParagraph().setText(error.message || 'Unknown error'))
                    .addWidget(
                        CardService.newButtonSet()
                            .addButton(
                                CardService.newTextButton()
                                    .setText('🏠 Home')
                                    .setOnClickAction(
                                        CardService.newAction()
                                            .setFunctionName('onG2NHomepage')
                                    )
                            )
                    )
            )
            .build();
    }
}
