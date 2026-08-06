"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApproveConsentRequestDto = void 0;
const api_types_1 = require("@n8n/api-types");
const zod_1 = require("zod");
class ApproveConsentRequestDto extends api_types_1.Z.class({
    approved: zod_1.z.boolean(),
}) {
}
exports.ApproveConsentRequestDto = ApproveConsentRequestDto;
//# sourceMappingURL=approve-consent-request.dto.js.map