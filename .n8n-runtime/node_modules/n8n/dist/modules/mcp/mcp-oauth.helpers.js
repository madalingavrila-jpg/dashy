"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpOAuthHelpers = void 0;
class McpOAuthHelpers {
    static buildSuccessRedirectUrl(redirectUri, code, state) {
        const targetUrl = new URL(redirectUri);
        targetUrl.searchParams.set('code', code);
        if (state) {
            targetUrl.searchParams.set('state', state);
        }
        return targetUrl.toString();
    }
    static buildErrorRedirectUrl(redirectUri, error, errorDescription, state) {
        const targetUrl = new URL(redirectUri);
        targetUrl.searchParams.set('error', error);
        targetUrl.searchParams.set('error_description', errorDescription);
        if (state) {
            targetUrl.searchParams.set('state', state);
        }
        return targetUrl.toString();
    }
}
exports.McpOAuthHelpers = McpOAuthHelpers;
//# sourceMappingURL=mcp-oauth.helpers.js.map