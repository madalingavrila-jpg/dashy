"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicApiListDataTableContentQueryDto = exports.ListDataTableContentQueryDto = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const zod_1 = require("zod");
const data_table_filter_schema_1 = require("../../schemas/data-table-filter.schema");
const data_table_schema_1 = require("../../schemas/data-table.schema");
const zod_class_1 = require("../../zod-class");
const pagination_dto_1 = require("../pagination/pagination.dto");
const filterValidator = zod_1.z
    .string()
    .optional()
    .transform((val, ctx) => {
    if (!val)
        return undefined;
    try {
        const parsed = (0, n8n_workflow_1.jsonParse)(val);
        try {
            return data_table_filter_schema_1.dataTableFilterSchema.parse(parsed);
        }
        catch (e) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: 'Invalid filter fields',
                path: ['filter'],
            });
            return zod_1.z.NEVER;
        }
    }
    catch (e) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Invalid filter format',
            path: ['filter'],
        });
        return zod_1.z.NEVER;
    }
});
const sortByValidator = zod_1.z
    .string()
    .optional()
    .transform((val, ctx) => {
    if (val === undefined)
        return val;
    if (!val.includes(':')) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Invalid sort format, expected <columnName>:<asc/desc>',
            path: ['sort'],
        });
        return zod_1.z.NEVER;
    }
    let [column, direction] = val.split(':');
    try {
        column = data_table_schema_1.dataTableColumnNameSchema.parse(column);
    }
    catch (e) {
        const errorMessage = e instanceof zod_1.z.ZodError ? e.errors[0]?.message : 'Invalid sort columnName';
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: errorMessage,
            path: ['sortBy'],
        });
        return zod_1.z.NEVER;
    }
    direction = direction?.toUpperCase();
    if (direction !== 'ASC' && direction !== 'DESC') {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Invalid sort direction',
            path: ['sort'],
        });
        return zod_1.z.NEVER;
    }
    return [column, direction];
});
class ListDataTableContentQueryDto extends zod_class_1.Z.class({
    take: pagination_dto_1.paginationSchema.take.optional(),
    skip: pagination_dto_1.paginationSchema.skip.optional(),
    filter: filterValidator.optional(),
    sortBy: sortByValidator.optional(),
    search: zod_1.z.string().optional(),
}) {
}
exports.ListDataTableContentQueryDto = ListDataTableContentQueryDto;
class PublicApiListDataTableContentQueryDto extends zod_class_1.Z.class({
    limit: pagination_dto_1.publicApiPaginationSchema.limit,
    offset: pagination_dto_1.publicApiPaginationSchema.offset,
    filter: filterValidator.optional(),
    sortBy: sortByValidator.optional(),
    search: zod_1.z.string().optional(),
}) {
}
exports.PublicApiListDataTableContentQueryDto = PublicApiListDataTableContentQueryDto;
//# sourceMappingURL=list-data-table-content-query.dto.js.map