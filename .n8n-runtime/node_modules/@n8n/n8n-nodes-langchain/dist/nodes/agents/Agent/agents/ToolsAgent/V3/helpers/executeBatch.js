"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeBatch = executeBatch;
const n8n_workflow_1 = require("n8n-workflow");
const agent_execution_1 = require("../../../../../../../utils/agent-execution");
const N8nOutputParser_1 = require("../../../../../../../utils/output_parsers/N8nOutputParser");
const createAgentSequence_1 = require("./createAgentSequence");
const finalizeResult_1 = require("./finalizeResult");
const prepareItemContext_1 = require("./prepareItemContext");
const runAgent_1 = require("./runAgent");
const checkMaxIterations_1 = require("./checkMaxIterations");
async function executeBatch(ctx, batch, startIndex, model, fallbackModel, memory, response) {
    const returnData = [];
    let request = undefined;
    const hitlResult = (0, agent_execution_1.processHitlResponses)(response, startIndex);
    if (hitlResult.hasApprovedHitlTools && hitlResult.pendingGatedToolRequest) {
        return {
            returnData: [],
            request: hitlResult.pendingGatedToolRequest,
        };
    }
    const processedResponse = hitlResult.processedResponse;
    const maxIterations = ctx.getNodeParameter('options.maxIterations', 0, 10);
    (0, n8n_workflow_1.assertParamIsNumber)('options.maxIterations', maxIterations, ctx.getNode());
    const batchPromises = batch.map(async (_item, batchItemIndex) => {
        const itemIndex = startIndex + batchItemIndex;
        (0, checkMaxIterations_1.checkMaxIterations)(response, maxIterations, ctx.getNode());
        const itemContext = await (0, prepareItemContext_1.prepareItemContext)(ctx, itemIndex, processedResponse);
        const { tools, prompt, options, outputParser } = itemContext;
        const executor = (0, createAgentSequence_1.createAgentSequence)(model, tools, prompt, options, outputParser, memory, fallbackModel);
        return await (0, runAgent_1.runAgent)(ctx, executor, itemContext, model, memory, processedResponse);
    });
    const batchResults = await Promise.allSettled(batchPromises);
    const outputParser = await (0, N8nOutputParser_1.getOptionalOutputParser)(ctx, 0);
    batchResults.forEach((result, index) => {
        const itemIndex = startIndex + index;
        if (result.status === 'rejected') {
            const error = result.reason;
            if (ctx.continueOnFail()) {
                returnData.push({
                    json: { error: error.message },
                    pairedItem: { item: itemIndex },
                });
                return;
            }
            else {
                throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), error);
            }
        }
        const batchResult = result.value;
        if (!batchResult) {
            return;
        }
        if ('actions' in batchResult) {
            if (!request) {
                request = {
                    actions: batchResult.actions,
                    metadata: batchResult.metadata,
                };
            }
            else {
                request.actions.push.apply(request.actions, batchResult.actions);
            }
            return;
        }
        const itemResult = (0, finalizeResult_1.finalizeResult)(batchResult, itemIndex, memory, outputParser);
        returnData.push(itemResult);
    });
    return { returnData, request };
}
//# sourceMappingURL=executeBatch.js.map