/**
 * @fileoverview Updated bootstrap with all services
 * @description Dependency injection container setup and service registration
 */

/**
 * Bootstrap function to initialize dependency injection container
 * @function bootstrap
 * @returns {Application} Initialized application instance
 */
function bootstrap() {
    // 1. Infrastructure Services
    container.register('logger', Logger, { singleton: true });
    container.register('cache', MemoryCache, { singleton: true });
    container.register('events', EventEmitter, { singleton: true });
    container.register('validation', ValidationService, { singleton: true });

    // 2. Repositories
    container.register('configRepo', ConfigRepository, {
        dependencies: ['logger'],
        singleton: true
    });
    container.register('mappingRepo', MappingRepository, {
        dependencies: ['configRepo', 'logger'],
        singleton: true
    });

    // 3. Adapters
    container.register('gmailAdapter', GmailAdapter, {
        dependencies: ['logger'],
        singleton: true
    });
    container.register('notionAdapter', NotionAdapter, {
        dependencies: ['logger', 'cache'],
        singleton: true
    });

    // 4. Registries and Handlers
    container.register('fieldRegistry', GmailFieldRegistry, { singleton: true });
    container.register('transformerRegistry', TransformerRegistry, { singleton: true });
    
    container.register('handlerFactory', PropertyHandlerFactory, {
        dependencies: ['fieldRegistry', 'transformerRegistry'],
        singleton: true
    });

    // 5. Services
    container.register('notionService', NotionService, {
        dependencies: ['notionAdapter', 'configRepo', 'logger'],
        singleton: true
    });

    container.register('emailService', EmailService, {
        dependencies: ['gmailAdapter', 'logger'],
        singleton: true
    });

    container.register('databaseService', DatabaseService, {
        dependencies: ['notionAdapter', 'configRepo', 'mappingRepo', 'logger'],
        singleton: true
    });

    container.register('attachmentService', AttachmentService, {
        dependencies: ['logger'],
        singleton: true
    });

    container.register('mappingService', MappingService, {
        dependencies: ['mappingRepo', 'handlerFactory', 'logger'],
        singleton: true
    });

    container.register('contentBuilder', PageContentBuilder, { singleton: true });

    // 6. Page Service (Factory pattern because it has many dependencies)
    container.registerFactory('pageService', (c) => {
        return new PageService(
            c.resolve('notionService'),
            c.resolve('mappingService'),
            c.resolve('contentBuilder'),
            c.resolve('configRepo'),
            c.resolve('logger')
        );
    });

    // 7. Workflow Executor
    container.register('workflowExecutor', WorkflowExecutor, {
        dependencies: ['emailService', 'pageService', 'events', 'logger'],
        singleton: true
    });

    // 8. Application
    container.registerFactory('app', (c) => new Application(c));

    return container.resolve('app');
}