declare const RoleGetQueryDto_base: import("../../zod-class").ZodClass<{
    withUsageCount: boolean;
}, {
    withUsageCount: import("zod").ZodDefault<import("zod").ZodOptional<import("zod").ZodEffects<import("zod").ZodEnum<["true", "false"]>, boolean, "true" | "false">>>;
}>;
export declare class RoleGetQueryDto extends RoleGetQueryDto_base {
}
export {};
