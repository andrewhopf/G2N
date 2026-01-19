/**
 * @fileoverview Main workflow executor
 * @description Orchestrates the email-to-Notion workflow
 * 
 * @class WorkflowExecutor
 */
class WorkflowExecutor {
    /**
     * @constructor
     * @param {EmailService} emailService - Email service
     * @param {PageService} pageService - Page service
     * @param {AttachmentPageService} attachmentPageService - Attachment page service
     * @param {EventEmitter} events - Event emitter
     * @param {Logger} logger - Logger instance
     */
    constructor(emailService, pageService, attachmentPageService, events, logger) {
        /** @private */
        this._email = emailService;
        /** @private */
        this._pageService = pageService;
        /** @private */
        this._attachmentPageService = attachmentPageService;
        /** @private */
        this._events = events;
        /** @private */
        this._logger = logger;
    }

    /**
     * Execute workflow for message ID
     * @param {string} messageId - Gmail message ID
     * @param {boolean} skipDuplicateCheck - Skip duplicate check (allow re-save)
     * @returns {WorkflowResult} Workflow execution result
     */
    execute(messageId, skipDuplicateCheck = false) {
        const startTime = Date.now();
        const steps = [];

        this._logger.section('WORKFLOW', `Processing email: ${messageId}`);
        this._events.emit(AppEvents.WORKFLOW_STARTED, { messageId });

        try {
            // ========== STEP 1: Extract Email ==========
            this._logger.info('Step 1: Extracting email data...');
            const emailData = this._email.extractById(messageId);
            
            if (!emailData) {
                throw new EmailError('Failed to extract email data', messageId, 'extraction');
            }
            
            steps.push(
                new StepResult('extract', true, Date.now() - startTime, { 
                    subject: emailData.subject 
                })
            );
            this._events.emit(AppEvents.EMAIL_EXTRACTED, emailData);
            this._logger.info('✅ Email extracted', { subject: emailData.subject });

            // ⚠️ NOTE: DUPLICATE CHECK IS NOW ONLY IN EmailPreviewCard.build()
            // We don't check here - we just save

            // ========== STEP 2: Create Notion Page ==========
            this._logger.info('Step 2: Creating Notion page...');
            this._events.emit(AppEvents.PAGE_CREATING, { 
                emailId: emailData.messageId 
            });
            
            const page = this._pageService.createPageFromEmail(emailData);
            steps.push(new StepResult('create', true, Date.now() - startTime, {
            id: page && page.id ? page.id : null,
            url: page && page.url ? page.url : null
            }));
                        
            this._events.emit(AppEvents.PAGE_CREATED, page);
            this._logger.info('✅ Page created successfully', { url: page.url });
            
            // ========== STEP 3: Save Attachments (if configured) ==========
            let attachmentResult = { created: 0, skipped: 0, pages: [] };
            try {
                attachmentResult = this._attachmentPageService.createPagesFromEmail(emailData);
                this._logger.info('✅ Attachments saved', {
                    created: attachmentResult.created,
                    skipped: attachmentResult.skipped
                });
            } catch (attachError) {
                this._logger.warn('Attachment save failed (non-fatal)', attachError);
            }

            const duration = Date.now() - startTime;
            this._events.emit(AppEvents.WORKFLOW_COMPLETED, { page, duration });
            
            return WorkflowResult.success('Email saved to Notion!', {
                pageId: page.id,
                pageUrl: page.url,
                emailId: messageId,
                subject: emailData.subject,
                isDuplicate: false,
                attachmentsSaved: attachmentResult.created || 0
            });
            
        } catch (error) {
            const duration = Date.now() - startTime;
            this._logger.error('Workflow failed', error);
            this._events.emit(AppEvents.WORKFLOW_FAILED, { error, duration });
            return WorkflowResult.fromError(error);
        }
    }

    /**
     * Execute for currently selected email
     * @returns {WorkflowResult} Workflow execution result
     */
    executeForSelected() {
        const emailData = this._email.getSelectedEmail();
        if (!emailData) {
            return WorkflowResult.failure('No email selected', [
                'Please select an email first'
            ]);
        }
        return this.execute(emailData.messageId);
    }
}
