import { ApiKey, ApiKeyRepository, User, UserRepository } from '@n8n/db';
import { EntityManager } from '@n8n/typeorm';
import { AccessTokenRepository } from './database/repositories/oauth-access-token.repository';
import { UserWithContext } from './mcp.types';
import { JwtService } from '../../services/jwt.service';
export declare class McpServerApiKeyService {
    private readonly apiKeyRepository;
    private readonly jwtService;
    private readonly userRepository;
    private readonly accessTokenRepository;
    constructor(apiKeyRepository: ApiKeyRepository, jwtService: JwtService, userRepository: UserRepository, accessTokenRepository: AccessTokenRepository);
    createMcpServerApiKey(user: User, trx?: EntityManager): Promise<ApiKey>;
    findServerApiKeyForUser(user: User, { redact }?: {
        redact?: boolean | undefined;
    }): Promise<ApiKey | null>;
    getUserForApiKey(apiKey: string): Promise<User | null>;
    verifyApiKey(apiKey: string): Promise<UserWithContext>;
    getUserForAccessToken(token: string): Promise<User | null>;
    deleteAllMcpApiKeysForUser(user: User, trx?: EntityManager): Promise<void>;
    private redactApiKey;
    getOrCreateApiKey(user: User): Promise<ApiKey>;
    rotateMcpServerApiKey(user: User): Promise<ApiKey>;
}
