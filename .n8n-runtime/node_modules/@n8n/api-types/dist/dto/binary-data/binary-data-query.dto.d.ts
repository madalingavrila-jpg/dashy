import { z } from 'zod';
declare const BinaryDataQueryDto_base: import("../../zod-class").ZodClass<{
    id: string;
    action: "view" | "download";
    mimeType?: string | undefined;
    fileName?: string | undefined;
}, {
    id: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    action: z.ZodEnum<["view", "download"]>;
    fileName: z.ZodOptional<z.ZodString>;
    mimeType: z.ZodOptional<z.ZodString>;
}>;
export declare class BinaryDataQueryDto extends BinaryDataQueryDto_base {
}
export {};
