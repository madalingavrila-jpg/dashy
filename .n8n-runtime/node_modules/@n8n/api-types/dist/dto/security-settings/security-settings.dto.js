"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSecuritySettingsDto = exports.SecuritySettingsDto = void 0;
const zod_1 = require("zod");
const zod_class_1 = require("../../zod-class");
class SecuritySettingsDto extends zod_class_1.Z.class({
    personalSpacePublishing: zod_1.z.boolean(),
    personalSpaceSharing: zod_1.z.boolean(),
    publishedPersonalWorkflowsCount: zod_1.z.number(),
    sharedPersonalWorkflowsCount: zod_1.z.number(),
    sharedPersonalCredentialsCount: zod_1.z.number(),
}) {
}
exports.SecuritySettingsDto = SecuritySettingsDto;
class UpdateSecuritySettingsDto extends zod_class_1.Z.class({
    personalSpacePublishing: zod_1.z.boolean().optional(),
    personalSpaceSharing: zod_1.z.boolean().optional(),
}) {
}
exports.UpdateSecuritySettingsDto = UpdateSecuritySettingsDto;
//# sourceMappingURL=security-settings.dto.js.map