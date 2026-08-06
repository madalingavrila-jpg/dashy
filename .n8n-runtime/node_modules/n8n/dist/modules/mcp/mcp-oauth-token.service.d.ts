import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types';
import { OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth';
import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { AccessTokenRepository } from './database/repositories/oauth-access-token.repository';
import { RefreshTokenRepository } from './database/repositories/oauth-refresh-token.repository';
import { UserWithContext } from './mcp.types';
import { JwtService } from '../../services/jwt.service';
export declare class McpOAuthTokenService {
    private readonly logger;
    private readonly jwtService;
    private readonly userRepository;
    private readonly accessTokenRepository;
    private readonly refreshTokenRepository;
    private readonly MCP_AUDIENCE;
    private readonly ACCESS_TOKEN_EXPIRY_SECONDS;
    private readonly REFRESH_TOKEN_EXPIRY_MS;
    constructor(logger: Logger, jwtService: JwtService, userRepository: UserRepository, accessTokenRepository: AccessTokenRepository, refreshTokenRepository: RefreshTokenRepository);
    generateTokenPair(userId: string, clientId: string): {
        accessToken: string;
        refreshToken: string;
    };
    saveTokenPair(accessToken: string, refreshToken: string, clientId: string, userId: string): Promise<void>;
    validateAndRotateRefreshToken(refreshToken: string, clientId: string): Promise<OAuthTokens>;
    verifyAccessToken(token: string): Promise<AuthInfo>;
    verifyOAuthAccessToken(token: string): Promise<UserWithContext>;
    revokeAccessToken(token: string, clientId: string): Promise<boolean>;
    revokeRefreshToken(token: string, clientId: string): Promise<boolean>;
}
