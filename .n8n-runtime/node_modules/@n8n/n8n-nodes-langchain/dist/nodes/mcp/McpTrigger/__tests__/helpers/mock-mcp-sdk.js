"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockServer = createMockServer;
exports.createMockTransport = createMockTransport;
function createMockServer() {
    return {
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        setRequestHandler: jest.fn(),
        onclose: undefined,
        onerror: undefined,
    };
}
function createMockTransport(sessionId, transportType = 'sse') {
    return {
        transportType,
        sessionId,
        send: jest.fn().mockResolvedValue(undefined),
        handleRequest: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        onclose: undefined,
    };
}
//# sourceMappingURL=mock-mcp-sdk.js.map