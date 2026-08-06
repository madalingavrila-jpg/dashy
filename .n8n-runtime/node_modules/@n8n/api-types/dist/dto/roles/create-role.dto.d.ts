import { z } from 'zod';
declare const CreateRoleDto_base: import("../../zod-class").ZodClass<{
    displayName: string;
    scopes: string[];
    roleType: "project";
    description?: string | undefined;
}, {
    displayName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    roleType: z.ZodEnum<["project"]>;
    scopes: z.ZodArray<z.ZodEffects<z.ZodString, string, string>, "many">;
}>;
export declare class CreateRoleDto extends CreateRoleDto_base {
}
export {};
