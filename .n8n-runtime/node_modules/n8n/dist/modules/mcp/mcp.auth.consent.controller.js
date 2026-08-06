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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpConsentController = void 0;
const backend_common_1 = require("@n8n/backend-common");
const decorators_1 = require("@n8n/decorators");
const approve_consent_request_dto_1 = require("./dto/approve-consent-request.dto");
const mcp_oauth_consent_service_1 = require("./mcp-oauth-consent.service");
const oauth_session_service_1 = require("./oauth-session.service");
let McpConsentController = class McpConsentController {
    constructor(logger, consentService, oauthSessionService) {
        this.logger = logger;
        this.consentService = consentService;
        this.oauthSessionService = oauthSessionService;
    }
    async getConsentDetails(req, res) {
        try {
            const sessionToken = this.getAndValidateSessionToken(req, res);
            if (!sessionToken)
                return;
            const consentDetails = await this.consentService.getConsentDetails(sessionToken);
            if (!consentDetails) {
                this.sendInvalidSessionError(res, true);
                return;
            }
            res.json({
                data: {
                    clientName: consentDetails.clientName,
                    clientId: consentDetails.clientId,
                },
            });
        }
        catch (error) {
            this.logger.error('Failed to get consent details', { error });
            this.oauthSessionService.clearSession(res);
            this.sendErrorResponse(res, 500, 'Failed to load authorization details');
        }
    }
    async approveConsent(req, res, payload) {
        try {
            const sessionToken = this.getAndValidateSessionToken(req, res);
            if (!sessionToken)
                return;
            const result = await this.consentService.handleConsentDecision(sessionToken, req.user.id, payload.approved);
            this.oauthSessionService.clearSession(res);
            res.json({
                data: {
                    status: 'success',
                    redirectUrl: result.redirectUrl,
                },
            });
        }
        catch (error) {
            this.logger.error('Failed to process consent', { error });
            this.oauthSessionService.clearSession(res);
            const message = error instanceof Error ? error.message : 'Failed to process authorization';
            this.sendErrorResponse(res, 500, message);
        }
    }
    sendErrorResponse(res, statusCode, message) {
        res.status(statusCode).json({
            status: 'error',
            message,
        });
    }
    sendInvalidSessionError(res, clearCookie = false) {
        if (clearCookie) {
            this.oauthSessionService.clearSession(res);
        }
        this.sendErrorResponse(res, 400, 'Invalid or expired authorization session');
    }
    getAndValidateSessionToken(req, res) {
        const sessionToken = this.oauthSessionService.getSessionToken(req.cookies);
        if (!sessionToken) {
            this.sendInvalidSessionError(res);
            return null;
        }
        try {
            this.oauthSessionService.verifySession(sessionToken);
            return sessionToken;
        }
        catch (error) {
            this.logger.debug('Invalid session token', { error });
            this.sendInvalidSessionError(res, true);
            return null;
        }
    }
};
exports.McpConsentController = McpConsentController;
__decorate([
    (0, decorators_1.Get)('/details', { usesTemplates: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], McpConsentController.prototype, "getConsentDetails", null);
__decorate([
    (0, decorators_1.Post)('/approve', { usesTemplates: true }),
    __param(2, decorators_1.Body),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, approve_consent_request_dto_1.ApproveConsentRequestDto]),
    __metadata("design:returntype", Promise)
], McpConsentController.prototype, "approveConsent", null);
exports.McpConsentController = McpConsentController = __decorate([
    (0, decorators_1.RestController)('/consent'),
    __metadata("design:paramtypes", [backend_common_1.Logger,
        mcp_oauth_consent_service_1.McpOAuthConsentService,
        oauth_session_service_1.OAuthSessionService])
], McpConsentController);
//# sourceMappingURL=mcp.auth.consent.controller.js.map