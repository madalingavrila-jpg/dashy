import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { ApproveConsentRequestDto } from './dto/approve-consent-request.dto';
import { McpOAuthConsentService } from './mcp-oauth-consent.service';
import { OAuthSessionService } from './oauth-session.service';
export declare class McpConsentController {
    private readonly logger;
    private readonly consentService;
    private readonly oauthSessionService;
    constructor(logger: Logger, consentService: McpOAuthConsentService, oauthSessionService: OAuthSessionService);
    getConsentDetails(req: AuthenticatedRequest, res: Response): Promise<void>;
    approveConsent(req: AuthenticatedRequest, res: Response, payload: ApproveConsentRequestDto): Promise<void>;
    private sendErrorResponse;
    private sendInvalidSessionError;
    private getAndValidateSessionToken;
}
