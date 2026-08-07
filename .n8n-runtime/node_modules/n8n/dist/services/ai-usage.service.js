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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiUsageService = void 0;
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const config_1 = __importDefault(require("../config"));
const cache_service_1 = require("../services/cache/cache.service");
const KEY = 'ai.allowSendingParameterValues';
let AiUsageService = class AiUsageService {
    constructor(settingsRepository, cacheService) {
        this.settingsRepository = settingsRepository;
        this.cacheService = cacheService;
    }
    async getAiUsageSettings() {
        const allowSendingParameterValues = await this.cacheService.get(KEY);
        if (allowSendingParameterValues !== undefined) {
            return allowSendingParameterValues === 'true';
        }
        const row = await this.settingsRepository.findByKey(KEY);
        const allowSending = (row?.value ?? 'true') === 'true';
        await this.cacheService.set(KEY, allowSending.toString());
        return allowSending;
    }
    async updateAiUsageSettings(allowSendingActualData) {
        await this.settingsRepository.upsert({ key: KEY, value: allowSendingActualData.toString(), loadOnStartup: true }, ['key']);
        await this.cacheService.set(KEY, allowSendingActualData.toString());
        config_1.default.set(KEY, allowSendingActualData);
    }
};
exports.AiUsageService = AiUsageService;
exports.AiUsageService = AiUsageService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [db_1.SettingsRepository,
        cache_service_1.CacheService])
], AiUsageService);
//# sourceMappingURL=ai-usage.service.js.map