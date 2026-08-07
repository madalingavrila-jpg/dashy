"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToolParameters = getToolParameters;
const n8n_workflow_1 = require("n8n-workflow");
const utils_1 = require("./utils");
const utils_2 = require("../shared/utils");
async function getToolParameters() {
    const toolId = this.getNodeParameter('tool', 0, {
        extractValue: true,
    });
    const authentication = this.getNodeParameter('authentication');
    const serverTransport = this.getNodeParameter('serverTransport');
    const endpointUrl = this.getNodeParameter('endpointUrl');
    const node = this.getNode();
    const { headers } = await (0, utils_2.getAuthHeaders)(this, authentication);
    const client = await (0, utils_2.connectMcpClient)({
        serverTransport,
        endpointUrl,
        headers,
        name: node.type,
        version: node.typeVersion,
        onUnauthorized: async (headers) => await (0, utils_2.tryRefreshOAuth2Token)(this, authentication, headers),
    });
    if (!client.ok) {
        throw (0, utils_2.mapToNodeOperationError)(node, client.error);
    }
    const result = await (0, utils_2.getAllTools)(client.result);
    const tool = result.find((tool) => tool.name === toolId);
    if (!tool) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Tool not found');
    }
    const fields = (0, utils_1.convertJsonSchemaToResourceMapperFields)(tool.inputSchema);
    return {
        fields,
    };
}
//# sourceMappingURL=resourceMapping.js.map