import { Request, Response } from 'express';
import { EnterpriseCredentialsService } from '../../credentials/credentials.service.ee';
import { OauthService } from '../../oauth/oauth.service';
import { DynamicCredentialResolverRepository } from './database/repositories/credential-resolver.repository';
import { DynamicCredentialResolverRegistry } from './services';
import { Cipher } from 'n8n-core';
import { DynamicCredentialCorsService } from './services/dynamic-credential-cors.service';
import { DynamicCredentialWebService } from './services/dynamic-credential-web.service';
export declare class DynamicCredentialsController {
    private readonly enterpriseCredentialsService;
    private readonly oauthService;
    private readonly resolverRepository;
    private readonly resolverRegistry;
    private readonly cipher;
    private readonly dynamicCredentialCorsService;
    private readonly dynamicCredentialWebService;
    constructor(enterpriseCredentialsService: EnterpriseCredentialsService, oauthService: OauthService, resolverRepository: DynamicCredentialResolverRepository, resolverRegistry: DynamicCredentialResolverRegistry, cipher: Cipher, dynamicCredentialCorsService: DynamicCredentialCorsService, dynamicCredentialWebService: DynamicCredentialWebService);
    private findCredentialToUse;
    private getResolverInstance;
    handlePreflightCredentialRevoke(req: Request, res: Response): void;
    revokeCredential(req: Request, res: Response): Promise<void>;
    handlePreflightCredentialAuthorize(req: Request, res: Response): void;
    authorizeCredential(req: Request, res: Response): Promise<string>;
}
