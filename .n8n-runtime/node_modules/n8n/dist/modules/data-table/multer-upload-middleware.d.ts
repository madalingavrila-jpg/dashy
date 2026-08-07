import { GlobalConfig } from '@n8n/config';
import type { RequestHandler } from 'express';
import { DataTableSizeValidator } from './data-table-size-validator.service';
import { DataTableRepository } from './data-table.repository';
import { type UploadMiddleware } from './types';
export declare class MulterUploadMiddleware implements UploadMiddleware {
    private readonly globalConfig;
    private readonly sizeValidator;
    private readonly dataTableRepository;
    private upload;
    private readonly uploadDir;
    constructor(globalConfig: GlobalConfig, sizeValidator: DataTableSizeValidator, dataTableRepository: DataTableRepository);
    private ensureUploadDirExists;
    single(fieldName: string): RequestHandler;
}
