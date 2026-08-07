"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCallTool = exports.getErrorDescriptionFromToolCall = void 0;
exports.getSelectedTools = getSelectedTools;
exports.mcpToolToDynamicTool = mcpToolToDynamicTool;
const tools_1 = require("@langchain/core/tools");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const zod_1 = require("zod");
const schemaParsing_1 = require("../../../utils/schemaParsing");
function getSelectedTools({ mode, includeTools, excludeTools, tools, }) {
    switch (mode) {
        case 'selected': {
            if (!includeTools?.length)
                return tools;
            const include = new Set(includeTools);
            return tools.filter((tool) => include.has(tool.name));
        }
        case 'except': {
            const except = new Set(excludeTools ?? []);
            return tools.filter((tool) => !except.has(tool.name));
        }
        case 'all':
        default:
            return tools;
    }
}
const getErrorDescriptionFromToolCall = (result) => {
    if (result && typeof result === 'object') {
        if ('content' in result && Array.isArray(result.content)) {
            const errorMessage = result.content.find((content) => content && typeof content === 'object' && typeof content.text === 'string')?.text;
            return errorMessage;
        }
        else if ('toolResult' in result && typeof result.toolResult === 'string') {
            return result.toolResult;
        }
        if ('message' in result && typeof result.message === 'string') {
            return result.message;
        }
    }
    return undefined;
};
exports.getErrorDescriptionFromToolCall = getErrorDescriptionFromToolCall;
const createCallTool = (name, client, timeout, onError) => async (args) => {
    let result;
    function handleError(error) {
        const errorDescription = (0, exports.getErrorDescriptionFromToolCall)(error) ?? `Failed to execute tool "${name}"`;
        onError(errorDescription);
        return errorDescription;
    }
    try {
        result = await client.callTool({ name, arguments: args }, types_js_1.CompatibilityCallToolResultSchema, {
            timeout,
        });
    }
    catch (error) {
        return handleError(error);
    }
    if (result.isError) {
        return handleError(result);
    }
    if (result.toolResult !== undefined) {
        return result.toolResult;
    }
    if (result.content !== undefined) {
        return result.content;
    }
    return result;
};
exports.createCallTool = createCallTool;
function mcpToolToDynamicTool(tool, onCallTool) {
    const rawSchema = (0, schemaParsing_1.convertJsonSchemaToZod)(tool.inputSchema);
    const objectSchema = rawSchema instanceof zod_1.z.ZodObject ? rawSchema : zod_1.z.object({ value: rawSchema });
    return new tools_1.DynamicStructuredTool({
        name: tool.name,
        description: tool.description ?? '',
        schema: objectSchema,
        func: onCallTool,
        metadata: { isFromToolkit: true },
    });
}
//# sourceMappingURL=utils.js.map