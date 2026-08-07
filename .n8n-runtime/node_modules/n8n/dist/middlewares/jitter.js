"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJitterMiddleware = void 0;
const createJitterMiddleware = (options = {}) => {
    const minMs = options.minMs ?? 100;
    const maxMs = options.maxMs ?? 300;
    return async (_req, _res, next) => {
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        await new Promise((resolve) => setTimeout(resolve, delay));
        next();
    };
};
exports.createJitterMiddleware = createJitterMiddleware;
//# sourceMappingURL=jitter.js.map