import { z } from 'zod';
declare const UpdateVariableRequestDto_base: import("../../zod-class").ZodClass<{
    value?: string | undefined;
    type?: "string" | undefined;
    projectId?: string | null | undefined;
    key?: string | undefined;
}, {
    key: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodDefault<z.ZodEnum<["string"]>>>;
    value: z.ZodOptional<z.ZodString>;
    projectId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}>;
export declare class UpdateVariableRequestDto extends UpdateVariableRequestDto_base {
}
export {};
