"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCP_LIST_TOOLS_REQUEST_MARKER = exports.McpServer = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const crypto_1 = require("crypto");
const n8n_workflow_1 = require("n8n-workflow");
const zod_to_json_schema_1 = require("zod-to-json-schema");
const ExecutionCoordinator_1 = require("./execution/ExecutionCoordinator");
const PendingCallsManager_1 = require("./execution/PendingCallsManager");
const QueuedExecutionStrategy_1 = require("./execution/QueuedExecutionStrategy");
const MessageFormatter_1 = require("./protocol/MessageFormatter");
const MessageParser_1 = require("./protocol/MessageParser");
const types_1 = require("./protocol/types");
Object.defineProperty(exports, "MCP_LIST_TOOLS_REQUEST_MARKER", { enumerable: true, get: function () { return types_1.MCP_LIST_TOOLS_REQUEST_MARKER; } });
const InMemorySessionStore_1 = require("./session/InMemorySessionStore");
const SessionManager_1 = require("./session/SessionManager");
const StreamableHttpTransport_1 = require("./transport/StreamableHttpTransport");
const TransportFactory_1 = require("./transport/TransportFactory");
class McpServer {
    constructor(logger) {
        this.resolveFunctions = {};
        this.pendingResponses = {};
        this.logger = logger;
        this.sessionManager = new SessionManager_1.SessionManager(new InMemorySessionStore_1.InMemorySessionStore());
        this.transportFactory = new TransportFactory_1.TransportFactory();
        this.pendingCallsManager = new PendingCallsManager_1.PendingCallsManager();
        this.executionCoordinator = new ExecutionCoordinator_1.ExecutionCoordinator();
        this.logger.debug('McpServer created');
    }
    static instance(logger) {
        if (!McpServer.instance_) {
            McpServer.instance_ = new McpServer(logger);
            logger.debug('Created singleton McpServer');
        }
        return McpServer.instance_;
    }
    async handleSetupRequest(_req, resp, serverName, postUrl, tools) {
        const server = this.createServer(serverName);
        const transport = this.transportFactory.createSSE(postUrl, resp);
        await this.setupSession(server, transport, tools, resp);
    }
    async handleStreamableHttpSetup(req, resp, serverName, tools) {
        const server = this.createServer(serverName);
        const transport = this.transportFactory.createStreamableHttp({
            sessionIdGenerator: () => (0, crypto_1.randomUUID)(),
            onsessioninitialized: async (sessionId) => {
                this.logger.debug(`New session initialized: ${sessionId}`);
                await this.sessionManager.registerSession(sessionId, server, transport, tools);
                transport.onclose = async () => {
                    this.logger.debug(`Deleting transport for ${sessionId}`);
                    await this.cleanupSession(sessionId);
                };
            },
        }, resp);
        this.setupHandlers(server);
        await server.connect(transport);
        await transport.handleRequest(req, resp, req.body);
        resp.flush?.();
    }
    async handlePostMessage(req, resp, tools, serverName) {
        const sessionId = this.getSessionId(req);
        let transport = sessionId ? this.sessionManager.getTransport(sessionId) : undefined;
        const rawBody = req.rawBody.toString();
        let toolCallInfo = MessageParser_1.MessageParser.extractToolCallInfo(rawBody);
        let messageId;
        if (toolCallInfo) {
            const tool = tools.find((t) => t.name === toolCallInfo.toolName);
            if (tool?.metadata?.sourceNodeName && typeof tool.metadata.sourceNodeName === 'string') {
                toolCallInfo = { ...toolCallInfo, sourceNodeName: tool.metadata.sourceNodeName };
            }
        }
        if (sessionId && !transport && req.headers['mcp-session-id'] && serverName) {
            this.logger.debug(`Recreating StreamableHTTP transport for session ${sessionId} on this main instance`);
            const recreated = await this.recreateStreamableHttpTransport(sessionId, serverName, tools, resp);
            if (!recreated) {
                resp.status(404).send('Session not found');
                return { wasToolCall: false };
            }
            transport = this.sessionManager.getTransport(sessionId);
        }
        const isToolCall = MessageParser_1.MessageParser.isToolCall(rawBody);
        const isListToolsRequest = MessageParser_1.MessageParser.isListToolsRequest(rawBody);
        if (sessionId &&
            !transport &&
            req.query.sessionId &&
            this.executionCoordinator.isQueueMode() &&
            (isToolCall || isListToolsRequest)) {
            this.logger.debug(`SSE queue mode: forwarding ${isToolCall ? 'tool call' : 'list tools'} for session ${sessionId} via pub/sub`);
            const message = (0, n8n_workflow_1.jsonParse)(rawBody);
            messageId = MessageParser_1.MessageParser.getRequestId(message);
            resp.status(202).send('Accepted');
            return {
                wasToolCall: isToolCall,
                toolCallInfo,
                messageId,
                relaySessionId: isListToolsRequest ? sessionId : undefined,
                needsListToolsRelay: isListToolsRequest,
            };
        }
        if (sessionId && transport) {
            const message = (0, n8n_workflow_1.jsonParse)(rawBody);
            messageId = MessageParser_1.MessageParser.getRequestId(message);
            const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
            this.sessionManager.setTools(sessionId, tools);
            try {
                await new Promise((resolve) => {
                    this.resolveFunctions[callId] = resolve;
                    void transport.handleRequest(req, resp, message);
                });
            }
            finally {
                delete this.resolveFunctions[callId];
            }
        }
        else {
            this.logger.warn(`No transport found for session ${sessionId}`);
            resp.status(401).send('No transport found for sessionId');
        }
        resp.flush?.();
        return {
            wasToolCall: MessageParser_1.MessageParser.isToolCall(rawBody),
            toolCallInfo,
            messageId,
        };
    }
    async handleDeleteRequest(req, resp) {
        const sessionId = this.getSessionId(req);
        if (!sessionId) {
            resp.status(400).send('No sessionId provided');
            return;
        }
        const transport = this.sessionManager.getTransport(sessionId);
        if (transport) {
            this.pendingCallsManager.cleanupBySessionId(sessionId);
            if (transport instanceof StreamableHttpTransport_1.StreamableHttpTransport) {
                await transport.handleRequest(req, resp);
                return;
            }
            resp.status(405).send('Method Not Allowed');
            return;
        }
        resp.status(404).send('Session not found');
    }
    getSessionId(req) {
        return (req.query.sessionId ?? req.headers['mcp-session-id']);
    }
    getMcpMetadata(req) {
        const sessionId = this.getSessionId(req);
        if (!sessionId)
            return undefined;
        const message = (0, n8n_workflow_1.jsonParse)(req.rawBody.toString());
        const messageId = MessageParser_1.MessageParser.getRequestId(message);
        return { sessionId, messageId: messageId ?? '' };
    }
    storePendingResponse(sessionId, messageId) {
        const transport = this.sessionManager.getTransport(sessionId);
        if (!transport) {
            this.logger.warn(`Cannot store pending response: no transport for session ${sessionId}`);
            return;
        }
        const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
        this.pendingResponses[callId] = {
            sessionId,
            messageId,
            transport,
            createdAt: new Date(),
        };
    }
    handleWorkerResponse(sessionId, messageId, result) {
        const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
        const pending = this.pendingResponses[callId];
        const isListToolsRequest = typeof result === 'object' &&
            result !== null &&
            '_listToolsRequest' in result &&
            result._listToolsRequest;
        if (isListToolsRequest) {
            const transport = this.sessionManager.getTransport(sessionId);
            if (transport && transport.transportType === 'sse' && messageId) {
                this.logger.debug(`SSE queue mode: handling relayed list tools request for session ${sessionId}`);
                const tools = this.sessionManager.getTools(sessionId) ?? [];
                const toolsList = tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(tool.schema, { removeAdditionalStrategy: 'strict' }),
                }));
                const response = {
                    jsonrpc: '2.0',
                    id: messageId,
                    result: { tools: toolsList },
                };
                void transport.send(response);
            }
            return;
        }
        const strategy = this.executionCoordinator.getStrategy();
        if (strategy instanceof QueuedExecutionStrategy_1.QueuedExecutionStrategy) {
            if (strategy.resolveToolCall(callId, result)) {
            }
            else {
                const transport = this.sessionManager.getTransport(sessionId);
                if (transport && transport.transportType === 'sse' && messageId) {
                    this.logger.debug(`SSE queue mode: sending response directly via transport for session ${sessionId}`);
                    const formattedResult = MessageFormatter_1.MessageFormatter.formatToolResult(result);
                    const response = {
                        jsonrpc: '2.0',
                        id: messageId,
                        result: formattedResult,
                    };
                    void transport.send(response);
                }
            }
        }
        if (this.resolveFunctions[callId]) {
            this.resolveFunctions[callId]();
            delete this.resolveFunctions[callId];
        }
        if (pending) {
            delete this.pendingResponses[callId];
        }
    }
    removePendingResponse(sessionId, messageId) {
        const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
        delete this.pendingResponses[callId];
    }
    hasPendingResponse(sessionId, messageId) {
        const callId = messageId ? `${sessionId}_${messageId}` : sessionId;
        return callId in this.pendingResponses;
    }
    get pendingResponseCount() {
        return Object.keys(this.pendingResponses).length;
    }
    setSessionStore(store) {
        this.sessionManager.setStore(store);
    }
    setExecutionStrategy(strategy) {
        this.executionCoordinator.setStrategy(strategy);
    }
    isQueueMode() {
        return this.executionCoordinator.isQueueMode();
    }
    getTransport(sessionId) {
        return this.sessionManager.getTransport(sessionId);
    }
    getTools(sessionId) {
        return this.sessionManager.getTools(sessionId);
    }
    getPendingCallsManager() {
        return this.pendingCallsManager;
    }
    createServer(serverName) {
        return new index_js_1.Server({ name: serverName, version: '0.1.0' }, { capabilities: { tools: {} } });
    }
    async setupSession(server, transport, tools, resp) {
        this.setupHandlers(server);
        const sessionId = transport.sessionId;
        await this.sessionManager.registerSession(sessionId, server, transport, tools);
        resp.on('close', async () => {
            this.logger.debug(`Deleting transport for ${sessionId}`);
            await this.cleanupSession(sessionId);
        });
        await server.connect(transport);
        resp.flush?.();
    }
    async cleanupSession(sessionId) {
        this.pendingCallsManager.cleanupBySessionId(sessionId);
        for (const callId of Object.keys(this.pendingResponses)) {
            if (this.pendingResponses[callId].sessionId === sessionId) {
                if (this.resolveFunctions[callId]) {
                    this.resolveFunctions[callId]();
                    delete this.resolveFunctions[callId];
                }
                delete this.pendingResponses[callId];
            }
        }
        await this.sessionManager.destroySession(sessionId);
    }
    async recreateStreamableHttpTransport(sessionId, serverName, tools, resp) {
        const isValid = await this.sessionManager.isSessionValid(sessionId);
        if (!isValid) {
            this.logger.warn(`Rejecting recreate request for invalid session: ${sessionId}`);
            return false;
        }
        const server = this.createServer(serverName);
        const transport = this.transportFactory.recreateStreamableHttp(sessionId, resp);
        await this.sessionManager.registerSession(sessionId, server, transport, tools);
        transport.onclose = async () => {
            this.logger.debug(`Deleting recreated transport for ${sessionId}`);
            await this.cleanupSession(sessionId);
        };
        this.setupHandlers(server);
        await server.connect(transport);
        return true;
    }
    setupHandlers(server) {
        server.setRequestHandler(types_js_1.ListToolsRequestSchema, (_, extra) => {
            if (!extra.sessionId) {
                throw new n8n_workflow_1.OperationalError('Require a sessionId for the listing of tools');
            }
            const tools = this.sessionManager.getTools(extra.sessionId) ?? [];
            return {
                tools: tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: (0, zod_to_json_schema_1.zodToJsonSchema)(tool.schema, {
                        removeAdditionalStrategy: 'strict',
                    }),
                })),
            };
        });
        server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request, extra) => {
            if (!request.params?.name || !request.params?.arguments) {
                throw new n8n_workflow_1.OperationalError('Require a name and arguments for the tool call');
            }
            if (!extra.sessionId) {
                throw new n8n_workflow_1.OperationalError('Require a sessionId for the tool call');
            }
            const callId = extra.requestId ? `${extra.sessionId}_${extra.requestId}` : extra.sessionId;
            const toolName = request.params.name;
            const toolArguments = typeof request.params.arguments === 'object' && request.params.arguments !== null
                ? request.params.arguments
                : {};
            const tools = this.sessionManager.getTools(extra.sessionId) ?? [];
            const requestedTool = tools.find((tool) => tool.name === toolName);
            if (!requestedTool) {
                throw new n8n_workflow_1.OperationalError('Tool not found');
            }
            try {
                if (this.executionCoordinator.isQueueMode()) {
                    const requestId = extra.requestId?.toString() ?? '';
                    this.storePendingResponse(extra.sessionId, requestId);
                    if (this.resolveFunctions[callId]) {
                        this.resolveFunctions[callId]();
                    }
                    const strategy = this.executionCoordinator.getStrategy();
                    const result = await strategy.executeTool(requestedTool, toolArguments, {
                        sessionId: extra.sessionId,
                        messageId: requestId,
                    });
                    return MessageFormatter_1.MessageFormatter.formatToolResult(result);
                }
                const result = await this.executionCoordinator.executeTool(requestedTool, toolArguments, {
                    sessionId: extra.sessionId,
                    messageId: extra.requestId?.toString(),
                });
                if (this.resolveFunctions[callId]) {
                    this.resolveFunctions[callId]();
                }
                else {
                    this.logger.warn(`No resolve function found for ${callId}`);
                }
                return MessageFormatter_1.MessageFormatter.formatToolResult(result);
            }
            catch (error) {
                this.logger.error(`Error while executing Tool ${toolName}: ${error instanceof Error ? error.message : String(error)}`);
                const errorObject = error instanceof Error ? error : new Error(String(error));
                return MessageFormatter_1.MessageFormatter.formatError(errorObject);
            }
        });
        server.onclose = () => {
            this.logger.debug('Closing MCP Server');
        };
        server.onerror = (error) => {
            this.logger.error(`MCP Error: ${error instanceof Error ? error.message : String(error)}`);
        };
    }
}
exports.McpServer = McpServer;
//# sourceMappingURL=McpServer.js.map