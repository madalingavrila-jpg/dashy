import { z } from 'zod';
declare const CreateCredentialDto_base: import("../../zod-class").ZodClass<{
    type: string;
    data: Record<string, unknown>;
    name: string;
    projectId?: string | undefined;
    uiContext?: string | undefined;
    isGlobal?: boolean | undefined;
    isResolvable?: boolean | undefined;
}, {
    name: z.ZodString;
    type: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    projectId: z.ZodOptional<z.ZodString>;
    uiContext: z.ZodOptional<z.ZodString>;
    isGlobal: z.ZodOptional<z.ZodBoolean>;
    isResolvable: z.ZodOptional<z.ZodBoolean>;
}>;
export declare class CreateCredentialDto extends CreateCredentialDto_base {
}
export {};
