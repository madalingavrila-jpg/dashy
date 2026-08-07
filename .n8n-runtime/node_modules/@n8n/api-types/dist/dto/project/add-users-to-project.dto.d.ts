import { z } from 'zod';
declare const AddUsersToProjectDto_base: import("../../zod-class").ZodClass<{
    relations: {
        role: string;
        userId: string;
    }[];
}, {
    relations: z.ZodArray<z.ZodObject<{
        userId: z.ZodString;
        role: z.ZodUnion<[z.ZodEnum<["project:admin", "project:editor", "project:viewer", "project:chatUser"]>, z.ZodEffects<z.ZodString, string, string>]>;
    }, "strip", z.ZodTypeAny, {
        role: string;
        userId: string;
    }, {
        role: string;
        userId: string;
    }>, "many">;
}>;
export declare class AddUsersToProjectDto extends AddUsersToProjectDto_base {
}
export {};
