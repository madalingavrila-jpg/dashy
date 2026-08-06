import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { type IExecutionResponse, ProjectRelationRepository } from '@n8n/db';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { InstanceSettings } from 'n8n-core';
import { Push } from '../push';
import { OwnershipService } from '../services/ownership.service';
import { UserManagementMailer } from '../user-management/email/user-management-mailer';
import type { EventMessageTypes } from '../eventbus/event-message-classes';
export declare class ExecutionRecoveryService {
    private readonly logger;
    private readonly instanceSettings;
    private readonly push;
    private readonly executionRepository;
    private readonly executionsConfig;
    private readonly workflowRepository;
    private readonly userManagementMailer;
    private readonly ownershipService;
    private readonly projectRelationRepository;
    constructor(logger: Logger, instanceSettings: InstanceSettings, push: Push, executionRepository: ExecutionRepository, executionsConfig: ExecutionsConfig, workflowRepository: WorkflowRepository, userManagementMailer: UserManagementMailer, ownershipService: OwnershipService, projectRelationRepository: ProjectRelationRepository);
    autoDeactivateWorkflowsIfNeeded(workflowIds: Set<string>): Promise<void>;
    recoverFromLogs(executionId: string, messages: EventMessageTypes[]): Promise<IExecutionResponse | null | undefined>;
    private amend;
    private amendWithoutLogs;
    private toRelevantMessages;
    private toStoppedAt;
    private runHooks;
    private getAutodeactivationRecipient;
}
