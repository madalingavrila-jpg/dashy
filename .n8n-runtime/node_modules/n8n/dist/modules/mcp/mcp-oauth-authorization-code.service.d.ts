import type { AuthorizationCode } from './database/entities/oauth-authorization-code.entity';
import { AuthorizationCodeRepository } from './database/repositories/oauth-authorization-code.repository';
export declare class McpOAuthAuthorizationCodeService {
    private readonly authorizationCodeRepository;
    private readonly AUTHORIZATION_CODE_EXPIRY_MS;
    constructor(authorizationCodeRepository: AuthorizationCodeRepository);
    createAuthorizationCode(clientId: string, userId: string, redirectUri: string, codeChallenge: string, state: string | null): Promise<string>;
    findAndValidateAuthorizationCode(authorizationCode: string, clientId: string): Promise<AuthorizationCode>;
    validateAndConsumeAuthorizationCode(authorizationCode: string, clientId: string, redirectUri?: string): Promise<AuthorizationCode>;
    getCodeChallenge(authorizationCode: string, clientId: string): Promise<string>;
}
