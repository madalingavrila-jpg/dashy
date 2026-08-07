"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvisioningConfigPatchDto = exports.ProvisioningConfigDto = void 0;
const zod_1 = require("zod");
const zod_class_1 = require("../../zod-class");
class ProvisioningConfigDto extends zod_class_1.Z.class({
    scopesProvisionInstanceRole: zod_1.z.boolean(),
    scopesProvisionProjectRoles: zod_1.z.boolean(),
    scopesName: zod_1.z.string(),
    scopesInstanceRoleClaimName: zod_1.z.string(),
    scopesProjectsRolesClaimName: zod_1.z.string(),
}) {
}
exports.ProvisioningConfigDto = ProvisioningConfigDto;
class ProvisioningConfigPatchDto extends zod_class_1.Z.class({
    scopesProvisionInstanceRole: zod_1.z.boolean().optional().nullable(),
    scopesProvisionProjectRoles: zod_1.z.boolean().optional().nullable(),
    scopesName: zod_1.z.string().optional().nullable(),
    scopesInstanceRoleClaimName: zod_1.z.string().optional().nullable(),
    scopesProjectsRolesClaimName: zod_1.z.string().optional().nullable(),
}) {
}
exports.ProvisioningConfigPatchDto = ProvisioningConfigPatchDto;
//# sourceMappingURL=config.dto.js.map