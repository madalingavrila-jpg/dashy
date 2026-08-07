"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteOAuthClientResponseDto = exports.ListOAuthClientsResponseDto = exports.OAuthClientResponseDto = void 0;
const zod_1 = require("zod");
const zod_class_1 = require("../../zod-class");
class OAuthClientResponseDto extends zod_class_1.Z.class({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    redirectUris: zod_1.z.array(zod_1.z.string()),
    grantTypes: zod_1.z.array(zod_1.z.string()),
    tokenEndpointAuthMethod: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
}) {
}
exports.OAuthClientResponseDto = OAuthClientResponseDto;
class ListOAuthClientsResponseDto extends zod_class_1.Z.class({
    data: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        redirectUris: zod_1.z.array(zod_1.z.string()),
        grantTypes: zod_1.z.array(zod_1.z.string()),
        tokenEndpointAuthMethod: zod_1.z.string(),
        createdAt: zod_1.z.string().datetime(),
        updatedAt: zod_1.z.string().datetime(),
    })),
    count: zod_1.z.number(),
}) {
}
exports.ListOAuthClientsResponseDto = ListOAuthClientsResponseDto;
class DeleteOAuthClientResponseDto extends zod_class_1.Z.class({
    success: zod_1.z.boolean(),
    message: zod_1.z.string(),
}) {
}
exports.DeleteOAuthClientResponseDto = DeleteOAuthClientResponseDto;
//# sourceMappingURL=oauth-client.dto.js.map