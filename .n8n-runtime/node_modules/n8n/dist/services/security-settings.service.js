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
exports.SecuritySettingsService = void 0;
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const permissions_1 = require("@n8n/permissions");
const role_service_1 = require("../services/role.service");
let SecuritySettingsService = class SecuritySettingsService {
    constructor(settingsRepository, roleService, workflowRepository, sharedWorkflowRepository, sharedCredentialsRepository) {
        this.settingsRepository = settingsRepository;
        this.roleService = roleService;
        this.workflowRepository = workflowRepository;
        this.sharedWorkflowRepository = sharedWorkflowRepository;
        this.sharedCredentialsRepository = sharedCredentialsRepository;
        this.PERSONAL_OWNER_ROLE_SLUG = 'project:personalOwner';
    }
    async setPersonalSpaceSetting(setting, enabled) {
        await this.settingsRepository.upsert({
            key: setting.key,
            value: enabled.toString(),
            loadOnStartup: true,
        }, ['key']);
        if (enabled) {
            await this.roleService.addScopesToRole(this.PERSONAL_OWNER_ROLE_SLUG, setting.scopes);
        }
        else {
            await this.roleService.removeScopesFromRole(this.PERSONAL_OWNER_ROLE_SLUG, setting.scopes);
        }
    }
    async arePersonalSpaceSettingsEnabled() {
        const settingKeys = [permissions_1.PERSONAL_SPACE_PUBLISHING_SETTING.key, permissions_1.PERSONAL_SPACE_SHARING_SETTING.key];
        const rows = await this.settingsRepository.findByKeys(settingKeys);
        const personalSpacePublishingValue = rows.find((r) => r.key === permissions_1.PERSONAL_SPACE_PUBLISHING_SETTING.key)?.value;
        const personalSpaceSharingValue = rows.find((r) => r.key === permissions_1.PERSONAL_SPACE_SHARING_SETTING.key)?.value;
        return {
            personalSpacePublishing: personalSpacePublishingValue !== 'false',
            personalSpaceSharing: personalSpaceSharingValue !== 'false',
        };
    }
    async getPublishedPersonalWorkflowsCount() {
        return await this.workflowRepository.getPublishedPersonalWorkflowsCount();
    }
    async getSharedPersonalWorkflowsCount() {
        return await this.sharedWorkflowRepository.getSharedPersonalWorkflowsCount();
    }
    async getSharedPersonalCredentialsCount() {
        return await this.sharedCredentialsRepository.getSharedPersonalCredentialsCount();
    }
};
exports.SecuritySettingsService = SecuritySettingsService;
exports.SecuritySettingsService = SecuritySettingsService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [db_1.SettingsRepository,
        role_service_1.RoleService,
        db_1.WorkflowRepository,
        db_1.SharedWorkflowRepository,
        db_1.SharedCredentialsRepository])
], SecuritySettingsService);
//# sourceMappingURL=security-settings.service.js.map