import { Logger } from '@n8n/backend-common';
import type { IExecutionResponse } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import type express from 'express';
import { InstanceSettings } from 'n8n-core';
import { type IWorkflowBase, Workflow } from 'n8n-workflow';
import { WebhookService } from './webhook.service';
import type { IWebhookResponseCallbackData, IWebhookManager, WaitingWebhookRequest } from './webhook.types';
import { NodeTypes } from '../node-types';
export declare class WaitingWebhooks implements IWebhookManager {
    protected readonly logger: Logger;
    protected readonly nodeTypes: NodeTypes;
    private readonly executionRepository;
    private readonly webhookService;
    private readonly instanceSettings;
    protected includeForms: boolean;
    constructor(logger: Logger, nodeTypes: NodeTypes, executionRepository: ExecutionRepository, webhookService: WebhookService, instanceSettings: InstanceSettings);
    findAccessControlOptions(): Promise<{
        allowedOrigins: string;
    }>;
    protected logReceivedWebhook(method: string, executionId: string): void;
    protected disableNode(execution: IExecutionResponse, _method?: string): void;
    private isSendAndWaitRequest;
    protected createWorkflow(workflowData: IWorkflowBase): Workflow;
    protected getExecution(executionId: string): Promise<IExecutionResponse | undefined>;
    validateSignatureInRequest(req: express.Request): boolean;
    executeWebhook(req: WaitingWebhookRequest, res: express.Response): Promise<IWebhookResponseCallbackData>;
    protected getWebhookExecutionData({ execution, req, res, lastNodeExecuted, executionId, suffix, }: {
        execution: IExecutionResponse;
        req: WaitingWebhookRequest;
        res: express.Response;
        lastNodeExecuted: string;
        executionId: string;
        suffix?: string;
    }): Promise<IWebhookResponseCallbackData>;
}
