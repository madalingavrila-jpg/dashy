"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateWorkflowDto = exports.workflowIdSchema = void 0;
const zod_1 = require("zod");
const base_workflow_dto_1 = require("./base-workflow.dto");
const zod_class_1 = require("../../zod-class");
exports.workflowIdSchema = zod_1.z.string();
class CreateWorkflowDto extends zod_class_1.Z.class({
    ...base_workflow_dto_1.baseWorkflowShape,
    id: exports.workflowIdSchema.optional(),
    projectId: zod_1.z.string().optional(),
}) {
}
exports.CreateWorkflowDto = CreateWorkflowDto;
//# sourceMappingURL=create-workflow.dto.js.map