"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMcpSupportedTrigger = exports.getToolArguments = exports.getToolName = exports.getClientInfo = void 0;
const mcp_constants_1 = require("./mcp.constants");
const mcp_typeguards_1 = require("./mcp.typeguards");
const getClientInfo = (req) => {
    let clientInfo;
    if ((0, mcp_typeguards_1.isJSONRPCRequest)(req.body) && req.body.params?.clientInfo) {
        clientInfo = req.body.params.clientInfo;
    }
    return clientInfo;
};
exports.getClientInfo = getClientInfo;
const getToolName = (body) => {
    if (!(0, mcp_typeguards_1.isJSONRPCRequest)(body))
        return 'unknown';
    if (!body.params)
        return 'unknown';
    const { name } = body.params;
    if (typeof name === 'string') {
        return name;
    }
    return 'unknown';
};
exports.getToolName = getToolName;
const getToolArguments = (body) => {
    if (!(0, mcp_typeguards_1.isJSONRPCRequest)(body))
        return {};
    if (!body.params)
        return {};
    const { arguments: args } = body.params;
    if ((0, mcp_typeguards_1.isRecord)(args)) {
        return args;
    }
    return {};
};
exports.getToolArguments = getToolArguments;
const findMcpSupportedTrigger = (nodes) => {
    const triggerNodeTypes = Object.keys(mcp_constants_1.SUPPORTED_MCP_TRIGGERS);
    return nodes.find((node) => triggerNodeTypes.includes(node.type) && !node.disabled);
};
exports.findMcpSupportedTrigger = findMcpSupportedTrigger;
//# sourceMappingURL=mcp.utils.js.map