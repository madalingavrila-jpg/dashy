import type { RunningJobSummary } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { InstanceSettings } from 'n8n-core';
import { EventService } from '../events/event.service';
import { ManualExecutionService } from '../manual-execution.service';
import { NodeTypes } from '../node-types';
import type { Job, JobId, JobResult } from './scaling.types';
export declare class JobProcessor {
    private readonly logger;
    private readonly executionRepository;
    private readonly workflowRepository;
    private readonly nodeTypes;
    private readonly instanceSettings;
    private readonly manualExecutionService;
    private readonly executionsConfig;
    private readonly eventService;
    private readonly runningJobs;
    constructor(logger: Logger, executionRepository: ExecutionRepository, workflowRepository: WorkflowRepository, nodeTypes: NodeTypes, instanceSettings: InstanceSettings, manualExecutionService: ManualExecutionService, executionsConfig: ExecutionsConfig, eventService: EventService);
    processJob(job: Job): Promise<JobResult>;
    private deriveJobFinishedProps;
    private fetchJobFinishedResult;
    stopJob(jobId: JobId): void;
    getRunningJobIds(): JobId[];
    getRunningJobsSummary(): RunningJobSummary[];
    private encodeWebhookResponse;
    private invokeTool;
}
