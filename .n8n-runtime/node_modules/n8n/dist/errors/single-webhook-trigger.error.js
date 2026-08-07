"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleWebhookTriggerError = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class SingleWebhookTriggerError extends n8n_workflow_1.UserError {
    constructor(triggerName) {
        super(`Because of limitations in ${triggerName}, n8n can't listen for test executions at the same time as listening for production ones. Unpublish the workflow to execute.`, { extra: { triggerName } });
    }
}
exports.SingleWebhookTriggerError = SingleWebhookTriggerError;
//# sourceMappingURL=single-webhook-trigger.error.js.map