import { z } from 'zod';
declare const OAuthClientResponseDto_base: import("../../zod-class").ZodClass<{
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    redirectUris: string[];
    grantTypes: string[];
    tokenEndpointAuthMethod: string;
}, {
    id: z.ZodString;
    name: z.ZodString;
    redirectUris: z.ZodArray<z.ZodString, "many">;
    grantTypes: z.ZodArray<z.ZodString, "many">;
    tokenEndpointAuthMethod: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}>;
export declare class OAuthClientResponseDto extends OAuthClientResponseDto_base {
}
declare const ListOAuthClientsResponseDto_base: import("../../zod-class").ZodClass<{
    data: {
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
        redirectUris: string[];
        grantTypes: string[];
        tokenEndpointAuthMethod: string;
    }[];
    count: number;
}, {
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        redirectUris: z.ZodArray<z.ZodString, "many">;
        grantTypes: z.ZodArray<z.ZodString, "many">;
        tokenEndpointAuthMethod: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
        redirectUris: string[];
        grantTypes: string[];
        tokenEndpointAuthMethod: string;
    }, {
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
        redirectUris: string[];
        grantTypes: string[];
        tokenEndpointAuthMethod: string;
    }>, "many">;
    count: z.ZodNumber;
}>;
export declare class ListOAuthClientsResponseDto extends ListOAuthClientsResponseDto_base {
}
declare const DeleteOAuthClientResponseDto_base: import("../../zod-class").ZodClass<{
    message: string;
    success: boolean;
}, {
    success: z.ZodBoolean;
    message: z.ZodString;
}>;
export declare class DeleteOAuthClientResponseDto extends DeleteOAuthClientResponseDto_base {
}
export {};
