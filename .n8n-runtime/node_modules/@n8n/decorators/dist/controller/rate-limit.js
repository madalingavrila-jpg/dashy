"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserKeyedRateLimiter = exports.createBodyKeyedRateLimiter = void 0;
const createBodyKeyedRateLimiter = ({ limit, windowMs, field, }) => ({
    source: 'body',
    limit,
    windowMs,
    field,
});
exports.createBodyKeyedRateLimiter = createBodyKeyedRateLimiter;
const createUserKeyedRateLimiter = ({ limit, windowMs, }) => ({
    source: 'user',
    limit,
    windowMs,
});
exports.createUserKeyedRateLimiter = createUserKeyedRateLimiter;
//# sourceMappingURL=rate-limit.js.map