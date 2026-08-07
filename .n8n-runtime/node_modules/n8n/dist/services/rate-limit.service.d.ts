import type { RateLimiterLimits, UserKeyedRateLimiterConfig } from '@n8n/decorators';
import { BodyKeyedRateLimiterConfig } from '@n8n/decorators';
import type { RequestHandler } from 'express';
import type { ZodClass } from '@n8n/api-types';
export declare class RateLimitService {
    createIpRateLimitMiddleware(rateLimit: boolean | RateLimiterLimits): RequestHandler;
    createBodyKeyedRateLimitMiddleware(bodyDtoClass: ZodClass, config: BodyKeyedRateLimiterConfig): RequestHandler;
    createUserKeyedRateLimitMiddleware(config: UserKeyedRateLimiterConfig): RequestHandler;
    private extractBodyIdentifier;
    private extractUserIdentifier;
}
