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
exports.McpOAuthService = exports.SUPPORTED_SCOPES = void 0;
const backend_common_1 = require("@n8n/backend-common");
const di_1 = require("@n8n/di");
const oauth_client_repository_1 = require("./database/repositories/oauth-client.repository");
const oauth_user_consent_repository_1 = require("./database/repositories/oauth-user-consent.repository");
const mcp_oauth_authorization_code_service_1 = require("./mcp-oauth-authorization-code.service");
const mcp_oauth_token_service_1 = require("./mcp-oauth-token.service");
const oauth_session_service_1 = require("./oauth-session.service");
exports.SUPPORTED_SCOPES = ['tool:listWorkflows', 'tool:getWorkflowDetails'];
let McpOAuthService = class McpOAuthService {
    constructor(logger, oauthSessionService, oauthClientRepository, tokenService, authorizationCodeService, userConsentRepository) {
        this.logger = logger;
        this.oauthSessionService = oauthSessionService;
        this.oauthClientRepository = oauthClientRepository;
        this.tokenService = tokenService;
        this.authorizationCodeService = authorizationCodeService;
        this.userConsentRepository = userConsentRepository;
    }
    get clientsStore() {
        return {
            getClient: async (clientId) => {
                const client = await this.oauthClientRepository.findOneBy({ id: clientId });
                if (!client) {
                    return undefined;
                }
                return {
                    client_id: client.id,
                    client_name: client.name,
                    redirect_uris: client.redirectUris,
                    grant_types: client.grantTypes,
                    token_endpoint_auth_method: client.tokenEndpointAuthMethod,
                    ...(client.clientSecret && { client_secret: client.clientSecret }),
                    ...(client.clientSecretExpiresAt && {
                        client_secret_expires_at: client.clientSecretExpiresAt,
                    }),
                    response_types: ['code'],
                    scope: exports.SUPPORTED_SCOPES.join(' '),
                    logo_uri: undefined,
                    tos_uri: undefined,
                };
            },
            registerClient: async (client) => {
                try {
                    await this.oauthClientRepository.insert({
                        id: client.client_id,
                        name: client.client_name,
                        redirectUris: client.redirect_uris,
                        grantTypes: client.grant_types,
                        clientSecret: client.client_secret ?? null,
                        clientSecretExpiresAt: client.client_secret_expires_at ?? null,
                        tokenEndpointAuthMethod: client.token_endpoint_auth_method ?? 'none',
                    });
                }
                catch (error) {
                    this.logger.error('Error registering OAuth client', {
                        error,
                        clientId: client.client_id,
                    });
                }
                return client;
            },
        };
    }
    async authorize(client, params, res) {
        this.logger.debug('Starting OAuth authorization', { clientId: client.client_id });
        try {
            this.oauthSessionService.createSession(res, {
                clientId: client.client_id,
                redirectUri: params.redirectUri,
                codeChallenge: params.codeChallenge,
                state: params.state ?? null,
            });
            res.redirect('/oauth/consent');
        }
        catch (error) {
            this.logger.error('Error in authorize method', { error, clientId: client.client_id });
            this.oauthSessionService.clearSession(res);
            res.status(500).json({ error: 'server_error', error_description: 'Internal server error' });
        }
    }
    async challengeForAuthorizationCode(client, authorizationCode) {
        return await this.authorizationCodeService.getCodeChallenge(authorizationCode, client.client_id);
    }
    async exchangeAuthorizationCode(client, authorizationCode, _codeVerifier, redirectUri) {
        const authRecord = await this.authorizationCodeService.validateAndConsumeAuthorizationCode(authorizationCode, client.client_id, redirectUri);
        const { accessToken, refreshToken } = this.tokenService.generateTokenPair(authRecord.userId, client.client_id);
        await this.tokenService.saveTokenPair(accessToken, refreshToken, client.client_id, authRecord.userId);
        this.logger.info('Authorization code exchanged for tokens', {
            clientId: client.client_id,
            userId: authRecord.userId,
        });
        return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: refreshToken,
        };
    }
    async exchangeRefreshToken(client, refreshToken, _scopes) {
        return await this.tokenService.validateAndRotateRefreshToken(refreshToken, client.client_id);
    }
    async verifyAccessToken(token) {
        return await this.tokenService.verifyAccessToken(token);
    }
    async revokeToken(client, request) {
        const { token, token_type_hint } = request;
        if (!token_type_hint || token_type_hint === 'access_token') {
            const revoked = await this.tokenService.revokeAccessToken(token, client.client_id);
            if (revoked) {
                return;
            }
        }
        if (!token_type_hint || token_type_hint === 'refresh_token') {
            const revoked = await this.tokenService.revokeRefreshToken(token, client.client_id);
            if (revoked) {
                return;
            }
        }
        this.logger.debug('Token revocation requested for unknown token', {
            clientId: client.client_id,
        });
    }
    async getAllClients(userId) {
        const userConsents = await this.userConsentRepository.findByUserWithClient(userId);
        return userConsents.map((consent) => {
            const { clientSecret, clientSecretExpiresAt, ...sanitizedClient } = consent.client;
            return sanitizedClient;
        });
    }
    async deleteClient(clientId) {
        const client = await this.oauthClientRepository.findOne({
            where: { id: clientId },
        });
        if (!client) {
            throw new Error(`OAuth client with ID ${clientId} not found`);
        }
        this.logger.info('Deleting OAuth client and related data', { clientId });
        await this.oauthClientRepository.delete({ id: clientId });
        this.logger.info('OAuth client deleted successfully', {
            clientId,
            clientName: client.name,
        });
    }
};
exports.McpOAuthService = McpOAuthService;
exports.McpOAuthService = McpOAuthService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [backend_common_1.Logger,
        oauth_session_service_1.OAuthSessionService,
        oauth_client_repository_1.OAuthClientRepository,
        mcp_oauth_token_service_1.McpOAuthTokenService,
        mcp_oauth_authorization_code_service_1.McpOAuthAuthorizationCodeService,
        oauth_user_consent_repository_1.UserConsentRepository])
], McpOAuthService);
//# sourceMappingURL=mcp-oauth-service.js.map