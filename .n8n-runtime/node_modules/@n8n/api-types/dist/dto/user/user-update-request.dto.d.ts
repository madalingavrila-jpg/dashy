import { z } from 'zod';
declare const UserUpdateRequestDto_base: import("../../zod-class").ZodClass<{
    email: string;
    mfaCode?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    currentPassword?: string | undefined;
}, {
    email: z.ZodString;
    firstName: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    lastName: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    mfaCode: z.ZodOptional<z.ZodString>;
    currentPassword: z.ZodOptional<z.ZodString>;
}>;
export declare class UserUpdateRequestDto extends UserUpdateRequestDto_base {
}
export {};
