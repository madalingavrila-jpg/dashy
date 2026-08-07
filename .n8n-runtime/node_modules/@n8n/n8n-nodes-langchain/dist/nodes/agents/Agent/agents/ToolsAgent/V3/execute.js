"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolsAgentExecute = toolsAgentExecute;
const n8n_workflow_1 = require("n8n-workflow");
const helpers_1 = require("./helpers");
async function toolsAgentExecute(response) {
    this.logger.debug('Executing Tools Agent V3');
    let request = undefined;
    const returnData = [];
    const executionContext = await (0, helpers_1.buildExecutionContext)(this);
    const { items, batchSize, delayBetweenBatches, model, fallbackModel, memory } = executionContext;
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const { returnData: batchReturnData, request: batchRequest } = await (0, helpers_1.executeBatch)(this, batch, i, model, fallbackModel, memory, response);
        returnData.push.apply(returnData, batchReturnData);
        if (batchRequest) {
            if (!request) {
                request = batchRequest;
            }
            else {
                request.actions.push.apply(request.actions, batchRequest.actions);
            }
        }
        if (i + batchSize < items.length && delayBetweenBatches > 0) {
            await (0, n8n_workflow_1.sleep)(delayBetweenBatches);
        }
    }
    if (request) {
        return request;
    }
    return [returnData];
}
//# sourceMappingURL=execute.js.map