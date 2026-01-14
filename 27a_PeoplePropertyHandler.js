/**
 * @fileoverview People property handler
 * @description Handles people/person property type
 */

/**
 * People Property Handler
 * @class PeoplePropertyHandler
 * @extends BasePropertyHandler
 */
class PeoplePropertyHandler extends BasePropertyHandler {
  /**
   * @param {NotionAdapter} notionAdapter - Notion adapter for user lookups
   * @param {ConfigRepository} configRepo - Config repository for API key
   */
  constructor(notionAdapter, configRepo) {
    super('people');
    /** @private */
    this._notion = notionAdapter;
    /** @private */
    this._config = configRepo;
  }

  /**
   * @inheritdoc
   */
  buildUI(property, currentConfig) {
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
      this._createEnableCheckbox(`enabled_${propId}`, isEnabled, 'Assign person')
    );

    // Fetch workspace members and create dropdown
    try {
      const apiKey = this._config.get('apiKey');
      if (!apiKey) {
        widgets.push(
          CardService.newTextParagraph()
            .setText("<font color='#ea4335'>⚠️ API key not configured</font>")
        );
        return widgets;
      }

      const users = this._notion.getUsers(apiKey);
      
      if (!users || users.length === 0) {
        widgets.push(
          CardService.newTextParagraph()
            .setText("<font color='#ea4335'>⚠️ No workspace members found</font>")
        );
        return widgets;
      }

      // Create dropdown of workspace members
      const userDropdown = CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName(`selectedUser_${propId}`)
        .setTitle('Select Person');

      // Add blank option
      const currentUserId = currentConfig.selectedUserId || '';
      userDropdown.addItem('-- Select Person --', '', currentUserId === '');

      // Add each workspace member
      users.forEach(user => {
        const displayName = user.name || user.email || 'Unknown';
        const label = user.email ? `${displayName} (${user.email})` : displayName;
        userDropdown.addItem(label, user.id, currentUserId === user.id);
      });

      widgets.push(userDropdown);

      // Info text
      widgets.push(
        CardService.newTextParagraph()
          .setText(`<i>Choose from ${users.length} workspace member(s)</i>`)
      );

    } catch (error) {
      widgets.push(
        CardService.newTextParagraph()
          .setText(`<font color='#ea4335'>⚠️ Error loading users: ${error.message}</font>`)
      );
    }

    return widgets;
  }

  /**
   * @inheritdoc
   */
  processConfiguration(property, formInput) {
    const propId = property.id;
    const selectedUserId = formInput[`selectedUser_${propId}`] || '';
    const isEnabled = (property.isRequired || this._isEnabled(formInput, `enabled_${propId}`)) 
                      && selectedUserId !== '';

    return {
      type: 'people',
      notionPropertyName: property.name,
      enabled: isEnabled,
      selectedUserId: selectedUserId,
      isStaticOption: true, // This is a static selection, not from email
      isRequired: property.isRequired || false
    };
  }

  /**
   * @inheritdoc
   */
  processForNotion(mapping, emailData, apiKey) {
    if (!mapping.enabled || !mapping.selectedUserId) {
      return null;
    }

    // Return in Notion people property format
    return {
      people: [{ id: mapping.selectedUserId }]
    };
  }
}