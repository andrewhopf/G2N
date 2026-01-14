/**
 * SettingsCard - renders settings UI for API key, DB selection and mapping access
 */
class SettingsCard extends BaseCardRenderer {
  constructor(container, logger) {
    super(container, logger);
    this.configRepo = container.resolve('configRepo');
    this.databaseService = container.resolve('databaseService');
  }

  build() {
    try {
      const config = this.configRepo.getAll();
      const status = this.databaseService.getStatus();

      const header = this.buildHeader('⚙️ Settings', 'Configure Gmail to Notion');

      // API Key section
      const apiSection = CardService.newCardSection()
        .setHeader('🔑 API Configuration')
        .addWidget(
          CardService.newTextInput()
            .setFieldName('api_key')
            .setTitle('Notion API Key')
            .setValue(config.apiKey || '')
            .setHint("Enter your Notion API key (starts with 'secret_')")
        );

      // Database section
      const dbSection = CardService.newCardSection()
        .setHeader('🗄️ Database')
        .addWidget(this.textParagraph(status.hasDatabaseId ? `Selected: <b>${status.databaseName}</b>` : 'No database selected'))
        .addWidget(this.buttonSet(
          this.newButton('🗄️ Select Database', 'showDatabaseSelection'),
          this.newButton('🔄 Test Connection', 'testNotionConnection')
        ));

      // Mappings section (if DB selected)
      const sections = [apiSection, dbSection];
      if (status.hasDatabaseId) {
        sections.push(CardService.newCardSection()
          .setHeader('🔄 Field Mappings')
          .addWidget(this.textParagraph(status.hasMappings ? `${status.enabledMappings} mappings configured` : 'Not configured'))
          .addWidget(this.buttonSet(this.newButton('⚙️ Configure Mappings', 'showMappingsConfiguration'))));
      }

      // Actions
      const actions = CardService.newCardSection().addWidget(
        this.buttonSet(
          this.newButton('💾 Save', 'saveConfiguration'),
          this.newButton('↺ Reset', 'resetMappingsOnly'),
          this.newButton('🏠 Home', 'onG2NHomepage')
        )
      );

      sections.push(actions);

      return this.buildCard(header, sections);
    } catch (err) {
      this.logger.error('Settings build failed', err);
      return buildErrorCard('Error', err.message);
    }
  }
}

/**
 * Global helper
 */
function buildSettingsCard() {
  const card = new SettingsCard(container, container.resolve('logger'));
  return card.build();
}