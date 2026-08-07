import { DataSource, Repository } from '@n8n/typeorm';
import { DiffMetaData, DiffRule } from 'n8n-workflow';
import { WorkflowHistory } from '../entities';
import { WorkflowPublishHistoryRepository } from './workflow-publish-history.repository';
export declare class WorkflowHistoryRepository extends Repository<WorkflowHistory> {
    private readonly workflowPublishHistoryRepository;
    constructor(dataSource: DataSource, workflowPublishHistoryRepository: WorkflowPublishHistoryRepository);
    deleteEarlierThan(date: Date): Promise<import("@n8n/typeorm").DeleteResult>;
    deleteEarlierThanExceptCurrentAndActive(date: Date, preserveNamedVersions?: boolean): Promise<import("@n8n/typeorm").DeleteResult>;
    private makeSkipActiveAndNamedVersionsRule;
    getWorkflowIdsInRange(startDate: Date, endDate: Date): Promise<string[]>;
    pruneHistory(workflowId: string, startDate: Date, endDate: Date, rules?: DiffRule[], skipRules?: DiffRule[], metaData?: Partial<Record<keyof DiffMetaData, boolean>>): Promise<{
        seen: number;
        deleted: number;
    }>;
}
