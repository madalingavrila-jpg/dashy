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
exports.McpSettingsService = void 0;
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const cache_service_1 = require("../../services/cache/cache.service");
const KEY = 'mcp.access.enabled';
let McpSettingsService = class McpSettingsService {
    constructor(settingsRepository, cacheService) {
        this.settingsRepository = settingsRepository;
        this.cacheService = cacheService;
    }
    async getEnabled() {
        const isMcpAccessEnabled = await this.cacheService.get(KEY);
        if (isMcpAccessEnabled !== undefined) {
            return isMcpAccessEnabled === 'true';
        }
        const row = await this.settingsRepository.findByKey(KEY);
        const enabled = row?.value === 'true';
        await this.cacheService.set(KEY, enabled.toString());
        return enabled;
    }
    async setEnabled(enabled) {
        await this.settingsRepository.upsert({ key: KEY, value: enabled.toString(), loadOnStartup: true }, ['key']);
        await this.cacheService.set(KEY, enabled.toString());
    }
};
exports.McpSettingsService = McpSettingsService;
exports.McpSettingsService = McpSettingsService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [db_1.SettingsRepository,
        cache_service_1.CacheService])
], McpSettingsService);
//# sourceMappingURL=mcp.settings.service.js.map