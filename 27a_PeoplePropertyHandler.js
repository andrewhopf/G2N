/**
 * @fileoverview People property handler
 * @description Handles people property type - assigns Notion workspace users
 */

/**
 * People Property Handler
 * @class PeoplePropertyHandler
 * @extends BasePropertyHandler
 */
class PeoplePropertyHandler extends BasePropertyHandler {
  /**
   * @param {NotionAdapter} notionAdapter - Notion adapter for user lookups
   * @param {ConfigRepository} configRepo - Config repository
   * @param {Logger} logger - Logger instance
   */
  constructor(notionAdapter, configRepo, logger) {
    super('people');
    /** @private */
    this._notion = notionAdapter;
    /** @private */
    this._config = configRepo;
    /** @private */
    this._logger = logger;
  }

  /**
   * @inheritdoc
   */
  buildUI(property, currentConfig, page = 0) {
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
    widgets.push(
      this._createEnableCheckbox(`enabled_${propId}`, isEnabled, 'Assign people')
    );

    // Try to get workspace users
    let users = [];
    try {
      const apiKey = this._config.get('apiKey');
      if (apiKey) {
        users = this._notion.getUsers(apiKey) || [];
      }
    } catch (e) {
      this._logger.warn('Could not fetch Notion users', e.message);
    }

    if (users.length > 0) {
      // User selection (multi-select checkboxes)
      const userSelection = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.CHECK_BOX)
        .setFieldName(`people_${propId}`)
        .setTitle('Select users to assign');

      const selectedUserIds = Array.isArray(currentConfig.selectedUserIds)
        ? currentConfig.selectedUserIds
        : [];

      users.forEach(user => {
        const displayName = user.name || user.email || 'Unknown User';
        userSelection.addItem(
          displayName,
          user.id,
          selectedUserIds.includes(user.id)
        );
      });

      widgets.push(userSelection);
    } else {
      widgets.push(
        CardService.newTextParagraph()
          .setText("<font color='#FF6B6B'>⚠️ No workspace users found. Check API key permissions.</font>")
      );
    }

    // Info text
    widgets.push(
      CardService.newTextParagraph()
        .setText("<font color='#5F6368'><i>Selected users will be assigned to this property when saving emails.</i></font>")
    );

    return widgets;
  }

  /**
   * @inheritdoc
   */
  processConfiguration(property, formInput) {
    const propId = property.id;
    const isEnabled = this._isEnabled(formInput, `enabled_${propId}`);

    // Get selected user IDs
    let selectedUserIds = [];
    const formValue = formInput[`people_${propId}`];
    if (Array.isArray(formValue)) {
      selectedUserIds = formValue;
    } else if (formValue) {
      selectedUserIds = [formValue];
    }

    return {
      type: 'people',
      notionPropertyName: property.name,
      enabled: isEnabled && selectedUserIds.length > 0,
      selectedUserIds: selectedUserIds,
      isStaticOption: true,
      isRequired: property.isRequired || false
    };
  }

  /**
   * @inheritdoc
   */
  processForNotion(mapping, emailData, apiKey) {
    if (!mapping.enabled) return null;
    if (!mapping.selectedUserIds || mapping.selectedUserIds.length === 0) return null;

    return {
      people: mapping.selectedUserIds.map(id => ({ id }))
    };
  }
}