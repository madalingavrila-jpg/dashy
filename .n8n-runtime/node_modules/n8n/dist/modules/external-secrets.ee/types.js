"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretsProvider = void 0;
class SecretsProvider {
    constructor() {
        this.state = 'initializing';
        this.stateHistory = [];
    }
    async connect() {
        this.setState('connecting');
        try {
            await this.doConnect();
            this.setState('connected');
        }
        catch (error) {
            const typedError = error instanceof Error ? error : new Error(String(error));
            this.setState('error', typedError);
        }
    }
    setState(newState, error) {
        const oldState = this.state;
        if (oldState === newState)
            return;
        this.stateHistory.push({
            from: oldState,
            to: newState,
            at: new Date(),
            error,
        });
        this.state = newState;
    }
    get hasEverBeenConnected() {
        return this.stateHistory.some((t) => t.to === 'connected');
    }
    get canPerformOperations() {
        return this.state === 'connected';
    }
}
exports.SecretsProvider = SecretsProvider;
//# sourceMappingURL=types.js.map