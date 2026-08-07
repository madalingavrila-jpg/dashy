import { Response } from 'express';
import { OAuthRequest } from '../../requests';
import { OauthService } from '../../oauth/oauth.service';
import { Logger } from '@n8n/backend-common';
export declare class OAuth1CredentialController {
    private readonly oauthService;
    private readonly logger;
    constructor(oauthService: OauthService, logger: Logger);
    getAuthUri(req: OAuthRequest.OAuth1Credential.Auth): Promise<string>;
    handleCallback(req: OAuthRequest.OAuth1Credential.Callback, res: Response): Promise<void>;
}
