"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpOAuthController = void 0;
const authorize_js_1 = require("@modelcontextprotocol/sdk/server/auth/handlers/authorize.js");
const register_js_1 = require("@modelcontextprotocol/sdk/server/auth/handlers/register.js");
const revoke_js_1 = require("@modelcontextprotocol/sdk/server/auth/handlers/revoke.js");
const token_js_1 = require("@modelcontextprotocol/sdk/server/auth/handlers/token.js");
const constants_1 = require("@n8n/constants");
const decorators_1 = require("@n8n/decorators");
const di_1 = require("@n8n/di");
const url_service_1 = require("../../services/url.service");
const mcp_oauth_service_1 = require("./mcp-oauth-service");
const mcpOAuthService = di_1.Container.get(mcp_oauth_service_1.McpOAuthService);
let McpOAuthController = class McpOAuthController {
    constructor(urlService) {
        this.urlService = urlService;
    }
    setCorsHeaders(res) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
    }
    metadataOptions(_req, res) {
        this.setCorsHeaders(res);
        res.status(204).end();
    }
    metadata(_req, res) {
        this.setCorsHeaders(res);
        const baseUrl = this.urlService.getInstanceBaseUrl();
        const metadata = {
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/mcp-oauth/authorize`,
            token_endpoint: `${baseUrl}/mcp-oauth/token`,
            registration_endpoint: `${baseUrl}/mcp-oauth/register`,
            revocation_endpoint: `${baseUrl}/mcp-oauth/revoke`,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code', 'refresh_token'],
            token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
            code_challenge_methods_supported: ['S256'],
            scopes_supported: mcp_oauth_service_1.SUPPORTED_SCOPES,
        };
        res.json(metadata);
    }
    protectedResourceMetadataOptions(_req, res) {
        this.setCorsHeaders(res);
        res.status(204).end();
    }
    protectedResourceMetadata(_req, res) {
        this.setCorsHeaders(res);
        const baseUrl = this.urlService.getInstanceBaseUrl();
        res.json({
            resource: `${baseUrl}/mcp-server/http`,
            bearer_methods_supported: ['header'],
            authorization_servers: [baseUrl],
            scopes_supported: mcp_oauth_service_1.SUPPORTED_SCOPES,
        });
    }
};
exports.McpOAuthController = McpOAuthController;
McpOAuthController.routers = [
    {
        path: '/mcp-oauth/register',
        router: (0, register_js_1.clientRegistrationHandler)({ clientsStore: mcpOAuthService.clientsStore }),
        skipAuth: true,
        ipRateLimit: { limit: 10, windowMs: 5 * constants_1.Time.minutes.toMilliseconds },
    },
    {
        path: '/mcp-oauth/authorize',
        router: (0, authorize_js_1.authorizationHandler)({ provider: mcpOAuthService }),
        skipAuth: true,
        ipRateLimit: { limit: 50, windowMs: 5 * constants_1.Time.minutes.toMilliseconds },
    },
    {
        path: '/mcp-oauth/token',
        router: (0, token_js_1.tokenHandler)({ provider: mcpOAuthService }),
        skipAuth: true,
        ipRateLimit: { limit: 20, windowMs: 5 * constants_1.Time.minutes.toMilliseconds },
    },
    {
        path: '/mcp-oauth/revoke',
        router: (0, revoke_js_1.revocationHandler)({ provider: mcpOAuthService }),
        skipAuth: true,
        ipRateLimit: { limit: 30, windowMs: 5 * constants_1.Time.minutes.toMilliseconds },
    },
];
__decorate([
    (0, decorators_1.Options)('/.well-known/oauth-authorization-server', {
        skipAuth: true,
        usesTemplates: true,
        ipRateLimit: { limit: 100, windowMs: 5 * constants_1.Time.minutes.toMilliseconds },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], McpOAuthController.prototype, "metadataOptions", null);
__decorate([
    (0, decorators_1.Get)('/.well-known/oauth-authorization-server', {
        skipAuth: true,
        usesTemplates: true,
        ipRateLimit: { limit: 100, windowMs: 5 * constants_1.Time.minutes.toMilliseconds },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], McpOAuthController.prototype, "metadata", null);
__decorate([
    (0, decorators_1.Options)('/.well-known/oauth-protected-resource/mcp-server/http', {
        skipAuth: true,
        usesTemplates: true,
        ipRateLimit: { limit: 100, windowMs: 5 * constants_1.Time.minutes.toMilliseconds },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], McpOAuthController.prototype, "protectedResourceMetadataOptions", null);
__decorate([
    (0, decorators_1.Get)('/.well-known/oauth-protected-resource/mcp-server/http', {
        skipAuth: true,
        usesTemplates: true,
        ipRateLimit: { limit: 100, windowMs: 5 * constants_1.Time.minutes.toMilliseconds },
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], McpOAuthController.prototype, "protectedResourceMetadata", null);
exports.McpOAuthController = McpOAuthController = __decorate([
    (0, decorators_1.RootLevelController)('/'),
    __metadata("design:paramtypes", [url_service_1.UrlService])
], McpOAuthController);
//# sourceMappingURL=mcp.oauth.controller.js.map