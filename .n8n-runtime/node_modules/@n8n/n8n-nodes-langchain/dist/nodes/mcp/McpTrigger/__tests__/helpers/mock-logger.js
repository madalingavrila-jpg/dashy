"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockLogger = createMockLogger;
function createMockLogger() {
    return {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        trace: jest.fn(),
        log: jest.fn(),
        verbose: jest.fn(),
        scoped: jest.fn().mockReturnThis(),
    };
}
//# sourceMappingURL=mock-logger.js.map