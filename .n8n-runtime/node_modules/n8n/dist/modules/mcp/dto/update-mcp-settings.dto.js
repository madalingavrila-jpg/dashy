"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMcpSettingsDto = void 0;
const api_types_1 = require("@n8n/api-types");
const zod_1 = require("zod");
class UpdateMcpSettingsDto extends api_types_1.Z.class({
    mcpAccessEnabled: zod_1.z.boolean(),
}) {
}
exports.UpdateMcpSettingsDto = UpdateMcpSettingsDto;
//# sourceMappingURL=update-mcp-settings.dto.js.map