"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingCallsManager = void 0;
class PendingCallsManager {
    constructor() {
        this.pendingCalls = {};
    }
    async waitForResult(callId, toolName, args, timeoutMs) {
        return await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                if (this.pendingCalls[callId]) {
                    this.reject(callId, new Error('Worker tool execution timeout'));
                }
            }, timeoutMs);
            this.pendingCalls[callId] = {
                toolName,
                arguments: args,
                resolve,
                reject,
                timer,
            };
        });
    }
    resolve(callId, result) {
        const pending = this.pendingCalls[callId];
        if (pending) {
            clearTimeout(pending.timer);
            pending.resolve(result);
            delete this.pendingCalls[callId];
            return true;
        }
        return false;
    }
    reject(callId, error) {
        const pending = this.pendingCalls[callId];
        if (pending) {
            clearTimeout(pending.timer);
            pending.reject(error);
            delete this.pendingCalls[callId];
            return true;
        }
        return false;
    }
    get(callId) {
        return this.pendingCalls[callId];
    }
    has(callId) {
        return callId in this.pendingCalls;
    }
    remove(callId) {
        delete this.pendingCalls[callId];
    }
    cleanupBySessionId(sessionId) {
        for (const callId of Object.keys(this.pendingCalls)) {
            if (callId.startsWith(`${sessionId}_`)) {
                const pending = this.pendingCalls[callId];
                if (pending) {
                    clearTimeout(pending.timer);
                    pending.resolve(undefined);
                }
                delete this.pendingCalls[callId];
            }
        }
    }
}
exports.PendingCallsManager = PendingCallsManager;
//# sourceMappingURL=PendingCallsManager.js.map