import { GlobalConfig } from '@n8n/config';
import { InstanceSettings } from 'n8n-core';
export declare class DataTableFileCleanupService {
    private readonly globalConfig;
    private readonly instanceSettings;
    private readonly uploadDir;
    private cleanupInterval?;
    constructor(globalConfig: GlobalConfig, instanceSettings: InstanceSettings);
    private isErrnoException;
    start(): Promise<void>;
    shutdown(): Promise<void>;
    private cleanupOrphanedFiles;
    deleteFile(fileId: string): Promise<void>;
}
