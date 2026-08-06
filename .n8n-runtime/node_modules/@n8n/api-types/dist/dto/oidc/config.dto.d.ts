import { z } from 'zod';
declare const OidcConfigDto_base: import("../../zod-class").ZodClass<{
    loginEnabled: boolean;
    clientId: string;
    clientSecret: string;
    discoveryEndpoint: string;
    prompt: "create" | "none" | "login" | "consent" | "select_account";
    authenticationContextClassReference: string[];
}, {
    clientId: z.ZodString;
    clientSecret: z.ZodString;
    discoveryEndpoint: z.ZodString;
    loginEnabled: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    prompt: z.ZodDefault<z.ZodOptional<z.ZodEnum<["none", "login", "consent", "select_account", "create"]>>>;
    authenticationContextClassReference: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}>;
export declare class OidcConfigDto extends OidcConfigDto_base {
}
export {};
