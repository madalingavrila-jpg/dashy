import { StaticRouterMetadata } from '@n8n/decorators';
import type { Response, Request } from 'express';
import { UrlService } from '../../services/url.service';
export declare class McpOAuthController {
    private readonly urlService;
    constructor(urlService: UrlService);
    private setCorsHeaders;
    static routers: StaticRouterMetadata[];
    metadataOptions(_req: Request, res: Response): void;
    metadata(_req: Request, res: Response): void;
    protectedResourceMetadataOptions(_req: Request, res: Response): void;
    protectedResourceMetadata(_req: Request, res: Response): void;
}
