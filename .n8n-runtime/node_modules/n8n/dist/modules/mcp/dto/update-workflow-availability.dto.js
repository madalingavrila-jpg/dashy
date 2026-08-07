"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateWorkflowAvailabilityDto = void 0;
const api_types_1 = require("@n8n/api-types");
const zod_1 = require("zod");
class UpdateWorkflowAvailabilityDto extends api_types_1.Z.class({
    availableInMCP: zod_1.z.boolean(),
}) {
}
exports.UpdateWorkflowAvailabilityDto = UpdateWorkflowAvailabilityDto;
//# sourceMappingURL=update-workflow-availability.dto.js.map