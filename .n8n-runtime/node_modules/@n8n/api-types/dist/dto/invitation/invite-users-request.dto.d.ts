import { z } from 'zod';
declare const invitedUserSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodDefault<z.ZodUnion<[z.ZodEnum<["global:admin", "global:member", "global:chatUser"]>, z.ZodEffects<z.ZodString, string, string>]>>;
}, "strip", z.ZodTypeAny, {
    role: string;
    email: string;
}, {
    email: string;
    role?: string | undefined;
}>;
export declare class InviteUsersRequestDto extends Array<z.infer<typeof invitedUserSchema>> {
    static safeParse(data: unknown): z.SafeParseReturnType<{
        email: string;
        role?: string | undefined;
    }[], {
        role: string;
        email: string;
    }[]>;
}
export {};
