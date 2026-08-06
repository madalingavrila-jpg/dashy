import { NextFunction, Response, Request } from 'express';
import { McpServerApiKeyService } from './mcp-api-key.service';
import { McpOAuthTokenService } from './mcp-oauth-token.service';
import type { UserWithContext } from './mcp.types';
import { JwtService } from '../../services/jwt.service';
import { Telemetry } from '../../telemetry';
export declare class McpServerMiddlewareService {
    private readonly mcpServerApiKeyService;
    private readonly mcpAuthTokenService;
    private readonly jwtService;
    private readonly telemetry;
    constructor(mcpServerApiKeyService: McpServerApiKeyService, mcpAuthTokenService: McpOAuthTokenService, jwtService: JwtService, telemetry: Telemetry);
    getUserForToken(token: string): Promise<UserWithContext>;
    getAuthMiddleware(): (req: Request, res: Response, next: NextFunction) => Promise<void>;
    private extractBearerToken;
    private responseWithUnauthorized;
    private trackUnauthorizedEvent;
}
