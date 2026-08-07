import { WorkflowHistoryRepository } from '@n8n/db';
import { License } from '../../license';
export declare class WorkflowHistoryManager {
    private workflowHistoryRepo;
    private license;
    pruneTimer?: NodeJS.Timeout;
    constructor(workflowHistoryRepo: WorkflowHistoryRepository, license: License);
    init(): void;
    shutdown(): void;
    prune(): Promise<void>;
}
