import { z } from 'zod';
declare const VariableListRequestDto_base: import("../../zod-class").ZodClass<{
    projectId?: string | undefined;
    state?: "empty" | undefined;
}, {
    state: z.ZodOptional<z.ZodLiteral<"empty">>;
    projectId: z.ZodOptional<z.ZodString>;
}>;
export declare class VariableListRequestDto extends VariableListRequestDto_base {
}
export {};
