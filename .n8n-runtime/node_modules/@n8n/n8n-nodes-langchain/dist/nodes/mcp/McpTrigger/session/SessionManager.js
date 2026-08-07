"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
class SessionManager {
    constructor(store) {
        this.store = store;
        this.sessions = {};
    }
    async registerSession(sessionId, server, transport, tools) {
        if (!sessionId)
            return;
        await this.store.register(sessionId);
        this.sessions[sessionId] = { sessionId, server, transport };
        if (tools) {
            this.store.setTools(sessionId, tools);
        }
    }
    async destroySession(sessionId) {
        await this.store.unregister(sessionId);
        delete this.sessions[sessionId];
    }
    getSession(sessionId) {
        return this.sessions[sessionId];
    }
    getTransport(sessionId) {
        return this.sessions[sessionId]?.transport;
    }
    getServer(sessionId) {
        return this.sessions[sessionId]?.server;
    }
    async isSessionValid(sessionId) {
        return await this.store.validate(sessionId);
    }
    getTools(sessionId) {
        return this.store.getTools(sessionId);
    }
    setTools(sessionId, tools) {
        this.store.setTools(sessionId, tools);
    }
    setStore(store) {
        this.store = store;
    }
    getStore() {
        return this.store;
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=SessionManager.js.map