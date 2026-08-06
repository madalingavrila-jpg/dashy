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
exports.ChatHubSettingsService = void 0;
const bad_request_error_1 = require("../../errors/response-errors/bad-request.error");
const api_types_1 = require("@n8n/api-types");
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const n8n_workflow_1 = require("n8n-workflow");
const CHAT_PROVIDER_SETTINGS_KEY_PREFIX = 'chat.provider.';
const CHAT_PROVIDER_SETTINGS_KEY = (provider) => `${CHAT_PROVIDER_SETTINGS_KEY_PREFIX}${provider}`;
const CHAT_ENABLED_KEY = 'chat.access.enabled';
const getDefaultProviderSettings = (provider) => ({
    provider,
    credentialId: null,
    allowedModels: [],
    createdAt: new Date().toISOString(),
    updatedAt: null,
    enabled: true,
});
let ChatHubSettingsService = class ChatHubSettingsService {
    constructor(settingsRepository) {
        this.settingsRepository = settingsRepository;
    }
    async getEnabled() {
        const row = await this.settingsRepository.findByKey(CHAT_ENABLED_KEY);
        if (!row)
            return true;
        return row.value === 'true';
    }
    async setEnabled(enabled) {
        const value = enabled ? 'true' : 'false';
        await this.settingsRepository.upsert({ key: CHAT_ENABLED_KEY, value, loadOnStartup: true }, [
            'key',
        ]);
    }
    async ensureModelIsAllowed(model) {
        if (model.provider === 'custom-agent' || model.provider === 'n8n') {
            return;
        }
        const settings = await this.getProviderSettings(model.provider);
        if (!settings.enabled) {
            throw new bad_request_error_1.BadRequestError('Provider is not enabled');
        }
        if (settings.allowedModels.length > 0 &&
            !settings.allowedModels.some((m) => m.model === model.model)) {
            throw new bad_request_error_1.BadRequestError(`Model ${model.model} is not allowed`);
        }
        return;
    }
    async getProviderSettings(provider) {
        const settings = await this.settingsRepository.findByKey(CHAT_PROVIDER_SETTINGS_KEY(provider));
        if (!settings) {
            return getDefaultProviderSettings(provider);
        }
        return (0, n8n_workflow_1.jsonParse)(settings.value, {
            fallbackValue: getDefaultProviderSettings(provider),
        });
    }
    async getAllProviderSettings() {
        const settings = await this.settingsRepository.findByKeyPrefix(CHAT_PROVIDER_SETTINGS_KEY_PREFIX);
        const persistedByProvider = new Map();
        for (const setting of settings) {
            const parsed = (0, n8n_workflow_1.jsonParse)(setting.value);
            persistedByProvider.set(parsed.provider, parsed);
        }
        const result = {};
        for (const provider of api_types_1.chatHubLLMProviderSchema.options) {
            result[provider] = persistedByProvider.get(provider) ?? getDefaultProviderSettings(provider);
        }
        return result;
    }
    async setProviderSettings(provider, settings) {
        const value = JSON.stringify({
            ...settings,
            createdAt: settings.createdAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        await this.settingsRepository.upsert({ key: CHAT_PROVIDER_SETTINGS_KEY(provider), value, loadOnStartup: true }, ['key']);
    }
};
exports.ChatHubSettingsService = ChatHubSettingsService;
exports.ChatHubSettingsService = ChatHubSettingsService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [db_1.SettingsRepository])
], ChatHubSettingsService);
//# sourceMappingURL=chat-hub.settings.service.js.map