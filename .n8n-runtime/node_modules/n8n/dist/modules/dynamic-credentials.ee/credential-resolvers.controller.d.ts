import { CreateCredentialResolverDto, CredentialResolver, UpdateCredentialResolverDto, CredentialResolverType } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Response } from 'express';
import { DynamicCredentialResolverService } from './services/credential-resolver.service';
export declare class CredentialResolversController {
    private readonly service;
    constructor(service: DynamicCredentialResolverService);
    listResolvers(_req: AuthenticatedRequest, _res: Response): Promise<CredentialResolver[]>;
    listResolverTypes(_req: AuthenticatedRequest, _res: Response): CredentialResolverType[];
    createResolver(req: AuthenticatedRequest, _res: Response, dto: CreateCredentialResolverDto): Promise<CredentialResolver>;
    getResolver(_req: AuthenticatedRequest, _res: Response, id: string): Promise<CredentialResolver>;
    updateResolver(req: AuthenticatedRequest, _res: Response, id: string, dto: UpdateCredentialResolverDto): Promise<CredentialResolver>;
    deleteResolver(_req: AuthenticatedRequest, _res: Response, id: string): Promise<{
        success: true;
    }>;
}
