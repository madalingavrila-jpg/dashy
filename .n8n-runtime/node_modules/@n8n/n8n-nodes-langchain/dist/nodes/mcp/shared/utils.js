"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTools = getAllTools;
exports.mapToNodeOperationError = mapToNodeOperationError;
exports.connectMcpClient = connectMcpClient;
exports.getAuthHeaders = getAuthHeaders;
exports.tryRefreshOAuth2Token = tryRefreshOAuth2Token;
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const sse_js_1 = require("@modelcontextprotocol/sdk/client/sse.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const n8n_workflow_1 = require("n8n-workflow");
const ai_utilities_1 = require("@n8n/ai-utilities");
async function getAllTools(client, cursor) {
    const { tools, nextCursor } = await client.listTools({ cursor });
    if (nextCursor) {
        return tools.concat(await getAllTools(client, nextCursor));
    }
    return tools;
}
function safeCreateUrl(url, baseUrl) {
    try {
        return (0, n8n_workflow_1.createResultOk)(new URL(url, baseUrl));
    }
    catch (error) {
        return (0, n8n_workflow_1.createResultError)(error);
    }
}
function normalizeAndValidateUrl(input) {
    const withProtocol = !/^https?:\/\//i.test(input) ? `https://${input}` : input;
    const parsedUrl = safeCreateUrl(withProtocol);
    if (!parsedUrl.ok) {
        return (0, n8n_workflow_1.createResultError)(parsedUrl.error);
    }
    return parsedUrl;
}
function errorHasCode(error, code) {
    return (!!error &&
        typeof error === 'object' &&
        (('code' in error && Number(error.code) === code) ||
            ('message' in error &&
                typeof error.message === 'string' &&
                error.message.includes(code.toString()))));
}
function isUnauthorizedError(error) {
    return errorHasCode(error, 401);
}
function isForbiddenError(error) {
    return errorHasCode(error, 403);
}
function mapToNodeOperationError(node, error) {
    switch (error.type) {
        case 'invalid_url':
            return new n8n_workflow_1.NodeOperationError(node, error.error, {
                message: 'Could not connect to your MCP server. The provided URL is invalid.',
            });
        case 'auth':
            return new n8n_workflow_1.NodeOperationError(node, error.error, {
                message: 'Could not connect to your MCP server. Authentication failed.',
                description: error.error.message,
            });
        case 'connection':
        default:
            return new n8n_workflow_1.NodeOperationError(node, error.error, {
                message: 'Could not connect to your MCP server',
                description: error.error.message,
            });
    }
}
async function connectMcpClient({ headers, serverTransport, endpointUrl, name, version, onUnauthorized, }) {
    const endpoint = normalizeAndValidateUrl(endpointUrl);
    if (!endpoint.ok) {
        return (0, n8n_workflow_1.createResultError)({ type: 'invalid_url', error: endpoint.error });
    }
    const client = new index_js_1.Client({ name, version: version.toString() }, { capabilities: {} });
    if (serverTransport === 'httpStreamable') {
        try {
            const transport = new streamableHttp_js_1.StreamableHTTPClientTransport(endpoint.result, {
                requestInit: { headers },
                fetch: ai_utilities_1.proxyFetch,
            });
            await client.connect(transport);
            return (0, n8n_workflow_1.createResultOk)(client);
        }
        catch (error) {
            if (onUnauthorized && isUnauthorizedError(error)) {
                const newHeaders = await onUnauthorized(headers);
                if (newHeaders) {
                    return await connectMcpClient({
                        headers: newHeaders,
                        serverTransport,
                        endpointUrl,
                        name,
                        version,
                    });
                }
            }
            if (isUnauthorizedError(error) || isForbiddenError(error)) {
                return (0, n8n_workflow_1.createResultError)({ type: 'auth', error: error });
            }
            else {
                return (0, n8n_workflow_1.createResultError)({ type: 'connection', error: error });
            }
        }
    }
    try {
        const sseTransport = new sse_js_1.SSEClientTransport(endpoint.result, {
            eventSourceInit: {
                fetch: async (url, init) => await (0, ai_utilities_1.proxyFetch)(url, {
                    ...init,
                    headers: {
                        ...headers,
                        Accept: 'text/event-stream',
                    },
                }),
            },
            fetch: ai_utilities_1.proxyFetch,
            requestInit: { headers },
        });
        await client.connect(sseTransport);
        return (0, n8n_workflow_1.createResultOk)(client);
    }
    catch (error) {
        if (onUnauthorized && isUnauthorizedError(error)) {
            const newHeaders = await onUnauthorized(headers);
            if (newHeaders) {
                return await connectMcpClient({
                    headers: newHeaders,
                    serverTransport,
                    endpointUrl,
                    name,
                    version,
                });
            }
        }
        if (isUnauthorizedError(error) || isForbiddenError(error)) {
            return (0, n8n_workflow_1.createResultError)({ type: 'auth', error: error });
        }
        else {
            return (0, n8n_workflow_1.createResultError)({ type: 'connection', error: error });
        }
    }
}
async function getAuthHeaders(ctx, authentication) {
    switch (authentication) {
        case 'headerAuth': {
            const header = await ctx
                .getCredentials('httpHeaderAuth')
                .catch(() => null);
            if (!header)
                return {};
            return { headers: { [header.name]: header.value } };
        }
        case 'bearerAuth': {
            const result = await ctx
                .getCredentials('httpBearerAuth')
                .catch(() => null);
            if (!result)
                return {};
            return { headers: { Authorization: `Bearer ${result.token}` } };
        }
        case 'mcpOAuth2Api': {
            const result = await ctx
                .getCredentials('mcpOAuth2Api')
                .catch(() => null);
            if (!result)
                return {};
            return { headers: { Authorization: `Bearer ${result.oauthTokenData.access_token}` } };
        }
        case 'multipleHeadersAuth': {
            const result = await ctx
                .getCredentials('httpMultipleHeadersAuth')
                .catch(() => null);
            if (!result)
                return {};
            return {
                headers: result.headers.values.reduce((acc, cur) => {
                    acc[cur.name] = cur.value;
                    return acc;
                }, {}),
            };
        }
        case 'none':
        default: {
            return {};
        }
    }
}
async function tryRefreshOAuth2Token(ctx, authentication, headers) {
    if (authentication !== 'mcpOAuth2Api') {
        return null;
    }
    let access_token = null;
    try {
        const result = (await ctx.helpers.refreshOAuth2Token.call(ctx, 'mcpOAuth2Api'));
        access_token = result?.access_token;
    }
    catch (error) {
        return null;
    }
    if (!access_token) {
        return null;
    }
    if (!headers) {
        return {
            Authorization: `Bearer ${access_token}`,
        };
    }
    return {
        ...headers,
        Authorization: `Bearer ${access_token}`,
    };
}
//# sourceMappingURL=utils.js.map