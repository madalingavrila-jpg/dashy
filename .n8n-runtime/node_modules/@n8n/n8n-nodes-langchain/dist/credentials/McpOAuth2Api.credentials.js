"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpOAuth2Api = void 0;
class McpOAuth2Api {
    constructor() {
        this.name = 'mcpOAuth2Api';
        this.extends = ['oAuth2Api'];
        this.displayName = 'MCP OAuth2 API';
        this.documentationUrl = 'mcp';
        this.properties = [
            {
                displayName: 'Use Dynamic Client Registration',
                name: 'useDynamicClientRegistration',
                type: 'boolean',
                default: true,
            },
        ];
    }
}
exports.McpOAuth2Api = McpOAuth2Api;
//# sourceMappingURL=McpOAuth2Api.credentials.js.map