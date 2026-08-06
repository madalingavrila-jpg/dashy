import { z } from 'zod';
declare const UpsertDataTableRowDto_base: import("../../zod-class").ZodClass<{
    filter: {
        type: "and" | "or";
        filters: {
            value: string | number | boolean | Date | null;
            columnName: string;
            condition: "eq" | "neq" | "like" | "ilike" | "gt" | "gte" | "lt" | "lte";
        }[];
    };
    data: Record<string, string | number | boolean | Date | null>;
    returnData: boolean;
    dryRun: boolean;
}, {
    filter: z.ZodEffects<z.ZodObject<{
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
    }>, {
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
    data: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodDate]>>, Record<string, string | number | boolean | Date | null>, Record<string, string | number | boolean | Date | null>>;
    returnData: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    dryRun: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}>;
export declare class UpsertDataTableRowDto extends UpsertDataTableRowDto_base {
}
export {};
