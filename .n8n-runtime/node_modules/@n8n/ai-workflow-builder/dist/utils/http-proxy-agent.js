"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProxyAgent = getProxyAgent;
const proxy_from_env_1 = __importDefault(require("proxy-from-env"));
const undici_1 = require("undici");
function getProxyAgent(targetUrl) {
    const proxyUrl = proxy_from_env_1.default.getProxyForUrl(targetUrl ?? 'https://example.nonexistent/');
    if (!proxyUrl) {
        return undefined;
    }
    return new undici_1.ProxyAgent(proxyUrl);
}
//# sourceMappingURL=http-proxy-agent.js.map