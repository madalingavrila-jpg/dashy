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
exports.RoleController = void 0;
const api_types_1 = require("@n8n/api-types");
const constants_1 = require("@n8n/constants");
const decorators_1 = require("@n8n/decorators");
const role_service_1 = require("../services/role.service");
let RoleController = class RoleController {
    constructor(roleService) {
        this.roleService = roleService;
    }
    async getAllRoles(_req, _res, query) {
        const allRoles = await this.roleService.getAllRoles(query.withUsageCount);
        return {
            global: allRoles.filter((r) => r.roleType === 'global'),
            project: allRoles.filter((r) => r.roleType === 'project'),
            credential: allRoles.filter((r) => r.roleType === 'credential'),
            workflow: allRoles.filter((r) => r.roleType === 'workflow'),
        };
    }
    async getRoleBySlug(_req, _res, slug, query) {
        return await this.roleService.getRole(slug, query.withUsageCount);
    }
    async updateRole(_req, _res, slug, updateRole) {
        return await this.roleService.updateCustomRole(slug, updateRole);
    }
    async deleteRole(_req, _res, slug) {
        return await this.roleService.removeCustomRole(slug);
    }
    async createRole(_req, _res, createRole) {
        return await this.roleService.createCustomRole(createRole);
    }
};
exports.RoleController = RoleController;
__decorate([
    (0, decorators_1.Get)('/'),
    __param(2, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response,
        api_types_1.RoleListQueryDto]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "getAllRoles", null);
__decorate([
    (0, decorators_1.Get)('/:slug'),
    __param(2, (0, decorators_1.Param)('slug')),
    __param(3, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String, api_types_1.RoleGetQueryDto]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "getRoleBySlug", null);
__decorate([
    (0, decorators_1.Patch)('/:slug'),
    (0, decorators_1.GlobalScope)('role:manage'),
    (0, decorators_1.Licensed)(constants_1.LICENSE_FEATURES.CUSTOM_ROLES),
    __param(2, (0, decorators_1.Param)('slug')),
    __param(3, decorators_1.Body),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String, api_types_1.UpdateRoleDto]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "updateRole", null);
__decorate([
    (0, decorators_1.Delete)('/:slug'),
    (0, decorators_1.GlobalScope)('role:manage'),
    (0, decorators_1.Licensed)(constants_1.LICENSE_FEATURES.CUSTOM_ROLES),
    __param(2, (0, decorators_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "deleteRole", null);
__decorate([
    (0, decorators_1.Post)('/'),
    (0, decorators_1.GlobalScope)('role:manage'),
    (0, decorators_1.Licensed)(constants_1.LICENSE_FEATURES.CUSTOM_ROLES),
    __param(2, decorators_1.Body),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response,
        api_types_1.CreateRoleDto]),
    __metadata("design:returntype", Promise)
], RoleController.prototype, "createRole", null);
exports.RoleController = RoleController = __decorate([
    (0, decorators_1.RestController)('/roles'),
    __metadata("design:paramtypes", [role_service_1.RoleService])
], RoleController);
//# sourceMappingURL=role.controller.js.map