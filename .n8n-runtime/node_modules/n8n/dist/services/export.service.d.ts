import { Logger } from '@n8n/backend-common';
import { DataSource } from '@n8n/typeorm';
import { Cipher } from 'n8n-core';
export declare class ExportService {
    private readonly logger;
    private readonly dataSource;
    private readonly cipher;
    constructor(logger: Logger, dataSource: DataSource, cipher: Cipher);
    private clearExistingEntityFiles;
    private exportMigrationsTable;
    exportEntities(outputDir: string, excludedTables?: Set<string>, keyFilePath?: string): Promise<void>;
}
