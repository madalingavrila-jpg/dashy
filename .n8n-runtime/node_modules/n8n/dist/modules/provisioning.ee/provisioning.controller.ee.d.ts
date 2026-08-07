import { AuthenticatedRequest } from '@n8n/db';
import { LicenseState } from '@n8n/backend-common';
import { ProvisioningService } from './provisioning.service.ee';
import { Response } from 'express';
export declare class ProvisioningController {
    private readonly provisioningService;
    private readonly licenseState;
    constructor(provisioningService: ProvisioningService, licenseState: LicenseState);
    getConfig(_req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | import("@n8n/api-types").ProvisioningConfigDto>;
    patchConfig(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>> | import("@n8n/api-types").ProvisioningConfigDto>;
}
