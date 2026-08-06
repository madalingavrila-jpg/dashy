import { z } from 'zod';
declare const CreateProjectDto_base: import("../../zod-class").ZodClass<{
    name: string;
    icon?: {
        value: string;
        type: "icon" | "emoji";
    } | undefined;
    uiContext?: string | undefined;
}, {
    name: z.ZodString;
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
    uiContext: z.ZodOptional<z.ZodString>;
}>;
export declare class CreateProjectDto extends CreateProjectDto_base {
}
export {};
