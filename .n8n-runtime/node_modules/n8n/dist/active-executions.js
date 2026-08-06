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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveExecutions = void 0;
const backend_common_1 = require("@n8n/backend-common");
const config_1 = require("@n8n/config");
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const n8n_workflow_1 = require("n8n-workflow");
const node_assert_1 = require("node:assert");
const execution_not_found_error_1 = require("./errors/execution-not-found-error");
const execution_already_resuming_error_1 = require("./errors/execution-already-resuming.error");
const execution_persistence_1 = require("./executions/execution-persistence");
const utils_1 = require("./utils");
const concurrency_control_service_1 = require("./concurrency/concurrency-control.service");
const event_service_1 = require("./events/event.service");
const concurrency_capacity_reservation_1 = require("./concurrency/concurrency-capacity-reservation");
let ActiveExecutions = class ActiveExecutions {
    constructor(logger, executionRepository, executionPersistence, concurrencyControl, eventService, executionsConfig) {
        this.logger = logger;
        this.executionRepository = executionRepository;
        this.executionPersistence = executionPersistence;
        this.concurrencyControl = concurrencyControl;
        this.eventService = eventService;
        this.executionsConfig = executionsConfig;
        this.activeExecutions = {};
        this.responseModes = new Map();
    }
    has(executionId) {
        return this.activeExecutions[executionId] !== undefined;
    }
    async add(executionData, maybeExecutionId) {
        let executionStatus = maybeExecutionId ? 'running' : 'new';
        const mode = executionData.executionMode;
        const capacityReservation = new concurrency_capacity_reservation_1.ConcurrencyCapacityReservation(this.concurrencyControl);
        try {
            if (maybeExecutionId === undefined) {
                const fullExecutionData = {
                    data: executionData.executionData,
                    mode,
                    finished: false,
                    workflowData: executionData.workflowData,
                    status: executionStatus,
                    workflowId: executionData.workflowData.id,
                    retryOf: executionData.retryOf ?? undefined,
                };
                const workflowId = executionData.workflowData.id;
                if (workflowId !== undefined && (0, utils_1.isWorkflowIdValid)(workflowId)) {
                    fullExecutionData.workflowId = workflowId;
                }
                maybeExecutionId = await this.executionPersistence.create(fullExecutionData);
                (0, node_assert_1.strict)(maybeExecutionId);
                await capacityReservation.reserve({ mode, executionId: maybeExecutionId });
                if (this.executionsConfig.mode === 'regular') {
                    await this.executionRepository.setRunning(maybeExecutionId);
                }
                executionStatus = 'running';
            }
            else {
                await capacityReservation.reserve({ mode, executionId: maybeExecutionId });
                const execution = {
                    id: maybeExecutionId,
                    data: executionData.executionData,
                    waitTill: null,
                    status: executionStatus,
                };
                const updateSucceeded = await this.executionRepository.updateExistingExecution(maybeExecutionId, execution, { requireStatus: 'waiting' });
                if (!updateSucceeded) {
                    throw new execution_already_resuming_error_1.ExecutionAlreadyResumingError(maybeExecutionId);
                }
            }
        }
        catch (error) {
            capacityReservation.release();
            throw error;
        }
        const executionId = maybeExecutionId;
        const resumingExecution = this.activeExecutions[executionId];
        const postExecutePromise = (0, n8n_workflow_1.createDeferredPromise)();
        const execution = {
            executionData,
            startedAt: resumingExecution?.startedAt ?? new Date(),
            postExecutePromise,
            status: executionStatus,
            responsePromise: resumingExecution?.responsePromise,
            httpResponse: executionData.httpResponse ?? undefined,
        };
        this.activeExecutions[executionId] = execution;
        void postExecutePromise.promise
            .catch((error) => {
            if (error instanceof n8n_workflow_1.ExecutionCancelledError)
                return;
            throw error;
        })
            .finally(() => {
            capacityReservation.release();
            if (execution.status === 'waiting') {
                delete execution.workflowExecution;
            }
            else {
                delete this.activeExecutions[executionId];
                this.responseModes.delete(executionId);
                this.logger.debug('Execution removed', { executionId });
            }
        });
        this.logger.debug('Execution added', { executionId });
        return executionId;
    }
    attachWorkflowExecution(executionId, workflowExecution) {
        this.getExecutionOrFail(executionId).workflowExecution = workflowExecution;
    }
    attachResponsePromise(executionId, responsePromise) {
        this.getExecutionOrFail(executionId).responsePromise = responsePromise;
    }
    resolveResponsePromise(executionId, response) {
        const execution = this.activeExecutions[executionId];
        execution?.responsePromise?.resolve(response);
    }
    sendChunk(executionId, chunkText) {
        const execution = this.activeExecutions[executionId];
        if (execution?.httpResponse) {
            execution?.httpResponse.write(JSON.stringify(chunkText) + '\n');
            execution?.httpResponse.flush();
        }
    }
    stopExecution(executionId, cancellationError) {
        const execution = this.activeExecutions[executionId];
        if (execution === undefined) {
            return;
        }
        this.logger.debug('Cancelling execution', { executionId, reason: cancellationError.reason });
        const workflowData = execution.executionData.workflowData;
        this.eventService.emit('execution-cancelled', {
            executionId,
            workflowId: workflowData?.id,
            workflowName: workflowData?.name,
            reason: cancellationError.reason,
        });
        execution.responsePromise?.reject(cancellationError);
        if (execution.status === 'waiting') {
            delete this.activeExecutions[executionId];
            this.responseModes.delete(executionId);
        }
        else {
            execution.workflowExecution?.cancel();
            execution.postExecutePromise.reject(cancellationError);
        }
        this.logger.debug('Execution cancelled', { executionId });
    }
    finalizeExecution(executionId, fullRunData) {
        if (!this.has(executionId))
            return;
        const execution = this.getExecutionOrFail(executionId);
        if (execution.executionData.httpResponse) {
            try {
                this.logger.debug('Closing response for execution', { executionId });
                execution.executionData.httpResponse.end();
            }
            catch (error) {
                this.logger.error('Error closing streaming response', {
                    executionId,
                    error: error.message,
                });
            }
        }
        execution.postExecutePromise.resolve(fullRunData);
        this.logger.debug('Execution finalized', { executionId });
    }
    resolveExecutionResponsePromise(executionId) {
        if (!this.has(executionId))
            return;
        const execution = this.getExecutionOrFail(executionId);
        if (execution.status !== 'waiting' && execution?.responsePromise) {
            execution.responsePromise.resolve({});
            this.logger.debug('Execution response promise cleaned', { executionId });
        }
    }
    async getPostExecutePromise(executionId) {
        return await this.getExecutionOrFail(executionId).postExecutePromise.promise;
    }
    getActiveExecutions() {
        const returnData = [];
        let data;
        for (const id of Object.keys(this.activeExecutions)) {
            data = this.activeExecutions[id];
            returnData.push({
                id,
                retryOf: data.executionData.retryOf ?? undefined,
                startedAt: data.startedAt,
                mode: data.executionData.executionMode,
                workflowId: data.executionData.workflowData.id,
                status: data.status,
            });
        }
        return returnData;
    }
    setStatus(executionId, status) {
        this.getExecutionOrFail(executionId).status = status;
    }
    getStatus(executionId) {
        return this.getExecutionOrFail(executionId).status;
    }
    setResponseMode(executionId, responseMode) {
        this.responseModes.set(executionId, responseMode);
    }
    getResponseMode(executionId) {
        return this.responseModes.get(executionId);
    }
    async shutdown(cancelAll = false) {
        const isRegularMode = this.executionsConfig.mode === 'regular';
        if (isRegularMode) {
            this.concurrencyControl.disable();
        }
        let executionIds = Object.keys(this.activeExecutions);
        const toCancel = [];
        for (const executionId of executionIds) {
            const { status } = this.activeExecutions[executionId];
            if (isRegularMode && cancelAll) {
                this.stopExecution(executionId, new n8n_workflow_1.SystemShutdownExecutionCancelledError(executionId));
                toCancel.push(executionId);
            }
            else if (status === 'waiting' || status === 'new') {
                delete this.activeExecutions[executionId];
            }
        }
        await this.concurrencyControl.removeAll(toCancel);
        let count = 0;
        executionIds = Object.keys(this.activeExecutions);
        while (executionIds.length !== 0) {
            if (count++ % 4 === 0) {
                this.logger.info(`Waiting for ${executionIds.length} active executions to finish...`);
            }
            await (0, n8n_workflow_1.sleep)(500);
            executionIds = Object.keys(this.activeExecutions);
        }
    }
    getExecutionOrFail(executionId) {
        const execution = this.activeExecutions[executionId];
        if (!execution) {
            throw new execution_not_found_error_1.ExecutionNotFoundError(executionId);
        }
        return execution;
    }
};
exports.ActiveExecutions = ActiveExecutions;
exports.ActiveExecutions = ActiveExecutions = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [backend_common_1.Logger,
        db_1.ExecutionRepository,
        execution_persistence_1.ExecutionPersistence,
        concurrency_control_service_1.ConcurrencyControlService,
        event_service_1.EventService,
        config_1.ExecutionsConfig])
], ActiveExecutions);
//# sourceMappingURL=active-executions.js.map