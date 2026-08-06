declare const RetrieveTagQueryDto_base: import("../../zod-class").ZodClass<{
    withUsageCount: boolean;
}, {
    withUsageCount: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEffects<import("zod").ZodEnum<["true", "false"]>, boolean, "true" | "false">>>;
}>;
export declare class RetrieveTagQueryDto extends RetrieveTagQueryDto_base {
}
export {};
