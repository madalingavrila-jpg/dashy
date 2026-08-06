import type { ModuleInterface } from '@n8n/decorators';
export declare class McpModule implements ModuleInterface {
    init(): Promise<void>;
    settings(): Promise<{
        mcpAccessEnabled: boolean;
    }>;
    entities(): Promise<never>;
    shutdown(): Promise<void>;
}
