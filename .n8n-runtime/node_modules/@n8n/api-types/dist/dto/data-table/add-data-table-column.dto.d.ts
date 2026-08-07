declare const AddDataTableColumnDto_base: import("../../zod-class").ZodClass<{
    type: "string" | "number" | "boolean" | "date";
    name: string;
    index?: number | undefined;
}, {
    name: import("zod").ZodString;
    type: import("zod").ZodEnum<["string", "number", "boolean", "date"]>;
    index: import("zod").ZodOptional<import("zod").ZodNumber>;
}>;
export declare class AddDataTableColumnDto extends AddDataTableColumnDto_base {
}
export {};
