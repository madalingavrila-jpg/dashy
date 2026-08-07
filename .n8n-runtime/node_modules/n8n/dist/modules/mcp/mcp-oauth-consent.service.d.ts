import { Logger } from '@n8n/backend-common';
import { OAuthClientRepository } from './database/repositories/oauth-client.repository';
import { UserConsentRepository } from './database/repositories/oauth-user-consent.repository';
import { McpOAuthAuthorizationCodeService } from './mcp-oauth-authorization-code.service';
import { OAuthSessionService } from './oauth-session.service';
export declare class McpOAuthConsentService {
    private readonly logger;
    private readonly oauthSessionService;
    private readonly oauthClientRepository;
    private readonly userConsentRepository;
    private readonly authorizationCodeService;
    constructor(logger: Logger, oauthSessionService: OAuthSessionService, oauthClientRepository: OAuthClientRepository, userConsentRepository: UserConsentRepository, authorizationCodeService: McpOAuthAuthorizationCodeService);
    getConsentDetails(sessionToken: string): Promise<{
        clientName: string;
        clientId: string;
    } | null>;
    handleConsentDecision(sessionToken: string, userId: string, approved: boolean): Promise<{
        redirectUrl: string;
    }>;
}
