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
exports.McpOAuthAuthorizationCodeService = void 0;
const constants_1 = require("@n8n/constants");
const di_1 = require("@n8n/di");
const node_crypto_1 = require("node:crypto");
const oauth_authorization_code_repository_1 = require("./database/repositories/oauth-authorization-code.repository");
let McpOAuthAuthorizationCodeService = class McpOAuthAuthorizationCodeService {
    constructor(authorizationCodeRepository) {
        this.authorizationCodeRepository = authorizationCodeRepository;
        this.AUTHORIZATION_CODE_EXPIRY_MS = 10 * constants_1.Time.minutes.toMilliseconds;
    }
    async createAuthorizationCode(clientId, userId, redirectUri, codeChallenge, state) {
        const code = (0, node_crypto_1.randomBytes)(32).toString('hex');
        await this.authorizationCodeRepository.insert({
            code,
            clientId,
            userId,
            redirectUri,
            codeChallenge,
            codeChallengeMethod: 'S256',
            state,
            expiresAt: Date.now() + this.AUTHORIZATION_CODE_EXPIRY_MS,
            used: false,
        });
        return code;
    }
    async findAndValidateAuthorizationCode(authorizationCode, clientId) {
        const authRecord = await this.authorizationCodeRepository.findOne({
            where: {
                code: authorizationCode,
                clientId,
            },
        });
        if (!authRecord) {
            throw new Error('Invalid authorization code');
        }
        if (authRecord.expiresAt < Date.now()) {
            await this.authorizationCodeRepository.remove(authRecord);
            throw new Error('Authorization code expired');
        }
        return authRecord;
    }
    async validateAndConsumeAuthorizationCode(authorizationCode, clientId, redirectUri) {
        const authRecord = await this.findAndValidateAuthorizationCode(authorizationCode, clientId);
        if (redirectUri && authRecord.redirectUri !== redirectUri) {
            throw new Error('Redirect URI mismatch');
        }
        const result = await this.authorizationCodeRepository.update({ code: authorizationCode, used: false }, { used: true });
        const numAffected = result.affected ?? 0;
        if (numAffected < 1) {
            throw new Error('Authorization code already used');
        }
        authRecord.used = true;
        return authRecord;
    }
    async getCodeChallenge(authorizationCode, clientId) {
        const authRecord = await this.findAndValidateAuthorizationCode(authorizationCode, clientId);
        return authRecord.codeChallenge;
    }
};
exports.McpOAuthAuthorizationCodeService = McpOAuthAuthorizationCodeService;
exports.McpOAuthAuthorizationCodeService = McpOAuthAuthorizationCodeService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [oauth_authorization_code_repository_1.AuthorizationCodeRepository])
], McpOAuthAuthorizationCodeService);
//# sourceMappingURL=mcp-oauth-authorization-code.service.js.map