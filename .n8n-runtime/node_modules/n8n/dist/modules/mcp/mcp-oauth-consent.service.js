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
exports.McpOAuthConsentService = void 0;
const backend_common_1 = require("@n8n/backend-common");
const di_1 = require("@n8n/di");
const n8n_workflow_1 = require("n8n-workflow");
const oauth_client_repository_1 = require("./database/repositories/oauth-client.repository");
const oauth_user_consent_repository_1 = require("./database/repositories/oauth-user-consent.repository");
const mcp_oauth_authorization_code_service_1 = require("./mcp-oauth-authorization-code.service");
const mcp_oauth_helpers_1 = require("./mcp-oauth.helpers");
const oauth_session_service_1 = require("./oauth-session.service");
let McpOAuthConsentService = class McpOAuthConsentService {
    constructor(logger, oauthSessionService, oauthClientRepository, userConsentRepository, authorizationCodeService) {
        this.logger = logger;
        this.oauthSessionService = oauthSessionService;
        this.oauthClientRepository = oauthClientRepository;
        this.userConsentRepository = userConsentRepository;
        this.authorizationCodeService = authorizationCodeService;
    }
    async getConsentDetails(sessionToken) {
        try {
            const sessionPayload = this.oauthSessionService.verifySession(sessionToken);
            const client = await this.oauthClientRepository.findOne({
                where: { id: sessionPayload.clientId },
            });
            if (!client) {
                return null;
            }
            return {
                clientName: client.name,
                clientId: client.id,
            };
        }
        catch (error) {
            this.logger.error('Error getting consent details', { error });
            return null;
        }
    }
    async handleConsentDecision(sessionToken, userId, approved) {
        let sessionPayload;
        try {
            sessionPayload = this.oauthSessionService.verifySession(sessionToken);
        }
        catch (error) {
            throw new n8n_workflow_1.UserError('Invalid or expired session');
        }
        if (!approved) {
            const redirectUrl = mcp_oauth_helpers_1.McpOAuthHelpers.buildErrorRedirectUrl(sessionPayload.redirectUri, 'access_denied', 'User denied the authorization request', sessionPayload.state);
            this.logger.info('Consent denied', {
                clientId: sessionPayload.clientId,
                userId,
            });
            return { redirectUrl };
        }
        await this.userConsentRepository.insert({
            userId,
            clientId: sessionPayload.clientId,
            grantedAt: Date.now(),
        });
        const code = await this.authorizationCodeService.createAuthorizationCode(sessionPayload.clientId, userId, sessionPayload.redirectUri, sessionPayload.codeChallenge, sessionPayload.state);
        const successRedirectUrl = mcp_oauth_helpers_1.McpOAuthHelpers.buildSuccessRedirectUrl(sessionPayload.redirectUri, code, sessionPayload.state);
        this.logger.info('Consent approved', {
            clientId: sessionPayload.clientId,
            userId,
        });
        return { redirectUrl: successRedirectUrl };
    }
};
exports.McpOAuthConsentService = McpOAuthConsentService;
exports.McpOAuthConsentService = McpOAuthConsentService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [backend_common_1.Logger,
        oauth_session_service_1.OAuthSessionService,
        oauth_client_repository_1.OAuthClientRepository,
        oauth_user_consent_repository_1.UserConsentRepository,
        mcp_oauth_authorization_code_service_1.McpOAuthAuthorizationCodeService])
], McpOAuthConsentService);
//# sourceMappingURL=mcp-oauth-consent.service.js.map