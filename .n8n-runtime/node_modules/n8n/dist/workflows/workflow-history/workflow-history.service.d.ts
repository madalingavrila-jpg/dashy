import { Logger } from '@n8n/backend-common';
import { UpdateWorkflowHistoryVersionDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { WorkflowHistory, WorkflowHistoryRepository } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import type { IWorkflowBase } from 'n8n-workflow';
import { WorkflowFinderService } from '../workflow-finder.service';
import { EventService } from '../../events/event.service';
export declare class WorkflowHistoryService {
    private readonly logger;
    private readonly workflowHistoryRepository;
    private readonly workflowFinderService;
    private readonly eventService;
    constructor(logger: Logger, workflowHistoryRepository: WorkflowHistoryRepository, workflowFinderService: WorkflowFinderService, eventService: EventService);
    getList(user: User, workflowId: string, take: number, skip: number): Promise<Array<Omit<WorkflowHistory, 'nodes' | 'connections'>>>;
    getVersion(user: User, workflowId: string, versionId: string, settings?: {
        includePublishHistory?: boolean;
    }): Promise<WorkflowHistory>;
    findVersion(workflowId: string, versionId: string): Promise<WorkflowHistory | null>;
    saveVersion(user: User | string, workflow: {
        versionId: string;
        nodes: IWorkflowBase['nodes'];
        connections: IWorkflowBase['connections'];
    }, workflowId: string, autosaved?: boolean, transactionManager?: EntityManager): Promise<void>;
    updateVersionForUser(user: User, workflowId: string, versionId: string, updateData: UpdateWorkflowHistoryVersionDto): Promise<void>;
    updateVersion(workflowId: string, versionId: string, updateData: Omit<Partial<WorkflowHistory>, 'versionId' | 'workflowId' | 'createdAt' | 'updatedAt'>): Promise<void>;
    getVersionsByIds(user: User, workflowId: string, versionIds: string[]): Promise<Array<{
        versionId: string;
        createdAt: Date;
    }>>;
}
