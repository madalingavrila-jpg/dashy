import { z } from 'zod';
declare const DeleteDataTableRowsDto_base: import("../../zod-class").ZodClass<{
    filter: {
        type: "and" | "or";
        filters: {
            value: string | number | boolean | Date | null;
            columnName: string;
            condition: "eq" | "neq" | "like" | "ilike" | "gt" | "gte" | "lt" | "lte";
        }[];
    };
    returnData: boolean;
    dryRun: boolean;
}, {
    filter: z.ZodEffects<z.ZodString, {
        type: "and" | "or";
        filters: {
            value: string | number | boolean | Date | null;
            columnName: string;
            condition: "eq" | "neq" | "like" | "ilike" | "gt" | "gte" | "lt" | "lte";
        }[];
    }, string>;
    returnData: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodBoolean]>>, boolean, string | boolean | undefined>;
    dryRun: z.ZodEffects<z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodBoolean]>>, boolean, string | boolean | undefined>;
}>;
export declare class DeleteDataTableRowsDto extends DeleteDataTableRowsDto_base {
}
export {};
