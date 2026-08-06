import { z } from 'zod';
declare const UpdateProjectDto_base: import("../../zod-class").ZodClass<{
    icon?: {
        value: string;
        type: "icon" | "emoji";
    } | undefined;
    name?: string | undefined;
    description?: string | undefined;
}, {
    name: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["emoji", "icon"]>;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        type: "icon" | "emoji";
    }, {
        value: string;
        type: "icon" | "emoji";
    }>>;
    description: z.ZodOptional<z.ZodString>;
}>;
export declare class UpdateProjectDto extends UpdateProjectDto_base {
}
declare const UpdateProjectWithRelationsDto_base: import("../../zod-class").ZodClass<{
    icon?: {
        value: string;
        type: "icon" | "emoji";
    } | undefined;
    name?: string | undefined;
    description?: string | undefined;
    relations?: {
        role: string;
        userId: string;
    }[] | undefined;
}, {
    relations: z.ZodOptional<z.ZodArray<z.ZodObject<{
        userId: z.ZodString;
        role: z.ZodUnion<[z.ZodEnum<["project:admin", "project:editor", "project:viewer", "project:chatUser"]>, z.ZodEffects<z.ZodString, string, string>]>;
    }, "strip", z.ZodTypeAny, {
        role: string;
        userId: string;
    }, {
        role: string;
        userId: string;
    }>, "many">>;
    name: z.ZodOptional<z.ZodString>;
    icon: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["emoji", "icon"]>;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        type: "icon" | "emoji";
    }, {
        value: string;
        type: "icon" | "emoji";
    }>>;
    description: z.ZodOptional<z.ZodString>;
}>;
export declare class UpdateProjectWithRelationsDto extends UpdateProjectWithRelationsDto_base {
}
export {};
