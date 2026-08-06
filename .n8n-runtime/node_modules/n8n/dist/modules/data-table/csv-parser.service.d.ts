import { GlobalConfig } from '@n8n/config';
export interface CsvColumnMetadata {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date';
}
export interface CsvMetadata {
    rowCount: number;
    columnCount: number;
    columns: CsvColumnMetadata[];
}
export declare class CsvParserService {
    private readonly globalConfig;
    private readonly uploadDir;
    private readonly DEFAULT_COLUMN_PREFIX;
    constructor(globalConfig: GlobalConfig);
    private processRowWithoutHeaders;
    parseFile(fileId: string, hasHeaders?: boolean): Promise<CsvMetadata>;
    parseFileData(fileId: string, hasHeaders?: boolean): Promise<Array<Record<string, string>>>;
    private getCompatibleTypes;
    private inferColumnType;
    private isDate;
}
