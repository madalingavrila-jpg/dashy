"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowAccessError = exports.AccessTokenNotFoundError = exports.JWTVerificationError = exports.McpExecutionTimeoutError = void 0;
const constants_1 = require("@n8n/constants");
const n8n_workflow_1 = require("n8n-workflow");
const auth_error_1 = require("../../errors/response-errors/auth.error");
class McpExecutionTimeoutError extends n8n_workflow_1.UserError {
    constructor(executionId, timeoutMs) {
        const timeoutSeconds = timeoutMs / constants_1.Time.milliseconds.toSeconds;
        super(`Workflow execution timed out after ${timeoutSeconds} seconds`);
        this.name = 'McpExecutionTimeoutError';
        this.executionId = executionId;
        this.timeoutMs = timeoutMs;
    }
}
exports.McpExecutionTimeoutError = McpExecutionTimeoutError;
class JWTVerificationError extends auth_error_1.AuthError {
    constructor() {
        super('JWT Verification Failed');
        this.name = 'JWTVerificationError';
    }
}
exports.JWTVerificationError = JWTVerificationError;
class AccessTokenNotFoundError extends auth_error_1.AuthError {
    constructor() {
        super('Access Token Not Found in Database');
        this.name = 'AccessTokenNotFoundError';
    }
}
exports.AccessTokenNotFoundError = AccessTokenNotFoundError;
class WorkflowAccessError extends n8n_workflow_1.UserError {
    constructor(message, reason) {
        super(message);
        this.name = 'WorkflowAccessError';
        this.reason = reason;
    }
}
exports.WorkflowAccessError = WorkflowAccessError;
//# sourceMappingURL=mcp.errors.js.map