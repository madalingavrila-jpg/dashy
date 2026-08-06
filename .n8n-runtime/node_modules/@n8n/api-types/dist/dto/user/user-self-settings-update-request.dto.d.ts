import { z } from 'zod';
declare const UserSelfSettingsUpdateRequestDto_base: import("../../zod-class").ZodClass<{
    easyAIWorkflowOnboarded?: boolean | undefined;
    dismissedCallouts?: Record<string, boolean> | undefined;
}, {
    easyAIWorkflowOnboarded: z.ZodOptional<z.ZodBoolean>;
    dismissedCallouts: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodBoolean>>;
}>;
export declare class UserSelfSettingsUpdateRequestDto extends UserSelfSettingsUpdateRequestDto_base {
}
export {};
