"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageEventBus = void 0;
const backend_common_1 = require("@n8n/backend-common");
const config_1 = require("@n8n/config");
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const typeorm_1 = require("@n8n/typeorm");
const events_1 = __importDefault(require("events"));
const uniqBy_1 = __importDefault(require("lodash/uniqBy"));
const execution_recovery_service_1 = require("../../executions/execution-recovery.service");
const event_message_ai_node_1 = require("../event-message-classes/event-message-ai-node");
const event_message_audit_1 = require("../event-message-classes/event-message-audit");
const event_message_execution_1 = require("../event-message-classes/event-message-execution");
const event_message_node_1 = require("../event-message-classes/event-message-node");
const event_message_queue_1 = require("../event-message-classes/event-message-queue");
const event_message_runner_1 = require("../event-message-classes/event-message-runner");
const event_message_workflow_1 = require("../event-message-classes/event-message-workflow");
const message_event_bus_log_writer_1 = require("../message-event-bus-writer/message-event-bus-log-writer");
let MessageEventBus = class MessageEventBus extends events_1.default {
    constructor(logger, executionRepository, workflowRepository, recoveryService, globalConfig) {
        super();
        this.logger = logger;
        this.executionRepository = executionRepository;
        this.workflowRepository = workflowRepository;
        this.recoveryService = recoveryService;
        this.globalConfig = globalConfig;
        this.isInitialized = false;
    }
    async initialize(options) {
        if (this.isInitialized) {
            return;
        }
        this.logger.debug('Initializing event bus...');
        this.logger.debug('Initializing event writer');
        if (options?.workerId || options?.webhookProcessorId) {
            const logBaseName = this.globalConfig.eventBus.logWriter.logBaseName +
                (options.workerId ? '-worker' : '-webhook-processor');
            this.logWriter = await message_event_bus_log_writer_1.MessageEventBusLogWriter.getInstance({
                logBaseName,
            });
        }
        else {
            this.logWriter = await message_event_bus_log_writer_1.MessageEventBusLogWriter.getInstance();
        }
        if (!this.logWriter) {
            this.logger.warn('Could not initialize event writer');
        }
        if (options?.skipRecoveryPass) {
            this.logger.debug('Skipping unsent event check');
        }
        else {
            this.logger.debug('Checking for unsent event messages');
            const unsentAndUnfinished = await this.getUnsentAndUnfinishedExecutions();
            this.logger.debug(`Start logging into ${this.logWriter?.getLogFileName() ?? 'unknown filename'} `);
            this.logWriter?.startLogging();
            await this.send(unsentAndUnfinished.unsentMessages);
            let unfinishedExecutionIds = Object.keys(unsentAndUnfinished.unfinishedExecutions);
            if (this.globalConfig.executions.mode !== 'queue') {
                const dbUnfinishedExecutionIds = (await this.executionRepository.find({
                    where: {
                        status: (0, typeorm_1.In)(['running', 'unknown']),
                    },
                    select: ['id'],
                })).map((e) => e.id);
                unfinishedExecutionIds = Array.from(new Set([...unfinishedExecutionIds, ...dbUnfinishedExecutionIds]));
            }
            if (unfinishedExecutionIds.length > 0) {
                const activeWorkflows = await this.workflowRepository.find({
                    where: { activeVersionId: (0, typeorm_1.Not)((0, typeorm_1.IsNull)()) },
                    select: ['id', 'name'],
                });
                if (activeWorkflows.length > 0) {
                    this.logger.info('Currently active workflows:');
                    for (const workflowData of activeWorkflows) {
                        this.logger.info(`   - ${workflowData.name} (ID: ${workflowData.id})`);
                    }
                }
                const recoveryAlreadyAttempted = this.logWriter?.isRecoveryProcessRunning();
                if (recoveryAlreadyAttempted || this.globalConfig.eventBus.crashRecoveryMode === 'simple') {
                    await this.executionRepository.markAsCrashed(unfinishedExecutionIds);
                    if (recoveryAlreadyAttempted)
                        this.logger.warn('Skipped recovery process since it previously failed.');
                }
                else {
                    this.logWriter?.startRecoveryProcess();
                    const recoveredIds = [];
                    const crashedWorkflowIds = new Set();
                    for (const executionId of unfinishedExecutionIds) {
                        const logMessages = unsentAndUnfinished.unfinishedExecutions[executionId];
                        const recoveredExecution = await this.recoveryService.recoverFromLogs(executionId, logMessages ?? []);
                        if (recoveredExecution) {
                            if (recoveredExecution.status === 'crashed') {
                                crashedWorkflowIds.add(recoveredExecution.workflowId);
                            }
                            recoveredIds.push(executionId);
                        }
                    }
                    if (recoveredIds.length > 0) {
                        this.logger.warn(`Found unfinished executions: ${recoveredIds.join(', ')}`);
                        this.logger.info('This could be due to a crash of an active workflow or a restart of n8n');
                    }
                    if (this.globalConfig.executions.recovery.workflowDeactivationEnabled &&
                        crashedWorkflowIds.size > 0) {
                        await this.recoveryService.autoDeactivateWorkflowsIfNeeded(crashedWorkflowIds);
                    }
                }
                this.logWriter?.endRecoveryProcess();
            }
        }
        if (this.globalConfig.eventBus.checkUnsentInterval > 0) {
            if (this.pushIntervalTimer) {
                clearInterval(this.pushIntervalTimer);
            }
            this.pushIntervalTimer = setInterval(async () => {
                await this.trySendingUnsent();
            }, this.globalConfig.eventBus.checkUnsentInterval);
        }
        this.logger.debug('MessageEventBus initialized');
        this.isInitialized = true;
    }
    async trySendingUnsent(msgs) {
        const unsentMessages = msgs ?? (await this.getEventsUnsent());
        if (unsentMessages.length > 0) {
            this.logger.debug(`Found unsent event messages: ${unsentMessages.length}`);
            for (const unsentMsg of unsentMessages) {
                this.logger.debug(`Retrying: ${unsentMsg.id} ${unsentMsg.__type}`);
                await this.emitMessage(unsentMsg);
            }
        }
    }
    async close() {
        this.logger.debug('Shutting down event writer...');
        await this.logWriter?.close();
        this.isInitialized = false;
        this.logger.debug('EventBus shut down.');
    }
    async send(msgs) {
        if (!Array.isArray(msgs)) {
            msgs = [msgs];
        }
        for (const msg of msgs) {
            this.logWriter?.putMessage(msg);
            await this.emitMessage(msg);
        }
    }
    confirmSent(msg, source) {
        this.logWriter?.confirmMessageSent(msg.id, source);
    }
    async emitMessage(msg) {
        this.emit('metrics.eventBus.event', msg);
        this.emitMessageWithCallback('message', msg);
    }
    emitMessageWithCallback(eventName, msg) {
        const confirmCallback = (message, src) => this.confirmSent(message, src);
        return this.emit(eventName, msg, confirmCallback);
    }
    async getEventsAll() {
        const queryResult = await this.logWriter?.getMessagesAll();
        const filtered = (0, uniqBy_1.default)(queryResult, 'id');
        return filtered;
    }
    async getEventsSent() {
        const queryResult = await this.logWriter?.getMessagesSent();
        const filtered = (0, uniqBy_1.default)(queryResult, 'id');
        return filtered;
    }
    async getEventsUnsent() {
        const queryResult = await this.logWriter?.getMessagesUnsent();
        const filtered = (0, uniqBy_1.default)(queryResult, 'id');
        return filtered;
    }
    async getUnfinishedExecutions() {
        const queryResult = await this.logWriter?.getUnfinishedExecutions();
        return queryResult;
    }
    async getUnsentAndUnfinishedExecutions() {
        const queryResult = await this.logWriter?.getUnsentAndUnfinishedExecutions();
        return queryResult;
    }
    async getEventsByExecutionId(executionId, logHistory) {
        const result = await this.logWriter?.getMessagesByExecutionId(executionId, logHistory);
        return result;
    }
    async sendAuditEvent(options) {
        await this.send(new event_message_audit_1.EventMessageAudit(options));
    }
    async sendWorkflowEvent(options) {
        await this.send(new event_message_workflow_1.EventMessageWorkflow(options));
    }
    async sendNodeEvent(options) {
        await this.send(new event_message_node_1.EventMessageNode(options));
    }
    async sendAiNodeEvent(options) {
        await this.send(new event_message_ai_node_1.EventMessageAiNode(options));
    }
    async sendExecutionEvent(options) {
        await this.send(new event_message_execution_1.EventMessageExecution(options));
    }
    async sendRunnerEvent(options) {
        await this.send(new event_message_runner_1.EventMessageRunner(options));
    }
    async sendQueueEvent(options) {
        await this.send(new event_message_queue_1.EventMessageQueue(options));
    }
};
exports.MessageEventBus = MessageEventBus;
exports.MessageEventBus = MessageEventBus = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [backend_common_1.Logger,
        db_1.ExecutionRepository,
        db_1.WorkflowRepository,
        execution_recovery_service_1.ExecutionRecoveryService,
        config_1.GlobalConfig])
], MessageEventBus);
//# sourceMappingURL=message-event-bus.js.map