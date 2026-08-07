"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.folderIdSchema = exports.folderNameSchema = void 0;
const zod_1 = require("zod");
const illegalCharacterRegex = /[[\]^\\/:*?"<>|]/;
const dotsOnlyRegex = /^\.+$/;
const FOLDER_NAME_MAX_LENGTH = 128;
exports.folderNameSchema = zod_1.z
    .string()
    .trim()
    .superRefine((name, ctx) => {
    if (name === '') {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Folder name cannot be empty',
        });
        return;
    }
    if (illegalCharacterRegex.test(name)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Folder name contains invalid characters',
        });
        return;
    }
    if (dotsOnlyRegex.test(name)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Folder name cannot consist of dots only',
        });
        return;
    }
    if (name.startsWith('.')) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Folder name cannot start with a dot',
        });
    }
})
    .pipe(zod_1.z.string().max(FOLDER_NAME_MAX_LENGTH, {
    message: `Folder name cannot be longer than ${FOLDER_NAME_MAX_LENGTH} characters`,
}));
exports.folderIdSchema = zod_1.z.string().max(36);
//# sourceMappingURL=folder.schema.js.map