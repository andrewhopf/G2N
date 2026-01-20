/**
 * HomepageCard - renders the add-on homepage
 */
class HomepageCard extends BaseCardRenderer {
  /**
   * @param {ServiceContainer} container
   * @param {Logger} logger
   */
  constructor(container, logger) {
    super(container, logger);
    this.databaseService = container.resolve('databaseService');
    this.configRepo = container.resolve('configRepo');
  }

  /**
   * Build homepage card
   * @returns {CardService.Card}
   */
  build() {
    try {
      const status = this.databaseService.getStatus();

      const header = this.buildHeader('📧 Gmail to Notion', 'Save emails to your Notion workspace');
      const statusSection = this.sectionWithHeader('📊 Status')
        .addWidget(this.keyValue('Notion Connection', status.hasApiKey ? '✅ Connected' : '❌ Not connected'))
        .addWidget(this.keyValue('Database', status.hasDatabaseId ? `✅ ${status.databaseName}` : '❌ Not selected'))
        .addWidget(this.keyValue('Email Mappings', status.hasMappings ? `✅ ${status.enabledMappings} configured` : '❌ Not configured'));

      const sections = [statusSection];

      if (status.isReady) {
        const ready = this.sectionWithHeader('🎉 Ready!')
          .addWidget(this.textParagraph('Add-on is configured and ready to save emails.'))
          .addWidget(this.buttonSet(
            this.newButton('📨 Preview Email', 'onG2NGmailMessage'),
            this.newButton('⚙️ Settings', 'showG2NSettings')
          ));
        sections.push(ready);
      } else {
        const missing = [];
        if (!status.hasApiKey) missing.push('API Key');
        if (!status.hasDatabaseId) missing.push('Database');
        if (!status.hasMappings) missing.push('Email Mappings');

        const setup = this.sectionWithHeader('🔧 Setup Required')
          .addWidget(this.textParagraph(`<b>Missing:</b> ${missing.join(', ')}`))
          .addWidget(this.buttonSet(
            this.newButton('⚙️ Settings', 'showG2NSettings'),
            status.hasApiKey ? this.newButton('🗄️ Select Database', 'showDatabaseSelection') : null
          ));
        sections.push(setup);
      }

      // Tools
      sections.push(
        this.sectionWithHeader('🔧 Tools')
          .addWidget(this.buttonSet(
            this.newButton('⚙️ Settings', 'showG2NSettings'),
            this.newButton('🔄 Refresh', 'onG2NHomepage')
          ))
      );

      return this.buildCard(header, sections);
    } catch (error) {
      this.logger.error('Homepage build failed', error);
      return buildErrorCard('Error', error.message);
    }
  }
}

/**
 * Global builder helper
 */
function buildHomepageCard() {
  const card = new HomepageCard(container, container.resolve('logger'));
  return card.build();
}
