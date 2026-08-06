import { z } from 'zod';
export declare const projectNameSchema: z.ZodString;
export declare const projectTypeSchema: z.ZodEnum<["personal", "team"]>;
export type ProjectType = z.infer<typeof projectTypeSchema>;
export declare const projectIconSchema: z.ZodObject<{
    type: z.ZodEnum<["emoji", "icon"]>;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    type: "icon" | "emoji";
}, {
    value: string;
    type: "icon" | "emoji";
}>;
export type ProjectIcon = z.infer<typeof projectIconSchema>;
export declare const projectDescriptionSchema: z.ZodString;
export declare const projectRelationSchema: z.ZodObject<{
    userId: z.ZodString;
    role: z.ZodUnion<[z.ZodEnum<["project:admin", "project:editor", "project:viewer", "project:chatUser"]>, z.ZodEffects<z.ZodString, string, string>]>;
}, "strip", z.ZodTypeAny, {
    role: string;
    userId: string;
}, {
    role: string;
    userId: string;
}>;
export type ProjectRelation = z.infer<typeof projectRelationSchema>;
