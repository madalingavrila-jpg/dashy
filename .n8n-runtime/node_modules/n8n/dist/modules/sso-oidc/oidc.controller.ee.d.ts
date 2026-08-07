import { OidcConfigDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Request, Response } from 'express';
import { AuthService } from '../../auth/auth.service';
import { AuthlessRequest } from '../../requests';
import { UrlService } from '../../services/url.service';
import { OidcService } from './oidc.service.ee';
export declare class OidcController {
    private readonly oidcService;
    private readonly authService;
    private readonly urlService;
    private readonly globalConfig;
    private readonly logger;
    constructor(oidcService: OidcService, authService: AuthService, urlService: UrlService, globalConfig: GlobalConfig, logger: Logger);
    retrieveConfiguration(_req: AuthenticatedRequest): Promise<Pick<OidcConfigDto, "clientId" | "clientSecret" | "loginEnabled" | "prompt" | "authenticationContextClassReference"> & {
        discoveryEndpoint: URL;
    }>;
    saveConfiguration(_req: AuthenticatedRequest, _res: Response, payload: OidcConfigDto): Promise<OidcConfigDto>;
    redirectToAuthProvider(_req: Request, res: Response): Promise<void>;
    callbackHandler(req: AuthlessRequest, res: Response): Promise<void>;
}
