import { z } from 'zod';
declare const SecuritySettingsDto_base: import("../../zod-class").ZodClass<{
    personalSpacePublishing: boolean;
    personalSpaceSharing: boolean;
    publishedPersonalWorkflowsCount: number;
    sharedPersonalWorkflowsCount: number;
    sharedPersonalCredentialsCount: number;
}, {
    personalSpacePublishing: z.ZodBoolean;
    personalSpaceSharing: z.ZodBoolean;
    publishedPersonalWorkflowsCount: z.ZodNumber;
    sharedPersonalWorkflowsCount: z.ZodNumber;
    sharedPersonalCredentialsCount: z.ZodNumber;
}>;
export declare class SecuritySettingsDto extends SecuritySettingsDto_base {
}
declare const UpdateSecuritySettingsDto_base: import("../../zod-class").ZodClass<{
    personalSpacePublishing?: boolean | undefined;
    personalSpaceSharing?: boolean | undefined;
}, {
    personalSpacePublishing: z.ZodOptional<z.ZodBoolean>;
    personalSpaceSharing: z.ZodOptional<z.ZodBoolean>;
}>;
export declare class UpdateSecuritySettingsDto extends UpdateSecuritySettingsDto_base {
}
export {};
