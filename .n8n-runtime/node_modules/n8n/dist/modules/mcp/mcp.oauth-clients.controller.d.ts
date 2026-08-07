import { DeleteOAuthClientResponseDto, ListOAuthClientsResponseDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { McpOAuthService } from './mcp-oauth-service';
export declare class McpOAuthClientsController {
    private readonly mcpOAuthService;
    private readonly logger;
    constructor(mcpOAuthService: McpOAuthService, logger: Logger);
    getAllClients(req: AuthenticatedRequest, _res: Response): Promise<ListOAuthClientsResponseDto>;
    deleteClient(req: AuthenticatedRequest, _res: Response, clientId: string): Promise<DeleteOAuthClientResponseDto>;
}
