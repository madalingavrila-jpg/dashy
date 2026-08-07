import type { AuthenticatedRequest } from '@n8n/db';
import { DynamicTemplatesService } from '../services/dynamic-templates.service';
export declare class DynamicTemplatesController {
    private readonly dynamicTemplatesService;
    constructor(dynamicTemplatesService: DynamicTemplatesService);
    get(_req: AuthenticatedRequest): Promise<{
        templates: {
            [x: string]: unknown;
        }[];
    }>;
}
