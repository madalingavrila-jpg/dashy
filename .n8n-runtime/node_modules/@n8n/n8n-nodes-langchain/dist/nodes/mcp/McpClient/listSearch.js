"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTools = getTools;
const utils_1 = require("../shared/utils");
async function getTools(filter, paginationToken) {
    const authentication = this.getNodeParameter('authentication');
    const serverTransport = this.getNodeParameter('serverTransport');
    const endpointUrl = this.getNodeParameter('endpointUrl');
    const node = this.getNode();
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
    const result = await client.result.listTools({ cursor: paginationToken });
    const tools = filter
        ? result.tools.filter((tool) => tool.name.toLowerCase().includes(filter.toLowerCase()))
        : result.tools;
    return {
        results: tools.map((tool) => ({
            name: tool.name,
            value: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        })),
        paginationToken: result.nextCursor,
    };
}
//# sourceMappingURL=listSearch.js.map