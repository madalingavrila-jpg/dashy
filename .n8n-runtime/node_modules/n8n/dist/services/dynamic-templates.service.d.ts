import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
export declare const REQUEST_TIMEOUT_MS = 5000;
type DynamicTemplate = Record<string, unknown>;
export declare class DynamicTemplatesService {
    private readonly logger;
    private readonly globalConfig;
    constructor(logger: Logger, globalConfig: GlobalConfig);
    fetchDynamicTemplates(): Promise<DynamicTemplate[]>;
}
export {};
