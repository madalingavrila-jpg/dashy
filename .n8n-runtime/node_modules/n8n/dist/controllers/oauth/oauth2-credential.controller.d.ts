import { Response } from 'express';
import { OAuthRequest } from '../../requests';
import { OauthService } from '../../oauth/oauth.service';
import { Logger } from '@n8n/backend-common';
import { ExternalHooks } from '../../external-hooks';
export declare class OAuth2CredentialController {
    private readonly oauthService;
    private readonly logger;
    private readonly externalHooks;
    constructor(oauthService: OauthService, logger: Logger, externalHooks: ExternalHooks);
    getAuthUri(req: OAuthRequest.OAuth2Credential.Auth): Promise<string>;
    handleCallback(req: OAuthRequest.OAuth2Credential.Callback, res: Response): Promise<void>;
    private convertCredentialToOptions;
}
