"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_MCP_TRIGGERS = exports.MCP_ACCESS_DISABLED_ERROR_MESSAGE = exports.INTERNAL_SERVER_ERROR_MESSAGE = exports.UNAUTHORIZED_ERROR_MESSAGE = exports.USER_CALLED_MCP_TOOL_EVENT = exports.USER_CONNECTED_TO_MCP_EVENT = void 0;
const n8n_workflow_1 = require("n8n-workflow");
exports.USER_CONNECTED_TO_MCP_EVENT = 'User connected to MCP server';
exports.USER_CALLED_MCP_TOOL_EVENT = 'User called mcp tool';
exports.UNAUTHORIZED_ERROR_MESSAGE = 'Unauthorized';
exports.INTERNAL_SERVER_ERROR_MESSAGE = 'Internal server error';
exports.MCP_ACCESS_DISABLED_ERROR_MESSAGE = 'MCP access is disabled';
exports.SUPPORTED_MCP_TRIGGERS = {
    [n8n_workflow_1.SCHEDULE_TRIGGER_NODE_TYPE]: 'Schedule Trigger',
    [n8n_workflow_1.WEBHOOK_NODE_TYPE]: 'Webhook Trigger',
    [n8n_workflow_1.FORM_TRIGGER_NODE_TYPE]: 'Form Trigger',
    [n8n_workflow_1.CHAT_TRIGGER_NODE_TYPE]: 'Chat Trigger',
};
//# sourceMappingURL=mcp.constants.js.map