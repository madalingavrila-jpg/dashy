import { Logger } from '@n8n/backend-common';
import { z } from 'zod';
import { InstanceSettings } from './instance-settings';
export declare const EXECUTION_DATA_STORAGE_MODES: readonly ["database", "filesystem"];
declare const modeSchema: z.ZodEnum<["database", "filesystem"]>;
export declare class StorageConfig {
    mode: z.infer<typeof modeSchema>;
    get modeTag(): 'db' | 'fs';
    storagePath: string;
    private readonly instanceSettings;
    private readonly logger;
    constructor(instanceSettings: InstanceSettings, logger: Logger);
    sanitize(): void;
    private migrateStorageDir;
    private isIgnorableRenameError;
}
export {};
