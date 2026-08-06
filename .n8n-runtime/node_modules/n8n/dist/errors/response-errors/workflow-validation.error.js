"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowValidationError = void 0;
const bad_request_error_1 = require("./bad-request.error");
class WorkflowValidationError extends bad_request_error_1.BadRequestError {
    constructor(message) {
        super(message);
        this.meta = { validationError: true };
        this.name = 'WorkflowValidationError';
    }
}
exports.WorkflowValidationError = WorkflowValidationError;
//# sourceMappingURL=workflow-validation.error.js.map