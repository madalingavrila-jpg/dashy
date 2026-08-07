import { DatabaseConfig } from '@n8n/config';
import { DataSource, Repository } from '@n8n/typeorm';
import { BinaryDataFile } from '../entities';
export declare class BinaryDataRepository extends Repository<BinaryDataFile> {
    private readonly databaseConfig;
    constructor(dataSource: DataSource, databaseConfig: DatabaseConfig);
    copyStoredFile(sourceFileId: string, targetFileId: string, targetSourceType: string, targetSourceId: string): Promise<boolean>;
    private getTableName;
    private getColumnName;
}
