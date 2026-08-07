"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCP_SESSION_ID_HEADER = void 0;
exports.createMockResponse = createMockResponse;
exports.createMockRequest = createMockRequest;
exports.createMockRequestWithSessionId = createMockRequestWithSessionId;
exports.createValidToolCallMessage = createValidToolCallMessage;
exports.createListToolsMessage = createListToolsMessage;
exports.createMockRequestWithHeaderSessionId = createMockRequestWithHeaderSessionId;
exports.MCP_SESSION_ID_HEADER = 'mcp-session-id';
function createMockResponse() {
    const response = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        end: jest.fn().mockReturnThis(),
        write: jest.fn().mockReturnThis(),
        writeHead: jest.fn().mockReturnThis(),
        setHeader: jest.fn().mockReturnThis(),
        getHeader: jest.fn(),
        flush: jest.fn(),
        on: jest.fn().mockReturnThis(),
        once: jest.fn().mockReturnThis(),
        removeListener: jest.fn().mockReturnThis(),
        emit: jest.fn().mockReturnValue(true),
        headersSent: false,
    };
    return response;
}
function createMockRequest(options = {}) {
    const { sessionId, body = {}, rawBody = '{}', headers = {}, query = {}, method = 'POST', path = '/mcp', } = options;
    const finalQuery = { ...query };
    const finalHeaders = { ...headers };
    if (sessionId) {
        if (!query.sessionId && !headers[exports.MCP_SESSION_ID_HEADER]) {
            finalQuery.sessionId = sessionId;
        }
    }
    return {
        body,
        rawBody: Buffer.from(rawBody),
        headers: finalHeaders,
        query: finalQuery,
        method,
        params: {},
        url: path,
        path,
        get: jest.fn((name) => finalHeaders[name.toLowerCase()]),
    };
}
function createMockRequestWithSessionId(sessionId, rawBody) {
    return createMockRequest({
        sessionId,
        rawBody,
        query: { sessionId },
    });
}
function createValidToolCallMessage(toolName, args, id = 1) {
    return JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: {
            name: toolName,
            arguments: args,
        },
    });
}
function createListToolsMessage(id = 1) {
    return JSON.stringify({
        jsonrpc: '2.0',
        id,
        method: 'tools/list',
    });
}
function createMockRequestWithHeaderSessionId(sessionId, rawBody = '{}') {
    return createMockRequest({
        rawBody,
        headers: { [exports.MCP_SESSION_ID_HEADER]: sessionId },
        query: {},
    });
}
//# sourceMappingURL=mock-express.js.map