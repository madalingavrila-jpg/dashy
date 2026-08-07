"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSecretsProviderConnectionDto = void 0;
const zod_1 = require("zod");
const secrets_provider_schema_1 = require("../../schemas/secrets-provider.schema");
const zod_class_1 = require("../../zod-class");
class CreateSecretsProviderConnectionDto extends zod_class_1.Z.class({
    providerKey: zod_1.z
        .string()
        .min(1)
        .max(128)
        .regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/),
    type: secrets_provider_schema_1.secretsProviderTypeSchema,
    projectIds: zod_1.z.array(zod_1.z.string().min(1)),
    settings: zod_1.z.object({}).catchall(zod_1.z.any()),
}) {
}
exports.CreateSecretsProviderConnectionDto = CreateSecretsProviderConnectionDto;
//# sourceMappingURL=create-secrets-provider-connection.dto.js.map