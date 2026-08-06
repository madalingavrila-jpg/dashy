import { UpdateSecuritySettingsDto } from '@n8n/api-types';
import { type AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { EventService } from '../events/event.service';
import { SecuritySettingsService } from '../services/security-settings.service';
export declare class SecuritySettingsController {
    private readonly securitySettingsService;
    private readonly eventService;
    constructor(securitySettingsService: SecuritySettingsService, eventService: EventService);
    getSecuritySettings(_req: AuthenticatedRequest, _res: Response): Promise<{
        publishedPersonalWorkflowsCount: number;
        sharedPersonalWorkflowsCount: number;
        sharedPersonalCredentialsCount: number;
        personalSpacePublishing: boolean;
        personalSpaceSharing: boolean;
    }>;
    updateSecuritySettings(req: AuthenticatedRequest, _res: Response, dto: UpdateSecuritySettingsDto): Promise<Record<string, boolean>>;
}
