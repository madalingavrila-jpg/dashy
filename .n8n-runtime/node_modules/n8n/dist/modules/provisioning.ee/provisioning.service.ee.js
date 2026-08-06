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
exports.ProvisioningService = void 0;
const api_types_1 = require("@n8n/api-types");
const backend_common_1 = require("@n8n/backend-common");
const config_1 = require("@n8n/config");
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const n8n_workflow_1 = require("n8n-workflow");
const constants_1 = require("./constants");
const typeorm_1 = require("@n8n/typeorm");
const decorators_1 = require("@n8n/decorators");
const event_service_1 = require("../../events/event.service");
const publisher_service_1 = require("../../scaling/pubsub/publisher.service");
const bad_request_error_1 = require("../../errors/response-errors/bad-request.error");
const zod_1 = require("zod");
const project_service_ee_1 = require("../../services/project.service.ee");
const n8n_core_1 = require("n8n-core");
const user_service_1 = require("../../services/user.service");
let ProvisioningService = class ProvisioningService {
    constructor(eventService, globalConfig, settingsRepository, projectRepository, projectService, roleRepository, userRepository, userService, logger, publisher, instanceSettings) {
        this.eventService = eventService;
        this.globalConfig = globalConfig;
        this.settingsRepository = settingsRepository;
        this.projectRepository = projectRepository;
        this.projectService = projectService;
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.logger = logger;
        this.publisher = publisher;
        this.instanceSettings = instanceSettings;
    }
    async init() {
        this.provisioningConfig = await this.loadConfig();
    }
    async getConfig() {
        if (!this.provisioningConfig) {
            this.provisioningConfig = await this.loadConfig();
        }
        return this.provisioningConfig;
    }
    async provisionInstanceRoleForUser(user, roleSlug) {
        if (!(await this.isInstanceRoleProvisioningEnabled())) {
            return;
        }
        const globalOwnerRoleSlug = 'global:owner';
        if (typeof roleSlug !== 'string') {
            this.logger.warn(`skipping instance role provisioning. Invalid role type: expected string, received ${typeof roleSlug}`, {
                userId: user.id,
                roleSlug,
            });
            return;
        }
        let dbRole;
        try {
            dbRole = await this.roleRepository.findOneOrFail({ where: { slug: roleSlug } });
        }
        catch (error) {
            this.logger.warn(`Skipping instance role provisioning, a role matching the slug ${roleSlug} was not found`, { userId: user.id, roleSlug, error });
            return;
        }
        if (dbRole.roleType !== 'global') {
            this.logger.warn(`Skipping instance role provisioning. Role ${roleSlug} is not a global role`, { userId: user.id, roleSlug });
            return;
        }
        if (user.role.slug === globalOwnerRoleSlug && dbRole.slug !== globalOwnerRoleSlug) {
            const otherOwners = await this.userRepository.count({
                where: { role: { slug: globalOwnerRoleSlug }, id: (0, typeorm_1.Not)(user.id) },
            });
            if (otherOwners === 0) {
                this.logger.warn(`Skipping instance role provisioning. Cannot remove last owner role: ${globalOwnerRoleSlug} from user: ${user.id}`, { userId: user.id, roleSlug });
                return;
            }
        }
        if (user.role.slug !== dbRole.slug) {
            await this.userService.changeUserRole(user, { newRoleName: dbRole.slug });
            this.eventService.emit('sso-user-instance-role-updated', {
                userId: user.id,
                role: dbRole.slug,
            });
        }
    }
    async provisionProjectRolesForUser(userId, projectIdToRoles) {
        if (!(await this.isProjectRolesProvisioningEnabled())) {
            return;
        }
        if (!Array.isArray(projectIdToRoles)) {
            this.logger.warn(`Skipping project role provisioning. Invalid projectIdToRole type: expected array, received ${typeof projectIdToRoles}`, { userId, projectIdToRoles });
            return;
        }
        let projectRoleMap;
        try {
            projectRoleMap = {};
            for (const entry of projectIdToRoles) {
                if (typeof entry !== 'string') {
                    this.logger.warn(`Skipping invalid project role mapping entry. Expected string, received ${typeof entry}.`, { userId, entry });
                    continue;
                }
                const [projectId, roleSlugSuffix] = entry.split(':');
                if (!projectId || !roleSlugSuffix) {
                    this.logger.warn(`Skipping invalid project role mapping entry. Expected format "projectId:displayName", received "${entry}".`, { userId, entry });
                    continue;
                }
                projectRoleMap[projectId] = `project:${roleSlugSuffix}`;
            }
        }
        catch (error) {
            this.logger.warn('Skipping project role provisioning. Failed to parse project to role mapping.', { userId, projectIdToRoles });
            return;
        }
        const projectIds = Object.keys(projectRoleMap);
        const roleSlugs = [...new Set(Object.values(projectRoleMap))];
        if (projectIds.length === 0) {
            return;
        }
        const [existingProjects, existingRoles] = await Promise.all([
            this.projectRepository.find({
                where: { id: (0, typeorm_1.In)(projectIds), type: (0, typeorm_1.Not)('personal') },
                select: ['id'],
            }),
            this.roleRepository.find({
                where: {
                    slug: (0, typeorm_1.In)(roleSlugs),
                    roleType: 'project',
                },
                select: ['displayName', 'slug'],
            }),
        ]);
        const existingProjectIds = new Set(existingProjects.map((project) => project.id));
        const validProjectToRoleMappings = [];
        for (const [projectId, roleSlug] of Object.entries(projectRoleMap)) {
            if (!existingProjectIds.has(projectId)) {
                this.logger.warn(`Skipped provisioning project role for project with ID ${projectId}, because project does not exist or is a personal project.`, { userId, projectId, roleSlug });
                continue;
            }
            const role = existingRoles.find((role) => role.slug === roleSlug);
            if (!role) {
                this.logger.warn(`Skipping project role provisioning for role with slug ${roleSlug}, because role does not exist or is not specific to projects.`, { userId, projectId, roleSlug });
                continue;
            }
            validProjectToRoleMappings.push({ projectId, roleSlug: role.slug });
        }
        if (validProjectToRoleMappings.length === 0) {
            this.logger.warn('Skipping project role provisioning altogether. No valid project to role mappings found.', { userId, projectRoleMap });
            return;
        }
        const currentlyAccessibleProjects = await this.projectRepository.find({
            where: {
                type: (0, typeorm_1.Not)('personal'),
                projectRelations: {
                    userId,
                },
            },
            relations: ['projectRelations'],
        });
        const validProjectIds = new Set(validProjectToRoleMappings.map((m) => m.projectId));
        const projectsToRemoveAccessFrom = currentlyAccessibleProjects.filter((project) => !validProjectIds.has(project.id));
        await this.projectRepository.manager.transaction(async (tx) => {
            for (const project of projectsToRemoveAccessFrom) {
                await tx.delete(db_1.ProjectRelation, { projectId: project.id, userId });
            }
            for (const { projectId, roleSlug } of validProjectToRoleMappings) {
                await this.projectService.addUser(projectId, { userId, role: roleSlug }, tx);
            }
        });
        this.eventService.emit('sso-user-project-access-updated', {
            projectsAdded: validProjectIds.size,
            projectsRemoved: projectsToRemoveAccessFrom.length,
            userId,
        });
    }
    async patchConfig(rawConfig) {
        let patchConfig;
        try {
            patchConfig = api_types_1.ProvisioningConfigPatchDto.parse(rawConfig);
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                throw new bad_request_error_1.BadRequestError(error.message);
            }
            throw error;
        }
        const currentConfig = await this.getConfig();
        const supportedPatchFields = [
            'scopesProvisionInstanceRole',
            'scopesProvisionProjectRoles',
            'scopesName',
            'scopesInstanceRoleClaimName',
            'scopesProjectsRolesClaimName',
        ];
        const updatedConfig = {
            ...currentConfig,
            ...patchConfig,
        };
        for (const supportedPatchField of supportedPatchFields) {
            if (patchConfig[supportedPatchField] === null) {
                delete updatedConfig[supportedPatchField];
            }
        }
        api_types_1.ProvisioningConfigDto.parse(updatedConfig);
        await this.settingsRepository.upsert({
            key: constants_1.PROVISIONING_PREFERENCES_DB_KEY,
            value: JSON.stringify(updatedConfig),
            loadOnStartup: true,
        }, { conflictPaths: ['key'] });
        this.provisioningConfig = await this.loadConfig();
        if (this.instanceSettings.isMultiMain) {
            await this.publisher.publishCommand({ command: 'reload-sso-provisioning-configuration' });
        }
        return await this.getConfig();
    }
    async handleReloadSsoProvisioningConfiguration() {
        this.provisioningConfig = await this.loadConfig();
    }
    async loadConfigurationFromDatabase() {
        const configFromDB = await this.settingsRepository.findByKey(constants_1.PROVISIONING_PREFERENCES_DB_KEY);
        if (configFromDB) {
            try {
                const configValue = (0, n8n_workflow_1.jsonParse)(configFromDB.value);
                return api_types_1.ProvisioningConfigDto.parse(configValue);
            }
            catch (error) {
                this.logger.warn('Failed to load Provisioning configuration from database, falling back to default configuration.', { error });
            }
        }
        return undefined;
    }
    async loadConfig() {
        const envProvidedConfig = api_types_1.ProvisioningConfigDto.parse(this.globalConfig.sso.provisioning);
        const dbProvidedConfig = await this.loadConfigurationFromDatabase();
        if (dbProvidedConfig) {
            return {
                ...envProvidedConfig,
                ...dbProvidedConfig,
            };
        }
        return envProvidedConfig;
    }
    async getInstanceRoleClaimName() {
        if (!(await this.isInstanceRoleProvisioningEnabled())) {
            return null;
        }
        const provisioningConfig = await this.getConfig();
        return provisioningConfig.scopesInstanceRoleClaimName;
    }
    async getProjectsRolesClaimName() {
        if (!(await this.isProjectRolesProvisioningEnabled())) {
            return null;
        }
        const provisioningConfig = await this.getConfig();
        return provisioningConfig.scopesProjectsRolesClaimName;
    }
    async isProvisioningEnabled() {
        const provisioningConfig = await this.getConfig();
        return (provisioningConfig.scopesProvisionInstanceRole ||
            provisioningConfig.scopesProvisionProjectRoles);
    }
    async isInstanceRoleProvisioningEnabled() {
        const provisioningConfig = await this.getConfig();
        return provisioningConfig.scopesProvisionInstanceRole;
    }
    async isProjectRolesProvisioningEnabled() {
        const provisioningConfig = await this.getConfig();
        return provisioningConfig.scopesProvisionProjectRoles;
    }
};
exports.ProvisioningService = ProvisioningService;
__decorate([
    (0, decorators_1.OnPubSubEvent)('reload-sso-provisioning-configuration'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProvisioningService.prototype, "handleReloadSsoProvisioningConfiguration", null);
exports.ProvisioningService = ProvisioningService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [event_service_1.EventService,
        config_1.GlobalConfig,
        db_1.SettingsRepository,
        db_1.ProjectRepository,
        project_service_ee_1.ProjectService,
        db_1.RoleRepository,
        db_1.UserRepository,
        user_service_1.UserService,
        backend_common_1.Logger,
        publisher_service_1.Publisher,
        n8n_core_1.InstanceSettings])
], ProvisioningService);
//# sourceMappingURL=provisioning.service.ee.js.map