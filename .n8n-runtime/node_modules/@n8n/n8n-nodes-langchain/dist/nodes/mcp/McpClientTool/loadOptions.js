"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTools = getTools;
const utils_1 = require("../shared/utils");
async function getTools() {
    const authentication = this.getNodeParameter('authentication');
    const node = this.getNode();
    let serverTransport;
    let endpointUrl;
    if (node.typeVersion === 1) {
        serverTransport = 'sse';
        endpointUrl = this.getNodeParameter('sseEndpoint');
    }
    else {
        serverTransport = this.getNodeParameter('serverTransport');
        endpointUrl = this.getNodeParameter('endpointUrl');
    }
    const { headers } = await (0, utils_1.getAuthHeaders)(this, authentication);
    const client = await (0, utils_1.connectMcpClient)({
        serverTransport,
        endpointUrl,
        headers,
        name: node.type,
        version: node.typeVersion,
        onUnauthorized: async (headers) => await (0, utils_1.tryRefreshOAuth2Token)(this, authentication, headers),
    });
    if (!client.ok) {
        throw (0, utils_1.mapToNodeOperationError)(node, client.error);
    }
    const tools = await (0, utils_1.getAllTools)(client.result);
    return tools.map((tool) => ({
        name: tool.name,
        value: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
    }));
}
//# sourceMappingURL=loadOptions.js.map