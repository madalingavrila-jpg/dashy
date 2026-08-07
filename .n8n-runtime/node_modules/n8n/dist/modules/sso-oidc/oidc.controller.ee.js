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
exports.OidcController = void 0;
const api_types_1 = require("@n8n/api-types");
const backend_common_1 = require("@n8n/backend-common");
const config_1 = require("@n8n/config");
const constants_1 = require("@n8n/constants");
const decorators_1 = require("@n8n/decorators");
const auth_service_1 = require("../../auth/auth.service");
const constants_2 = require("../../constants");
const bad_request_error_1 = require("../../errors/response-errors/bad-request.error");
const url_service_1 = require("../../services/url.service");
const constants_3 = require("./constants");
const oidc_service_ee_1 = require("./oidc.service.ee");
let OidcController = class OidcController {
    constructor(oidcService, authService, urlService, globalConfig, logger) {
        this.oidcService = oidcService;
        this.authService = authService;
        this.urlService = urlService;
        this.globalConfig = globalConfig;
        this.logger = logger;
    }
    async retrieveConfiguration(_req) {
        const config = await this.oidcService.loadConfig();
        if (config.clientSecret) {
            config.clientSecret = constants_3.OIDC_CLIENT_SECRET_REDACTED_VALUE;
        }
        return config;
    }
    async saveConfiguration(_req, _res, payload) {
        await this.oidcService.updateConfig(payload);
        const config = this.oidcService.getRedactedConfig();
        return config;
    }
    async redirectToAuthProvider(_req, res) {
        const authorization = await this.oidcService.generateLoginUrl();
        const { samesite, secure } = this.globalConfig.auth.cookie;
        res.cookie(constants_2.OIDC_STATE_COOKIE_NAME, authorization.state, {
            maxAge: 15 * constants_1.Time.minutes.toMilliseconds,
            httpOnly: true,
            sameSite: samesite,
            secure,
        });
        res.cookie(constants_2.OIDC_NONCE_COOKIE_NAME, authorization.nonce, {
            maxAge: 15 * constants_1.Time.minutes.toMilliseconds,
            httpOnly: true,
            sameSite: samesite,
            secure,
        });
        res.redirect(authorization.url.toString());
    }
    async callbackHandler(req, res) {
        const fullUrl = `${this.urlService.getInstanceBaseUrl()}${req.originalUrl}`;
        const callbackUrl = new URL(fullUrl);
        const state = req.cookies[constants_2.OIDC_STATE_COOKIE_NAME];
        if (typeof state !== 'string') {
            this.logger.error('State is missing');
            throw new bad_request_error_1.BadRequestError('Invalid state');
        }
        const nonce = req.cookies[constants_2.OIDC_NONCE_COOKIE_NAME];
        if (typeof nonce !== 'string') {
            this.logger.error('Nonce is missing');
            throw new bad_request_error_1.BadRequestError('Invalid nonce');
        }
        const user = await this.oidcService.loginUser(callbackUrl, state, nonce);
        res.clearCookie(constants_2.OIDC_STATE_COOKIE_NAME);
        res.clearCookie(constants_2.OIDC_NONCE_COOKIE_NAME);
        this.authService.issueCookie(res, user, true, req.browserId);
        res.redirect('/');
    }
};
exports.OidcController = OidcController;
__decorate([
    (0, decorators_1.Get)('/config'),
    (0, decorators_1.Licensed)('feat:oidc'),
    (0, decorators_1.GlobalScope)('oidc:manage'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OidcController.prototype, "retrieveConfiguration", null);
__decorate([
    (0, decorators_1.Post)('/config'),
    (0, decorators_1.Licensed)('feat:oidc'),
    (0, decorators_1.GlobalScope)('oidc:manage'),
    __param(2, decorators_1.Body),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, api_types_1.OidcConfigDto]),
    __metadata("design:returntype", Promise)
], OidcController.prototype, "saveConfiguration", null);
__decorate([
    (0, decorators_1.Get)('/login', { skipAuth: true }),
    (0, decorators_1.Licensed)('feat:oidc'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OidcController.prototype, "redirectToAuthProvider", null);
__decorate([
    (0, decorators_1.Get)('/callback', { skipAuth: true }),
    (0, decorators_1.Licensed)('feat:oidc'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OidcController.prototype, "callbackHandler", null);
exports.OidcController = OidcController = __decorate([
    (0, decorators_1.RestController)('/sso/oidc'),
    __metadata("design:paramtypes", [oidc_service_ee_1.OidcService,
        auth_service_1.AuthService,
        url_service_1.UrlService,
        config_1.GlobalConfig,
        backend_common_1.Logger])
], OidcController);
//# sourceMappingURL=oidc.controller.ee.js.map