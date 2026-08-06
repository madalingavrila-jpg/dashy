"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsDateFilterDto = void 0;
const zod_1 = require("zod");
const zod_class_1 = require("../../zod-class");
class InsightsDateFilterDto extends zod_class_1.Z.class({
    startDate: zod_1.z.coerce.date().optional(),
    endDate: zod_1.z.coerce.date().optional(),
    projectId: zod_1.z.string().optional(),
}) {
}
exports.InsightsDateFilterDto = InsightsDateFilterDto;
//# sourceMappingURL=date-filter.dto.js.map