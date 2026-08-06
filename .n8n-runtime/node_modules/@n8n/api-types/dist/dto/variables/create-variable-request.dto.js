"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateVariableRequestDto = void 0;
const zod_1 = require("zod");
const base_dto_1 = require("./base.dto");
class CreateVariableRequestDto extends base_dto_1.BaseVariableRequestDto.extend({
    projectId: zod_1.z.string().max(36).optional(),
}) {
}
exports.CreateVariableRequestDto = CreateVariableRequestDto;
//# sourceMappingURL=create-variable-request.dto.js.map