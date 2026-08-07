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
exports.MfaService = exports.MFA_CACHE_KEY = void 0;
const backend_common_1 = require("@n8n/backend-common");
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const n8n_core_1 = require("n8n-core");
const uuid_1 = require("uuid");
const invalid_mfa_code_error_1 = require("../errors/response-errors/invalid-mfa-code.error");
const invalid_mfa_recovery_code_error_1 = require("../errors/response-errors/invalid-mfa-recovery-code-error");
const constants_1 = require("./constants");
const totp_service_1 = require("./totp.service");
const cache_service_1 = require("../services/cache/cache.service");
exports.MFA_CACHE_KEY = 'mfa:enforce';
let MfaService = class MfaService {
    constructor(userRepository, settingsRepository, cacheService, license, totp, cipher, logger) {
        this.userRepository = userRepository;
        this.settingsRepository = settingsRepository;
        this.cacheService = cacheService;
        this.license = license;
        this.totp = totp;
        this.cipher = cipher;
        this.logger = logger;
    }
    async init() {
        try {
            await this.loadMFASettings();
        }
        catch (error) {
            this.logger.warn('Failed to load MFA settings', { error });
        }
    }
    generateRecoveryCodes(n = 10) {
        return Array.from(Array(n)).map(() => (0, uuid_1.v4)());
    }
    async loadMFASettings() {
        const value = (await this.settingsRepository.findByKey(constants_1.MFA_ENFORCE_SETTING))?.value;
        await this.cacheService.set(exports.MFA_CACHE_KEY, value);
        return value === 'true';
    }
    async enforceMFA(value) {
        if (!this.license.isMFAEnforcementLicensed()) {
            value = false;
        }
        await this.settingsRepository.upsert({
            key: constants_1.MFA_ENFORCE_SETTING,
            value: `${value}`,
            loadOnStartup: true,
        }, ['key']);
        await this.cacheService.set(exports.MFA_CACHE_KEY, `${value}`);
    }
    async isMFAEnforced() {
        if (!this.license.isMFAEnforcementLicensed())
            return false;
        const cachedValue = await this.cacheService.get(exports.MFA_CACHE_KEY);
        return cachedValue ? cachedValue === 'true' : await this.loadMFASettings();
    }
    async saveSecretAndRecoveryCodes(userId, secret, recoveryCodes) {
        const { encryptedSecret, encryptedRecoveryCodes } = this.encryptSecretAndRecoveryCodes(secret, recoveryCodes);
        const user = await this.userRepository.findOneByOrFail({ id: userId });
        user.mfaSecret = encryptedSecret;
        user.mfaRecoveryCodes = encryptedRecoveryCodes;
        await this.userRepository.save(user);
    }
    encryptSecretAndRecoveryCodes(rawSecret, rawRecoveryCodes) {
        const encryptedSecret = this.cipher.encrypt(rawSecret), encryptedRecoveryCodes = rawRecoveryCodes.map((code) => this.cipher.encrypt(code));
        return {
            encryptedRecoveryCodes,
            encryptedSecret,
        };
    }
    decryptSecretAndRecoveryCodes(mfaSecret, mfaRecoveryCodes) {
        return {
            decryptedSecret: this.cipher.decrypt(mfaSecret),
            decryptedRecoveryCodes: mfaRecoveryCodes.map((code) => this.cipher.decrypt(code)),
        };
    }
    async getSecretAndRecoveryCodes(userId) {
        const { mfaSecret, mfaRecoveryCodes } = await this.userRepository.findOneByOrFail({
            id: userId,
        });
        return this.decryptSecretAndRecoveryCodes(mfaSecret ?? '', mfaRecoveryCodes ?? []);
    }
    async validateMfa(userId, mfaCode, mfaRecoveryCode) {
        const user = await this.userRepository.findOneByOrFail({ id: userId });
        if (mfaCode) {
            const decryptedSecret = this.cipher.decrypt(user.mfaSecret);
            return this.totp.verifySecret({ secret: decryptedSecret, mfaCode });
        }
        if (mfaRecoveryCode) {
            const validCodes = user.mfaRecoveryCodes.map((code) => this.cipher.decrypt(code));
            const index = validCodes.indexOf(mfaRecoveryCode);
            if (index === -1)
                return false;
            validCodes.splice(index, 1);
            user.mfaRecoveryCodes = validCodes.map((code) => this.cipher.encrypt(code));
            await this.userRepository.save(user);
            return true;
        }
        return false;
    }
    async enableMfa(userId) {
        const user = await this.userRepository.findOneOrFail({
            where: { id: userId },
            relations: ['role'],
        });
        user.mfaEnabled = true;
        return await this.userRepository.save(user);
    }
    async disableMfaWithMfaCode(userId, mfaCode) {
        const isValidToken = await this.validateMfa(userId, mfaCode, undefined);
        if (!isValidToken) {
            throw new invalid_mfa_code_error_1.InvalidMfaCodeError();
        }
        await this.disableMfaForUser(userId);
    }
    async disableMfaWithRecoveryCode(userId, recoveryCode) {
        const isValidToken = await this.validateMfa(userId, undefined, recoveryCode);
        if (!isValidToken) {
            throw new invalid_mfa_recovery_code_error_1.InvalidMfaRecoveryCodeError();
        }
        await this.disableMfaForUser(userId);
    }
    async disableMfaForUser(userId) {
        await this.userRepository.update(userId, {
            mfaEnabled: false,
            mfaSecret: null,
            mfaRecoveryCodes: [],
        });
    }
};
exports.MfaService = MfaService;
exports.MfaService = MfaService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [db_1.UserRepository,
        db_1.SettingsRepository,
        cache_service_1.CacheService,
        backend_common_1.LicenseState,
        totp_service_1.TOTPService,
        n8n_core_1.Cipher,
        backend_common_1.Logger])
], MfaService);
//# sourceMappingURL=mfa.service.js.map