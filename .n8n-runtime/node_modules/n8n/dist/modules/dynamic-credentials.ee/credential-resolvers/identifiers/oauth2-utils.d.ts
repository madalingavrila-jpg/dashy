import z from 'zod';
export declare const OAuth2OptionsSchema: z.ZodObject<{
    metadataUri: z.ZodString;
    subjectClaim: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    metadataUri: string;
    subjectClaim: string;
}, {
    metadataUri: string;
    subjectClaim?: string | undefined;
}>;
export type OAuth2Options = z.infer<typeof OAuth2OptionsSchema>;
export declare function sha256(token: string): string;
