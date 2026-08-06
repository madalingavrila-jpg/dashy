"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSteps = buildSteps;
const messages_1 = require("@langchain/core/messages");
const n8n_workflow_1 = require("n8n-workflow");
function extractProviderMetadata(metadata) {
    if (!metadata)
        return {};
    const thoughtSignature = typeof metadata.google?.thoughtSignature === 'string'
        ? metadata.google.thoughtSignature
        : undefined;
    const thinkingContent = typeof metadata.anthropic?.thinkingContent === 'string'
        ? metadata.anthropic.thinkingContent
        : undefined;
    const thinkingType = metadata.anthropic?.thinkingType === 'thinking' ||
        metadata.anthropic?.thinkingType === 'redacted_thinking'
        ? metadata.anthropic.thinkingType
        : undefined;
    const thinkingSignature = typeof metadata.anthropic?.thinkingSignature === 'string'
        ? metadata.anthropic.thinkingSignature
        : undefined;
    return {
        thoughtSignature,
        thinkingContent,
        thinkingType,
        thinkingSignature,
    };
}
function buildAnthropicContentBlocks(thinkingContent, thinkingType, thinkingSignature, toolInput, toolId, toolName) {
    const thinkingBlock = thinkingType === 'thinking'
        ? {
            type: 'thinking',
            thinking: thinkingContent,
            signature: thinkingSignature ?? '',
        }
        : {
            type: 'redacted_thinking',
            data: thinkingContent,
        };
    const toolInputData = toolInput.input;
    const toolUseBlock = {
        type: 'tool_use',
        id: toolId,
        name: toolName,
        input: toolInputData && typeof toolInputData === 'object'
            ? toolInputData
            : {},
    };
    return [thinkingBlock, toolUseBlock];
}
function buildMessageContent(providerMetadata, toolInput, toolId, toolName) {
    const { thinkingContent, thinkingType, thinkingSignature } = providerMetadata;
    if (thinkingContent && thinkingType) {
        return buildAnthropicContentBlocks(thinkingContent, thinkingType, thinkingSignature, toolInput, toolId, toolName);
    }
    return `Calling ${toolName} with input: ${JSON.stringify(toolInput)}`;
}
function resolveToolName(tool) {
    return tool.action.metadata?.hitl?.toolName ?? (0, n8n_workflow_1.nodeNameToToolName)(tool.action.nodeName);
}
function buildGeminiAdditionalKwargs(toolCalls, thoughtSignature) {
    const signatures = ['', thoughtSignature];
    for (let i = 2; i <= toolCalls.length; i++) {
        signatures.push('');
    }
    return {
        __gemini_function_call_thought_signatures__: {
            [toolCalls[0].id]: thoughtSignature,
        },
        tool_calls: toolCalls.map((tc) => ({ id: tc.id, name: tc.name, args: tc.args })),
        signatures,
    };
}
function buildIndividualAIMessage(toolId, toolName, toolInput, providerMetadata) {
    const toolCall = {
        id: toolId,
        name: toolName,
        args: toolInput,
        type: 'tool_call',
    };
    const content = buildMessageContent(providerMetadata, toolInput, toolId, toolName);
    return new messages_1.AIMessage({
        content,
        ...(typeof content === 'string' && { tool_calls: [toolCall] }),
        ...(providerMetadata.thoughtSignature && {
            additional_kwargs: buildGeminiAdditionalKwargs([{ id: toolId, name: toolName, args: toolInput }], providerMetadata.thoughtSignature),
        }),
    });
}
function buildSharedGeminiAIMessage(processedTools, thoughtSignature) {
    const allToolCalls = processedTools.map((pt) => ({
        id: pt.toolId,
        name: pt.toolName,
        args: pt.toolInput,
        type: 'tool_call',
    }));
    const toolNames = processedTools.map((pt) => pt.nodeName).join(', ');
    return new messages_1.AIMessage({
        content: `Calling tools: ${toolNames}`,
        tool_calls: allToolCalls,
        additional_kwargs: buildGeminiAdditionalKwargs(allToolCalls, thoughtSignature),
    });
}
function buildObservation(toolData) {
    const aiToolData = toolData?.data?.ai_tool?.[0]?.map((item) => item?.json);
    if (aiToolData && aiToolData.length > 0) {
        return JSON.stringify(aiToolData);
    }
    if (toolData?.error) {
        const errorInfo = {
            error: toolData.error.message ?? 'Unknown error',
            ...(toolData.error.name && { errorType: toolData.error.name }),
        };
        return JSON.stringify(errorInfo);
    }
    return JSON.stringify('');
}
function buildSteps(response, itemIndex) {
    const steps = [];
    if (!response)
        return steps;
    const responses = response.actionResponses ?? [];
    if (response.metadata?.previousRequests) {
        steps.push(...response.metadata.previousRequests);
    }
    const batchTools = [];
    for (const tool of responses) {
        if (tool.action?.metadata?.itemIndex !== itemIndex)
            continue;
        const toolInput = {
            ...tool.action.input,
            id: tool.action.id,
        };
        if (!tool.data)
            continue;
        const existingStep = steps.find((s) => s.action.toolCallId === toolInput.id);
        if (existingStep)
            continue;
        const providerMetadata = extractProviderMetadata(tool.action.metadata);
        const toolId = typeof toolInput?.id === 'string' ? toolInput.id : 'reconstructed_call';
        const toolName = resolveToolName(tool);
        batchTools.push({
            tool,
            toolInput,
            toolId,
            toolName,
            nodeName: tool.action.nodeName,
            providerMetadata,
        });
    }
    const sharedThoughtSignature = batchTools.find((bt) => bt.providerMetadata.thoughtSignature)
        ?.providerMetadata.thoughtSignature;
    const sharedAIMessage = sharedThoughtSignature && batchTools.length > 1
        ? buildSharedGeminiAIMessage(batchTools, sharedThoughtSignature)
        : undefined;
    for (let i = 0; i < batchTools.length; i++) {
        const { tool, toolInput, toolId, toolName, nodeName, providerMetadata } = batchTools[i];
        const observation = buildObservation(tool.data);
        const { id, log, type, ...toolInputForResult } = toolInput;
        const messageLog = sharedAIMessage
            ? i === 0
                ? [sharedAIMessage]
                : []
            : [buildIndividualAIMessage(toolId, toolName, toolInput, providerMetadata)];
        steps.push({
            action: {
                tool: toolName,
                toolInput: toolInputForResult,
                log: toolInput.log || (messageLog[0]?.content ?? `Calling ${nodeName}`),
                messageLog,
                toolCallId: toolInput?.id,
                type: toolInput.type || 'tool_call',
            },
            observation,
        });
    }
    return steps;
}
//# sourceMappingURL=buildSteps.js.map