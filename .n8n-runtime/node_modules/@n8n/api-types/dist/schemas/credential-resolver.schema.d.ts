import { z } from 'zod';
export declare const credentialResolverIdSchema: z.ZodString;
export declare const credentialResolverNameSchema: z.ZodString;
export declare const credentialResolverTypeNameSchema: z.ZodString;
export declare const credentialResolverConfigSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
export declare const credentialResolverSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    config: z.ZodString;
    decryptedConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    config: string;
    decryptedConfig?: Record<string, unknown> | undefined;
}, {
    type: string;
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    config: string;
    decryptedConfig?: Record<string, unknown> | undefined;
}>;
export declare const credentialResolverTypeSchema: z.ZodObject<{
    name: z.ZodString;
    displayName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    displayName: string;
    options?: Record<string, unknown>[] | undefined;
    description?: string | undefined;
}, {
    name: string;
    displayName: string;
    options?: Record<string, unknown>[] | undefined;
    description?: string | undefined;
}>;
export declare const credentialResolverTypesSchema: z.ZodArray<z.ZodObject<{
    name: z.ZodString;
    displayName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    options: z.ZodOptional<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    displayName: string;
    options?: Record<string, unknown>[] | undefined;
    description?: string | undefined;
}, {
    name: string;
    displayName: string;
    options?: Record<string, unknown>[] | undefined;
    description?: string | undefined;
}>, "many">;
export type CredentialResolverType = z.infer<typeof credentialResolverTypeSchema>;
export declare const credentialResolversSchema: z.ZodArray<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodString;
    config: z.ZodString;
    decryptedConfig: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    config: string;
    decryptedConfig?: Record<string, unknown> | undefined;
}, {
    type: string;
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    config: string;
    decryptedConfig?: Record<string, unknown> | undefined;
}>, "many">;
export type CredentialResolver = z.infer<typeof credentialResolverSchema>;
