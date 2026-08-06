import { z } from 'zod';
export declare const FilterConditionSchema: z.ZodUnion<[z.ZodLiteral<"eq">, z.ZodLiteral<"neq">, z.ZodLiteral<"like">, z.ZodLiteral<"ilike">, z.ZodLiteral<"gt">, z.ZodLiteral<"gte">, z.ZodLiteral<"lt">, z.ZodLiteral<"lte">]>;
export type DataTableFilterConditionType = z.infer<typeof FilterConditionSchema>;
export declare const dataTableFilterRecordSchema: z.ZodObject<{
    columnName: z.ZodString;
    condition: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"eq">, z.ZodLiteral<"neq">, z.ZodLiteral<"like">, z.ZodLiteral<"ilike">, z.ZodLiteral<"gt">, z.ZodLiteral<"gte">, z.ZodLiteral<"lt">, z.ZodLiteral<"lte">]>>;
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodDate, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    value: string | number | boolean | Date | null;
    columnName: string;
    condition: "eq" | "neq" | "like" | "ilike" | "gt" | "gte" | "lt" | "lte";
}, {
    value: string | number | boolean | Date | null;
    columnName: string;
    condition?: "eq" | "neq" | "like" | "ilike" | "gt" | "gte" | "lt" | "lte" | undefined;
}>;
export declare const dataTableFilterTypeSchema: z.ZodUnion<[z.ZodLiteral<"and">, z.ZodLiteral<"or">]>;
export declare const dataTableFilterSchema: z.ZodObject<{
    type: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"and">, z.ZodLiteral<"or">]>>;
    filters: z.ZodDefault<z.ZodArray<z.ZodObject<{
        columnName: z.ZodString;
        condition: z.ZodDefault<z.ZodUnion<[z.ZodLiteral<"eq">, z.ZodLiteral<"neq">, z.ZodLiteral<"like">, z.ZodLiteral<"ilike">, z.ZodLiteral<"gt">, z.ZodLiteral<"gte">, z.ZodLiteral<"lt">, z.ZodLiteral<"lte">]>>;
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodDate, z.ZodNull]>;
    }, "strip", z.ZodTypeAny, {
        value: string | number | boolean | Date | null;
        columnName: string;
        condition: "eq" | "neq" | "like" | "ilike" | "gt" | "gte" | "lt" | "lte";
    }, {
        value: string | number | boolean | Date | null;
        columnName: string;
        condition?: "eq" | "neq" | "like" | "ilike" | "gt" | "gte" | "lt" | "lte" | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "and" | "or";
    filters: {
        value: string | number | boolean | Date | null;
        columnName: string;
        condition: "eq" | "neq" | "like" | "ilike" | "gt" | "gte" | "lt" | "lte";
    }[];
}, {
    type?: "and" | "or" | undefined;
    filters?: {
        value: string | number | boolean | Date | null;
        columnName: string;
        condition?: "eq" | "neq" | "like" | "ilike" | "gt" | "gte" | "lt" | "lte" | undefined;
    }[] | undefined;
}>;
export type DataTableFilter = z.infer<typeof dataTableFilterSchema>;
