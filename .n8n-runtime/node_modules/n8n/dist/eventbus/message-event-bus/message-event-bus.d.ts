import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import EventEmitter from 'events';
import { ExecutionRecoveryService } from '../../executions/execution-recovery.service';
import type { EventMessageTypes } from '../event-message-classes/';
import { type EventMessageAiNodeOptions } from '../event-message-classes/event-message-ai-node';
import type { EventMessageAuditOptions } from '../event-message-classes/event-message-audit';
import type { EventMessageConfirmSource } from '../event-message-classes/event-message-confirm';
import type { EventMessageExecutionOptions } from '../event-message-classes/event-message-execution';
import type { EventMessageNodeOptions } from '../event-message-classes/event-message-node';
import type { EventMessageQueueOptions } from '../event-message-classes/event-message-queue';
import type { EventMessageRunnerOptions } from '../event-message-classes/event-message-runner';
import type { EventMessageWorkflowOptions } from '../event-message-classes/event-message-workflow';
import { MessageEventBusLogWriter } from '../message-event-bus-writer/message-event-bus-log-writer';
export type EventMessageReturnMode = 'sent' | 'unsent' | 'all' | 'unfinished';
export interface MessageWithCallback {
    msg: EventMessageTypes;
    confirmCallback: (message: EventMessageTypes, src: EventMessageConfirmSource) => void;
}
export interface MessageEventBusInitializeOptions {
    skipRecoveryPass?: boolean;
    workerId?: string;
    webhookProcessorId?: string;
}
export declare class MessageEventBus extends EventEmitter {
    private readonly logger;
    private readonly executionRepository;
    private readonly workflowRepository;
    private readonly recoveryService;
    private readonly globalConfig;
    private isInitialized;
    logWriter: MessageEventBusLogWriter;
    private pushIntervalTimer;
    constructor(logger: Logger, executionRepository: ExecutionRepository, workflowRepository: WorkflowRepository, recoveryService: ExecutionRecoveryService, globalConfig: GlobalConfig);
    initialize(options?: MessageEventBusInitializeOptions): Promise<void>;
    private trySendingUnsent;
    close(): Promise<void>;
    send(msgs: EventMessageTypes | EventMessageTypes[]): Promise<void>;
    confirmSent(msg: EventMessageTypes, source?: EventMessageConfirmSource): void;
    private emitMessage;
    private emitMessageWithCallback;
    getEventsAll(): Promise<EventMessageTypes[]>;
    getEventsSent(): Promise<EventMessageTypes[]>;
    getEventsUnsent(): Promise<EventMessageTypes[]>;
    getUnfinishedExecutions(): Promise<Record<string, EventMessageTypes[]>>;
    getUnsentAndUnfinishedExecutions(): Promise<{
        unsentMessages: EventMessageTypes[];
        unfinishedExecutions: Record<string, EventMessageTypes[] | undefined>;
    }>;
    getEventsByExecutionId(executionId: string, logHistory?: number): Promise<EventMessageTypes[]>;
    sendAuditEvent(options: EventMessageAuditOptions): Promise<void>;
    sendWorkflowEvent(options: EventMessageWorkflowOptions): Promise<void>;
    sendNodeEvent(options: EventMessageNodeOptions): Promise<void>;
    sendAiNodeEvent(options: EventMessageAiNodeOptions): Promise<void>;
    sendExecutionEvent(options: EventMessageExecutionOptions): Promise<void>;
    sendRunnerEvent(options: EventMessageRunnerOptions): Promise<void>;
    sendQueueEvent(options: EventMessageQueueOptions): Promise<void>;
}
