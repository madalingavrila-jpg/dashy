"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutionAlreadyResumingError = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class ExecutionAlreadyResumingError extends n8n_workflow_1.OperationalError {
    constructor(executionId) {
        super('Execution is already being resumed by another process', { extra: { executionId } });
    }
}
exports.ExecutionAlreadyResumingError = ExecutionAlreadyResumingError;
//# sourceMappingURL=execution-already-resuming.error.js.map