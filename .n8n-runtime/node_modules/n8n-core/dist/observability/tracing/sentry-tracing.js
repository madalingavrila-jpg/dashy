"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentryTracing = void 0;
class SentryTracing {
    constructor(sentry) {
        this.sentry = sentry;
    }
    async startSpan(options, spanCb) {
        return await this.sentry.startSpan(options, async (span) => {
            return await spanCb(span);
        });
    }
}
exports.SentryTracing = SentryTracing;
//# sourceMappingURL=sentry-tracing.js.map