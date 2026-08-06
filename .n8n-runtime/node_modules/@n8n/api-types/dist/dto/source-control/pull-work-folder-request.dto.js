"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PullWorkFolderRequestDto = exports.AUTO_PUBLISH_MODE = void 0;
const zod_1 = require("zod");
const zod_class_1 = require("../../zod-class");
const AutoPublishModeSchema = zod_1.z.enum(['none', 'all', 'published']);
exports.AUTO_PUBLISH_MODE = AutoPublishModeSchema.Values;
class PullWorkFolderRequestDto extends zod_class_1.Z.class({
    force: zod_1.z.boolean().optional(),
    autoPublish: AutoPublishModeSchema.optional().default('none'),
}) {
}
exports.PullWorkFolderRequestDto = PullWorkFolderRequestDto;
//# sourceMappingURL=pull-work-folder-request.dto.js.map