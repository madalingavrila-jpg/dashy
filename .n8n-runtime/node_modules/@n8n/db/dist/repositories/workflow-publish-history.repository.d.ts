import { DataSource, Repository } from '@n8n/typeorm';
import { WorkflowPublishHistory } from '../entities';
export declare class WorkflowPublishHistoryRepository extends Repository<WorkflowPublishHistory> {
    constructor(dataSource: DataSource);
    addRecord({ workflowId, versionId, event, userId, }: Pick<WorkflowPublishHistory, 'event' | 'workflowId' | 'versionId' | 'userId'>): Promise<void>;
    getPublishedVersions(workflowId: string): Promise<Array<Pick<WorkflowPublishHistory, 'versionId'>>>;
}
