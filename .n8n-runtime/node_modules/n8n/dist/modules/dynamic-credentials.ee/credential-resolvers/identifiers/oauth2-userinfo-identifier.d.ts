import { Logger } from '@n8n/backend-common';
import type { ICredentialContext } from 'n8n-workflow';
import { z } from 'zod';
import { CacheService } from '../../../../services/cache/cache.service';
import { ITokenIdentifier } from './identifier-interface';
export declare const OAuth2UserInfoOptionsSchema: z.ZodObject<{
    validation: z.ZodLiteral<"oauth2-userinfo">;
    metadataUri: z.ZodString;
    subjectClaim: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    validation: "oauth2-userinfo";
    metadataUri: string;
    subjectClaim: string;
}, {
    validation: "oauth2-userinfo";
    metadataUri: string;
    subjectClaim?: string | undefined;
}>;
export declare const UserInfoResponseSchema: z.ZodObject<{
    sub: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    sub: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    sub: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export type UserInfoResponse = z.infer<typeof UserInfoResponseSchema>;
export declare class OAuth2UserInfoIdentifier implements ITokenIdentifier {
    private readonly logger;
    private readonly cache;
    constructor(logger: Logger, cache: CacheService);
    validateOptions(identifierOptions: Record<string, unknown>): Promise<void>;
    resolve(context: ICredentialContext, identifierOptions: Record<string, unknown>): Promise<string>;
    private parseOptions;
    private fetchMetadata;
    private parseUserInfoResponse;
    private resolveBasedOnUserInfo;
}
