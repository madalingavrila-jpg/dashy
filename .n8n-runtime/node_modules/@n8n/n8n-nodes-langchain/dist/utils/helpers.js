"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectedTools = void 0;
exports.getPromptInputByType = getPromptInputByType;
exports.getSessionId = getSessionId;
exports.serializeChatHistory = serializeChatHistory;
exports.escapeSingleCurlyBrackets = escapeSingleCurlyBrackets;
exports.unwrapNestedOutput = unwrapNestedOutput;
const tools_1 = require("@langchain/core/tools");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const zod_1 = require("zod");
const N8nTool_1 = require("./N8nTool");
const schemaParsing_1 = require("./schemaParsing");
function getPromptInputByType(options) {
    const { ctx, i, promptTypeKey, inputKey } = options;
    const promptType = ctx.getNodeParameter(promptTypeKey, i, 'define');
    let input;
    if (promptType === 'auto') {
        input = ctx.evaluateExpression('{{ $json["chatInput"] }}', i);
    }
    else if (promptType === 'guardrails') {
        input = ctx.evaluateExpression('{{ $json["guardrailsInput"] }}', i);
    }
    else {
        input = ctx.getNodeParameter(inputKey, i);
    }
    if (input === undefined) {
        if (promptType === 'auto' || promptType === 'guardrails') {
            const key = promptType === 'auto' ? 'chatInput' : 'guardrailsInput';
            throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), 'No prompt specified', {
                description: `Expected to find the prompt in an input field called '${key}' (this is what the ${promptType === 'auto' ? 'chat trigger node' : 'guardrails node'} node outputs). To use something else, change the 'Prompt' parameter`,
            });
        }
        else {
            throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), 'No prompt specified', {
                description: 'The prompt field is empty or the expression used could not be resolved. Please check the configured prompt value.',
            });
        }
    }
    return input;
}
function getSessionId(ctx, itemIndex, selectorKey = 'sessionIdType', autoSelect = 'fromInput', customKey = 'sessionKey') {
    let sessionId = '';
    const selectorType = ctx.getNodeParameter(selectorKey, itemIndex);
    if (selectorType === autoSelect) {
        if ('getBodyData' in ctx) {
            const bodyData = ctx.getBodyData() ?? {};
            sessionId = bodyData.sessionId;
        }
        else {
            sessionId = ctx.evaluateExpression('{{ $json.sessionId }}', itemIndex);
            if (!sessionId || sessionId === undefined) {
                try {
                    const chatTrigger = ctx.getChatTrigger();
                    if (chatTrigger) {
                        sessionId = ctx.evaluateExpression(`{{ $('${chatTrigger.name}').first().json.sessionId }}`, itemIndex);
                    }
                }
                catch (error) { }
            }
        }
        if (sessionId === '' || sessionId === undefined) {
            throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), 'No session ID found', {
                description: "Expected to find the session ID in an input field called 'sessionId' (this is what the chat trigger node outputs). To use something else, change the 'Session ID' parameter",
                itemIndex,
            });
        }
    }
    else {
        sessionId = ctx.getNodeParameter(customKey, itemIndex, '');
        if (sessionId === '' || sessionId === undefined) {
            throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), 'Key parameter is empty', {
                description: "Provide a key to use as session ID in the 'Key' parameter or use the 'Connected Chat Trigger Node' option to use the session ID from your Chat Trigger",
                itemIndex,
            });
        }
    }
    return sessionId;
}
function serializeChatHistory(chatHistory) {
    return chatHistory
        .map((chatMessage) => {
        if (chatMessage._getType() === 'human') {
            return `Human: ${chatMessage.content}`;
        }
        else if (chatMessage._getType() === 'ai') {
            return `Assistant: ${chatMessage.content}`;
        }
        else {
            return `${chatMessage.content}`;
        }
    })
        .join('\n');
}
function escapeSingleCurlyBrackets(text) {
    if (text === undefined)
        return undefined;
    let result = text;
    result = result
        .replace(/(?<!{){{{(?!{)/g, '{{{{')
        .replace(/(?<!})}}}(?!})/g, '}}}}')
        .replace(/(?<!{){(?!{)/g, '{{')
        .replace(/(?<!})}(?!})/g, '}}');
    return result;
}
const normalizeToolSchema = (tool) => {
    if (tool instanceof tools_1.Tool) {
        return tool;
    }
    const isZodObject = tool.schema instanceof zod_1.ZodType;
    if (tool.schema && !isZodObject) {
        tool.schema = (0, schemaParsing_1.convertJsonSchemaToZod)(tool.schema);
    }
    return tool;
};
const getConnectedTools = async (ctx, enforceUniqueNames, convertStructuredTool = true, escapeCurlyBrackets = false) => {
    const toolkitConnections = (await ctx.getInputConnectionData(n8n_workflow_1.NodeConnectionTypes.AiTool, 0));
    const parentNodes = 'getParentNodes' in ctx
        ? ctx.getParentNodes(ctx.getNode().name, {
            connectionType: n8n_workflow_1.NodeConnectionTypes.AiTool,
            depth: 1,
        })
        : [];
    const connectedTools = (toolkitConnections ?? [])
        .flatMap((toolOrToolkit, index) => {
        if (toolOrToolkit instanceof n8n_core_1.StructuredToolkit) {
            const tools = toolOrToolkit.tools;
            return tools.map((tool) => {
                const sourceNode = parentNodes[index] ?? tool.name;
                tool.metadata ??= {};
                tool.metadata.isFromToolkit = true;
                tool.metadata.sourceNodeName = sourceNode?.name;
                return tool;
            });
        }
        else {
            const sourceNode = parentNodes[index] ?? toolOrToolkit.name;
            toolOrToolkit.metadata ??= {};
            toolOrToolkit.metadata.isFromToolkit = false;
            toolOrToolkit.metadata.sourceNodeName = sourceNode?.name;
        }
        return toolOrToolkit;
    })
        .map(normalizeToolSchema);
    if (!enforceUniqueNames)
        return connectedTools;
    const seenNames = new Set();
    const finalTools = [];
    for (const tool of connectedTools) {
        const { name } = tool;
        if (seenNames.has(name)) {
            throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), `You have multiple tools with the same name: '${name}', please rename them to avoid conflicts`);
        }
        seenNames.add(name);
        if (escapeCurlyBrackets) {
            tool.description = escapeSingleCurlyBrackets(tool.description) ?? tool.description;
        }
        if (convertStructuredTool && tool instanceof N8nTool_1.N8nTool) {
            finalTools.push(tool.asDynamicTool());
        }
        else {
            finalTools.push(tool);
        }
    }
    return finalTools;
};
exports.getConnectedTools = getConnectedTools;
function unwrapNestedOutput(output) {
    if ('output' in output &&
        Object.keys(output).length === 1 &&
        typeof output.output === 'object' &&
        output.output !== null &&
        'output' in output.output &&
        Object.keys(output.output).length === 1) {
        return output.output;
    }
    return output;
}
//# sourceMappingURL=helpers.js.map