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
exports.McpServerMiddlewareService = void 0;
const di_1 = require("@n8n/di");
const n8n_workflow_1 = require("n8n-workflow");
const mcp_api_key_service_1 = require("./mcp-api-key.service");
const mcp_oauth_token_service_1 = require("./mcp-oauth-token.service");
const mcp_constants_1 = require("./mcp.constants");
const mcp_utils_1 = require("./mcp.utils");
const auth_error_1 = require("../../errors/response-errors/auth.error");
const jwt_service_1 = require("../../services/jwt.service");
const telemetry_1 = require("../../telemetry");
let McpServerMiddlewareService = class McpServerMiddlewareService {
    constructor(mcpServerApiKeyService, mcpAuthTokenService, jwtService, telemetry) {
        this.mcpServerApiKeyService = mcpServerApiKeyService;
        this.mcpAuthTokenService = mcpAuthTokenService;
        this.jwtService = jwtService;
        this.telemetry = telemetry;
    }
    async getUserForToken(token) {
        let decoded;
        try {
            decoded = this.jwtService.decode(token);
        }
        catch (error) {
            return {
                user: null,
                context: {
                    reason: 'jwt_decode_failed',
                    auth_type: 'unknown',
                    error_details: (0, n8n_workflow_1.ensureError)(error).message,
                },
            };
        }
        if (decoded?.meta?.isOAuth === true) {
            return await this.mcpAuthTokenService.verifyOAuthAccessToken(token);
        }
        return await this.mcpServerApiKeyService.verifyApiKey(token);
    }
    getAuthMiddleware() {
        return async (req, res, next) => {
            const authorizationHeader = req.header('authorization');
            if (!authorizationHeader) {
                this.responseWithUnauthorized(res, req, {
                    reason: 'missing_authorization_header',
                    auth_type: 'unknown',
                    error_details: 'Authorization header not sent',
                });
                return;
            }
            let token;
            try {
                token = this.extractBearerToken(authorizationHeader);
            }
            catch (er) {
                const error = (0, n8n_workflow_1.ensureError)(er);
                this.responseWithUnauthorized(res, req, {
                    reason: 'invalid_bearer_format',
                    auth_type: 'unknown',
                    error_details: error.message,
                });
                return;
            }
            const result = await this.getUserForToken(token);
            const user = result.user;
            if (!user) {
                this.responseWithUnauthorized(res, req, result.context);
                return;
            }
            req.user = user;
            next();
        };
    }
    extractBearerToken(headerValue) {
        if (!headerValue.startsWith('Bearer')) {
            throw new auth_error_1.AuthError('Invalid authorization header format - Missing Bearer prefix');
        }
        const tokenMatch = headerValue.match(/^Bearer\s+(.+)$/i);
        if (tokenMatch) {
            return tokenMatch[1];
        }
        throw new auth_error_1.AuthError('Invalid authorization header format - Malformed Bearer token');
    }
    responseWithUnauthorized(res, req, context) {
        this.trackUnauthorizedEvent(req, context);
        res.header('WWW-Authenticate', 'Bearer realm="n8n MCP Server"');
        res.status(401).send({
            message: `${mcp_constants_1.UNAUTHORIZED_ERROR_MESSAGE}${context?.error_details ? ': ' + context.error_details : ''}`,
        });
    }
    trackUnauthorizedEvent(req, context) {
        const clientInfo = (0, mcp_utils_1.getClientInfo)(req);
        const payload = {
            mcp_connection_status: 'error',
            error: mcp_constants_1.UNAUTHORIZED_ERROR_MESSAGE,
            client_name: clientInfo?.name,
            client_version: clientInfo?.version,
            ...context,
        };
        this.telemetry.track(mcp_constants_1.USER_CONNECTED_TO_MCP_EVENT, payload);
    }
};
exports.McpServerMiddlewareService = McpServerMiddlewareService;
exports.McpServerMiddlewareService = McpServerMiddlewareService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [mcp_api_key_service_1.McpServerApiKeyService,
        mcp_oauth_token_service_1.McpOAuthTokenService,
        jwt_service_1.JwtService,
        telemetry_1.Telemetry])
], McpServerMiddlewareService);
//# sourceMappingURL=mcp-server-middleware.service.js.map