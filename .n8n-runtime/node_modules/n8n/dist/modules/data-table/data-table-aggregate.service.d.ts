import type { ListDataTableQueryDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { User } from '@n8n/db';
import { ProjectService } from '../../services/project.service.ee';
import { DataTableRepository } from './data-table.repository';
export declare class DataTableAggregateService {
    private readonly dataTableRepository;
    private readonly projectService;
    private readonly logger;
    constructor(dataTableRepository: DataTableRepository, projectService: ProjectService, logger: Logger);
    start(): Promise<void>;
    shutdown(): Promise<void>;
    getManyAndCount(user: User, options: ListDataTableQueryDto): Promise<{
        count: number;
        data: import("./data-table.entity").DataTable[];
    }>;
}
