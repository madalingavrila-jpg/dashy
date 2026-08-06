"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsService = void 0;
const backend_common_1 = require("@n8n/backend-common");
const decorators_1 = require("@n8n/decorators");
const di_1 = require("@n8n/di");
const luxon_1 = require("luxon");
const n8n_core_1 = require("n8n-core");
const n8n_workflow_1 = require("n8n-workflow");
const insights_shared_1 = require("./database/entities/insights-shared");
const insights_by_period_repository_1 = require("./database/repositories/insights-by-period.repository");
const insights_compaction_service_1 = require("./insights-compaction.service");
const insights_pruning_service_1 = require("./insights-pruning.service");
let InsightsService = class InsightsService {
    constructor(insightsByPeriodRepository, compactionService, pruningService, licenseState, instanceSettings, logger) {
        this.insightsByPeriodRepository = insightsByPeriodRepository;
        this.compactionService = compactionService;
        this.pruningService = pruningService;
        this.licenseState = licenseState;
        this.instanceSettings = instanceSettings;
        this.logger = logger;
        this.logger = this.logger.scoped('insights');
    }
    async toggleCollectionService(enable) {
        if (this.instanceSettings.instanceType !== 'main' &&
            this.instanceSettings.instanceType !== 'webhook') {
            this.logger.debug('Instance is not main or webhook, skipping collection');
            return;
        }
        const { InsightsCollectionService } = await Promise.resolve().then(() => __importStar(require('./insights-collection.service')));
        const collectionService = di_1.Container.get(InsightsCollectionService);
        if (enable) {
            collectionService.init();
        }
        else {
            await collectionService.shutdown();
        }
    }
    async init() {
        await this.toggleCollectionService(true);
        if (this.instanceSettings.isLeader)
            this.startCompactionAndPruningTimers();
    }
    startCompactionAndPruningTimers() {
        this.compactionService.startCompactionTimer();
        if (this.pruningService.isPruningEnabled) {
            this.pruningService.startPruningTimer();
        }
    }
    stopCompactionAndPruningTimers() {
        this.compactionService.stopCompactionTimer();
        this.pruningService.stopPruningTimer();
    }
    async shutdown() {
        await this.toggleCollectionService(false);
        this.stopCompactionAndPruningTimers();
    }
    async getInsightsSummary({ startDate, endDate, projectId, }) {
        const rows = await this.insightsByPeriodRepository.getPreviousAndCurrentPeriodTypeAggregates({
            startDate,
            endDate,
            projectId,
        });
        const data = {
            current: { byType: {} },
            previous: { byType: {} },
        };
        rows.forEach((row) => {
            const { period, type, total_value } = row;
            if (!data[period])
                return;
            data[period].byType[insights_shared_1.NumberToType[type]] = total_value ? Number(total_value) : 0;
        });
        const getValueByType = (period, type) => data[period]?.byType[type] ?? 0;
        const currentSuccesses = getValueByType('current', 'success');
        const currentFailures = getValueByType('current', 'failure');
        const previousSuccesses = getValueByType('previous', 'success');
        const previousFailures = getValueByType('previous', 'failure');
        const currentTotal = currentSuccesses + currentFailures;
        const previousTotal = previousSuccesses + previousFailures;
        const currentFailureRate = currentTotal > 0 ? Math.round((currentFailures / currentTotal) * 1000) / 1000 : 0;
        const previousFailureRate = previousTotal > 0 ? Math.round((previousFailures / previousTotal) * 1000) / 1000 : 0;
        const currentTotalRuntime = getValueByType('current', 'runtime_ms') ?? 0;
        const previousTotalRuntime = getValueByType('previous', 'runtime_ms') ?? 0;
        const currentAvgRuntime = currentTotal > 0 ? Math.round((currentTotalRuntime / currentTotal) * 100) / 100 : 0;
        const previousAvgRuntime = previousTotal > 0 ? Math.round((previousTotalRuntime / previousTotal) * 100) / 100 : 0;
        const currentTimeSaved = getValueByType('current', 'time_saved_min');
        const previousTimeSaved = getValueByType('previous', 'time_saved_min');
        const getDeviation = (current, previous) => previousTotal === 0 ? null : current - previous;
        const result = {
            averageRunTime: {
                value: currentAvgRuntime,
                unit: 'millisecond',
                deviation: getDeviation(currentAvgRuntime, previousAvgRuntime),
            },
            failed: {
                value: currentFailures,
                unit: 'count',
                deviation: getDeviation(currentFailures, previousFailures),
            },
            failureRate: {
                value: currentFailureRate,
                unit: 'ratio',
                deviation: getDeviation(currentFailureRate, previousFailureRate),
            },
            timeSaved: {
                value: currentTimeSaved,
                unit: 'minute',
                deviation: getDeviation(currentTimeSaved, previousTimeSaved),
            },
            total: {
                value: currentTotal,
                unit: 'count',
                deviation: getDeviation(currentTotal, previousTotal),
            },
        };
        return result;
    }
    async getInsightsByWorkflow({ skip = 0, take = 10, sortBy = 'total:desc', projectId, startDate, endDate, }) {
        const { count, rows } = await this.insightsByPeriodRepository.getInsightsByWorkflow({
            startDate,
            endDate,
            skip,
            take,
            sortBy,
            projectId,
        });
        return {
            count,
            data: rows,
        };
    }
    async getInsightsByTime({ insightTypes = Object.keys(insights_shared_1.TypeToNumber), projectId, startDate, endDate, }) {
        const periodUnit = this.getDateFiltersGranularity({ startDate, endDate });
        const rows = await this.insightsByPeriodRepository.getInsightsByTime({
            periodUnit,
            insightTypes,
            projectId,
            startDate,
            endDate,
        });
        return rows.map((r) => {
            const { periodStart, runTime, ...rest } = r;
            const values = rest;
            if (typeof r.succeeded === 'number' && typeof r.failed === 'number') {
                const total = r.succeeded + r.failed;
                values.total = total;
                values.failureRate = total ? r.failed / total : 0;
                if (typeof runTime === 'number') {
                    values.averageRunTime = total ? runTime / total : 0;
                }
            }
            return {
                date: r.periodStart,
                values,
            };
        });
    }
    validateDateFiltersLicense({ startDate, endDate }) {
        const today = luxon_1.DateTime.now().startOf('day');
        const startDateStartOfDay = luxon_1.DateTime.fromJSDate(startDate).startOf('day');
        const daysToStartDate = today.diff(startDateStartOfDay, 'days').days;
        const granularity = this.getDateFiltersGranularity({ startDate, endDate });
        const maxHistoryInDays = this.licenseState.getInsightsMaxHistory() === -1
            ? Number.MAX_SAFE_INTEGER
            : this.licenseState.getInsightsMaxHistory();
        const isHourlyDateLicensed = this.licenseState.isInsightsHourlyDataLicensed();
        if (granularity === 'hour' && !isHourlyDateLicensed) {
            throw new n8n_workflow_1.UserError('Hourly data is not available with your current license');
        }
        if (maxHistoryInDays < daysToStartDate) {
            throw new n8n_workflow_1.UserError('The selected date range exceeds the maximum history allowed by your license');
        }
    }
    getDateFiltersGranularity({ startDate, endDate, }) {
        const startDateTime = luxon_1.DateTime.fromJSDate(startDate);
        const endDateTime = luxon_1.DateTime.fromJSDate(endDate);
        const differenceInDays = endDateTime.diff(startDateTime, 'days').days;
        if (differenceInDays < 1) {
            return 'hour';
        }
        if (differenceInDays <= 30) {
            return 'day';
        }
        return 'week';
    }
};
exports.InsightsService = InsightsService;
__decorate([
    (0, decorators_1.OnLeaderTakeover)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InsightsService.prototype, "startCompactionAndPruningTimers", null);
__decorate([
    (0, decorators_1.OnLeaderStepdown)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InsightsService.prototype, "stopCompactionAndPruningTimers", null);
exports.InsightsService = InsightsService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [insights_by_period_repository_1.InsightsByPeriodRepository,
        insights_compaction_service_1.InsightsCompactionService,
        insights_pruning_service_1.InsightsPruningService,
        backend_common_1.LicenseState,
        n8n_core_1.InstanceSettings,
        backend_common_1.Logger])
], InsightsService);
//# sourceMappingURL=insights.service.js.map