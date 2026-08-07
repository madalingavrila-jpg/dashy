"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseWorkflowShape = exports.workflowMetaSchema = exports.workflowPinDataSchema = exports.workflowStaticDataSchema = exports.workflowSettingsSchema = exports.workflowConnectionsSchema = exports.workflowNodesSchema = exports.workflowDescriptionSchema = exports.workflowNameSchema = exports.WORKFLOW_NAME_MAX_LENGTH = void 0;
const zod_1 = require("zod");
exports.WORKFLOW_NAME_MAX_LENGTH = 128;
exports.workflowNameSchema = zod_1.z
    .string()
    .min(1, { message: 'Workflow name is required' })
    .max(exports.WORKFLOW_NAME_MAX_LENGTH, {
    message: `Workflow name must be ${exports.WORKFLOW_NAME_MAX_LENGTH} characters or less`,
});
exports.workflowDescriptionSchema = zod_1.z.string().nullable();
exports.workflowNodesSchema = zod_1.z.custom((val) => Array.isArray(val), {
    message: 'Nodes must be an array',
});
exports.workflowConnectionsSchema = zod_1.z.custom((val) => typeof val === 'object' && val !== null && !Array.isArray(val), {
    message: 'Connections must be an object',
});
exports.workflowSettingsSchema = zod_1.z.custom((val) => val === null || (typeof val === 'object' && val !== null && !Array.isArray(val)), {
    message: 'Settings must be an object or null',
});
exports.workflowStaticDataSchema = zod_1.z.preprocess((val) => {
    if (typeof val === 'string') {
        try {
            return JSON.parse(val);
        }
        catch {
            throw new Error('Static data string must be valid JSON');
        }
    }
    return val;
}, zod_1.z.custom((val) => val === null || (typeof val === 'object' && val !== null && !Array.isArray(val)), {
    message: 'Static data must be an object or null',
}));
exports.workflowPinDataSchema = zod_1.z.custom((val) => val === null || (typeof val === 'object' && val !== null && !Array.isArray(val)), {
    message: 'Pin data must be an object or null',
});
exports.workflowMetaSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).nullable();
exports.baseWorkflowShape = {
    name: exports.workflowNameSchema,
    description: exports.workflowDescriptionSchema.optional(),
    nodes: exports.workflowNodesSchema,
    connections: exports.workflowConnectionsSchema,
    settings: exports.workflowSettingsSchema.optional(),
    staticData: exports.workflowStaticDataSchema.optional(),
    meta: exports.workflowMetaSchema.optional(),
    pinData: exports.workflowPinDataSchema.optional(),
    hash: zod_1.z.string().optional(),
    parentFolderId: zod_1.z.string().optional(),
    parentFolder: zod_1.z.object({ id: zod_1.z.string(), name: zod_1.z.string() }).nullable().optional(),
    tags: zod_1.z
        .union([zod_1.z.array(zod_1.z.string()), zod_1.z.array(zod_1.z.object({ id: zod_1.z.string(), name: zod_1.z.string() }))])
        .transform((val) => {
        if (val.length > 0 && typeof val[0] === 'object' && 'id' in val[0]) {
            return val.map((tag) => tag.id);
        }
        return val;
    })
        .optional(),
    uiContext: zod_1.z.string().optional(),
    aiBuilderAssisted: zod_1.z.boolean().optional(),
    expectedChecksum: zod_1.z.string().optional(),
    autosaved: zod_1.z.boolean().optional(),
};
//# sourceMappingURL=base-workflow.dto.js.map