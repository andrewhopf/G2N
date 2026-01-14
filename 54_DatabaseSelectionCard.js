/**
 * DatabaseSelectionCard - presents list of Notion databases to choose from
 */
class DatabaseSelectionCard extends BaseCardRenderer {
  constructor(container, logger) {
    super(container, logger);
    this.notionService = container.resolve('notionService');
    this.configRepo = container.resolve('configRepo');
  }

  /**
   * Build database selection card
   * @returns {CardService.Card}
   */
  build() {
    try {
      // Attempt to list databases (NotionService will throw if apiKey missing)
      let databases;
      try {
        databases = this.notionService.listDatabases();
      } catch (err) {
        this.logger.warn('Failed to list databases', err.message);
        return new ErrorCard().buildConnectionError('Notion');
      }

      const currentDb = this.configRepo.get('databaseId') || '';

      const header = this.buildHeader('🗄️ Select Database');

      const section = CardService.newCardSection();

      if (!databases || databases.length === 0) {
        section.addWidget(this.textParagraph('No databases found. Make sure your integration has access to at least one database.'));
      } else {
        const selection = CardService.newSelectionInput()
          .setFieldName('selected_database')
          .setTitle('Available Databases')
          .setType(CardService.SelectionInputType.RADIO_BUTTON);

        databases.forEach(db => {
          selection.addItem(db.name, db.id, db.id === currentDb);
        });

        section.addWidget(selection);
      }

      const actions = CardService.newCardSection().addWidget(this.buttonSet(
        this.newButton('✅ Select', 'saveDatabaseSelection'),
        this.newButton('🔄 Refresh', 'showDatabaseSelection'),
        this.newButton('🏠 Home', 'onG2NHomepage')
      ));

      return this.buildCard(header, [section, actions]);
    } catch (error) {
      this.logger.error('Database selection build failed', error);
      return buildErrorCard('Error', error.message);
    }
  }
}

/**
 * Global helper
 */
function buildDatabaseSelectionCard() {
  const card = new DatabaseSelectionCard(container, container.resolve('logger'));
  return card.build();
}