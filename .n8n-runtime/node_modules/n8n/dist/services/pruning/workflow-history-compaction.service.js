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
exports.WorkflowHistoryCompactionService = void 0;
const event_service_1 = require("../../events/event.service");
const backend_common_1 = require("@n8n/backend-common");
const config_1 = require("@n8n/config");
const constants_1 = require("@n8n/constants");
const db_1 = require("@n8n/db");
const decorators_1 = require("@n8n/decorators");
const di_1 = require("@n8n/di");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const node_assert_1 = require("node:assert");
let WorkflowHistoryCompactionService = class WorkflowHistoryCompactionService {
    constructor(config, globalConfig, logger, instanceSettings, dbConnection, workflowHistoryRepository, eventService) {
        this.config = config;
        this.globalConfig = globalConfig;
        this.logger = logger;
        this.instanceSettings = instanceSettings;
        this.dbConnection = dbConnection;
        this.workflowHistoryRepository = workflowHistoryRepository;
        this.eventService = eventService;
        this.isShuttingDown = false;
        this.isOptimizingHistories = false;
        this.isTrimmingHistories = false;
        this.logger = this.logger.scoped('workflow-history-compaction');
    }
    init() {
        (0, node_assert_1.strict)(this.instanceSettings.instanceRole !== 'unset', 'Instance role is not set');
        if (this.instanceSettings.isLeader)
            this.startCompacting();
    }
    get isEnabled() {
        return this.instanceSettings.instanceType === 'main' && this.instanceSettings.isLeader;
    }
    startCompacting() {
        const { connectionState } = this.dbConnection;
        if (!this.isEnabled || !connectionState.migrated || this.isShuttingDown)
            return;
        this.logger.debug('Started workflow histories optimization and trimming', { ...this.config });
        this.scheduleOptimization();
        this.scheduleTrimming();
    }
    stopCompacting() {
        if (!this.optimizingInterval && !this.trimmingInterval)
            return;
        clearInterval(this.optimizingInterval);
        clearInterval(this.trimmingInterval);
        this.logger.debug('Stopped workflow histories compaction and trimming');
    }
    scheduleTrimming() {
        if (this.globalConfig.workflowHistory.pruneTime !== -1 &&
            this.globalConfig.workflowHistory.pruneTime * constants_1.Time.hours.toMilliseconds <
                this.config.trimmingMinimumAgeDays * constants_1.Time.days.toMilliseconds) {
            this.logger.debug('Skipping workflow history trimming as pruneAge < trimmingMinimumAge');
            return;
        }
        const trimOnceADay = async () => {
            if (new Date().getHours() === 3) {
                await this.trimLongRunningHistories();
            }
        };
        this.trimmingInterval = setInterval(trimOnceADay, 1 * constants_1.Time.hours.toMilliseconds);
        if (this.config.trimOnStartUp) {
            void this.trimLongRunningHistories();
        }
        else {
            void trimOnceADay();
        }
        this.logger.debug('Trimming histories once a day at 3am server time');
    }
    scheduleOptimization() {
        const rateMs = (this.config.optimizingTimeWindowHours / 2) * constants_1.Time.hours.toMilliseconds;
        this.optimizingInterval = setInterval(async () => await this.optimizeHistories(), rateMs);
        this.logger.debug(`Optimizing histories every ${this.config.optimizingTimeWindowHours / 2.0} hour(s)`);
        void this.optimizeHistories();
    }
    shutdown() {
        this.isShuttingDown = true;
        this.stopCompacting();
    }
    async trimLongRunningHistories() {
        if (this.isTrimmingHistories) {
            this.logger.debug('Skipping trimming as there is already a running iteration');
            return;
        }
        this.isTrimmingHistories = true;
        const startDelta = (this.config.trimmingMinimumAgeDays + this.config.trimmingTimeWindowDays) *
            constants_1.Time.days.toMilliseconds;
        const endDelta = this.config.trimmingMinimumAgeDays * constants_1.Time.days.toMilliseconds;
        try {
            await this.compactHistories(startDelta, endDelta, [
                n8n_workflow_1.RULES.makeMergeDependingOnSizeRule(new Map([
                    [0, 60 * 1_000],
                    [100, 5 * 60 * 1_000],
                    [1000, 30 * 60 * 1_000],
                    [5000, 60 * 60 * 1_000],
                    [10000, 4 * 60 * 60 * 1_000],
                ])),
            ], [], { workflowSizeScore: true });
        }
        finally {
            this.isTrimmingHistories = false;
        }
    }
    async optimizeHistories() {
        if (this.isOptimizingHistories) {
            this.logger.debug('Skipping recent optimization as there is already a running iteration');
            return;
        }
        this.isOptimizingHistories = true;
        const startDelta = (this.config.optimizingMinimumAgeHours + this.config.optimizingTimeWindowHours) *
            constants_1.Time.hours.toMilliseconds;
        const endDelta = this.config.optimizingMinimumAgeHours * constants_1.Time.hours.toMilliseconds;
        try {
            await this.compactHistories(startDelta, endDelta, [n8n_workflow_1.RULES.mergeAdditiveChanges], [n8n_workflow_1.SKIP_RULES.makeSkipTimeDifference(20 * 60 * 1000)]);
        }
        finally {
            this.isOptimizingHistories = false;
        }
    }
    async compactHistories(startDeltaMs, endDeltaMs, rules, skipRules, metaData = {}) {
        const compactionStartTime = Date.now();
        const startDate = new Date(compactionStartTime - startDeltaMs);
        const endDate = new Date(compactionStartTime - endDeltaMs);
        const startIso = startDate.toISOString();
        const endIso = endDate.toISOString();
        this.logger.debug('Starting workflow history compaction', {
            dateRange: { start: startIso, end: endIso },
            config: this.config,
        });
        const workflowIds = await this.workflowHistoryRepository.getWorkflowIdsInRange(startDate, endDate);
        this.logger.debug(`Found ${workflowIds.length} workflows with versions between ${startIso} and ${endIso}`);
        let batchSum = 0;
        let totalVersionsSeen = 0;
        let totalVersionsDeleted = 0;
        let errorCount = 0;
        for (const [index, workflowId] of workflowIds.entries()) {
            try {
                const { seen, deleted } = await this.workflowHistoryRepository.pruneHistory(workflowId, startDate, endDate, rules, skipRules, metaData);
                batchSum += seen;
                totalVersionsSeen += seen;
                totalVersionsDeleted += deleted;
                this.logger.debug(`Deleted ${deleted} of ${seen} versions of workflow ${workflowId} between ${startIso} and ${endIso}`);
            }
            catch (error) {
                errorCount += 1;
                this.logger.error(`Failed to prune version history of workflow ${workflowId}`, {
                    error: (0, n8n_workflow_1.ensureError)(error),
                });
                await (0, n8n_workflow_1.sleep)(this.config.batchDelayMs);
            }
            if (batchSum > this.config.batchSize) {
                this.logger.debug(`Encountered more than ${this.config.batchSize} workflow versions, waiting ${this.config.batchDelayMs * constants_1.Time.milliseconds.toSeconds} second(s) before continuing.`);
                this.logger.debug(`Compacted ${index} of ${workflowIds.length} workflows with versions between ${startIso} and ${endIso}`);
                await (0, n8n_workflow_1.sleep)(this.config.batchDelayMs);
                batchSum = 0;
            }
        }
        const durationMs = Date.now() - compactionStartTime;
        const payload = {
            workflowsProcessed: workflowIds.length,
            totalVersionsSeen,
            totalVersionsDeleted,
            errorCount,
            durationMs,
            compactionStartTime: new Date(compactionStartTime),
            windowStartIso: startIso,
            windowEndIso: endIso,
        };
        this.logger.debug('Workflow history compaction complete', payload);
        this.eventService.emit('history-compacted', payload);
    }
};
exports.WorkflowHistoryCompactionService = WorkflowHistoryCompactionService;
__decorate([
    (0, decorators_1.OnLeaderTakeover)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WorkflowHistoryCompactionService.prototype, "startCompacting", null);
__decorate([
    (0, decorators_1.OnLeaderStepdown)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WorkflowHistoryCompactionService.prototype, "stopCompacting", null);
__decorate([
    (0, decorators_1.OnShutdown)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WorkflowHistoryCompactionService.prototype, "shutdown", null);
exports.WorkflowHistoryCompactionService = WorkflowHistoryCompactionService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [config_1.WorkflowHistoryCompactionConfig,
        config_1.GlobalConfig,
        backend_common_1.Logger,
        n8n_core_1.InstanceSettings,
        db_1.DbConnection,
        db_1.WorkflowHistoryRepository,
        event_service_1.EventService])
], WorkflowHistoryCompactionService);
//# sourceMappingURL=workflow-history-compaction.service.js.map