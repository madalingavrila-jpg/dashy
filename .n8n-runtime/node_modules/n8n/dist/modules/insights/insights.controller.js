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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsController = void 0;
const api_types_1 = require("@n8n/api-types");
const decorators_1 = require("@n8n/decorators");
const luxon_1 = require("luxon");
const n8n_workflow_1 = require("n8n-workflow");
const zod_1 = require("zod");
const bad_request_error_1 = require("../../errors/response-errors/bad-request.error");
const forbidden_error_1 = require("../../errors/response-errors/forbidden.error");
const internal_server_error_1 = require("../../errors/response-errors/internal-server.error");
const insights_service_1 = require("./insights.service");
let InsightsController = class InsightsController {
    constructor(insightsService) {
        this.insightsService = insightsService;
    }
    async getInsightsSummary(_req, _res, query = {}) {
        const { startDate, endDate } = this.prepareDateFilters(query);
        return await this.insightsService.getInsightsSummary({
            startDate,
            endDate,
            projectId: query.projectId,
        });
    }
    async getInsightsByWorkflow(_req, _res, query) {
        const { startDate, endDate } = this.prepareDateFilters(query);
        return await this.insightsService.getInsightsByWorkflow({
            skip: query.skip,
            take: query.take,
            sortBy: query.sortBy,
            projectId: query.projectId,
            startDate,
            endDate,
        });
    }
    async getInsightsByTime(_req, _res, query) {
        const { startDate, endDate } = this.prepareDateFilters(query);
        return (await this.insightsService.getInsightsByTime({
            projectId: query.projectId,
            startDate,
            endDate,
        }));
    }
    async getTimeSavedInsightsByTime(_req, _res, query) {
        const { startDate, endDate } = this.prepareDateFilters(query);
        return (await this.insightsService.getInsightsByTime({
            insightTypes: ['time_saved_min'],
            projectId: query.projectId,
            startDate,
            endDate,
        }));
    }
    validateQueryDates(query) {
        const schema = zod_1.z
            .object({
            startDate: zod_1.z.coerce.date().optional(),
            endDate: zod_1.z.coerce.date().optional(),
        })
            .refine((data) => {
            if (data.startDate && data.endDate) {
                return data.startDate <= data.endDate;
            }
            return true;
        }, {
            message: 'endDate must be the same as or after startDate',
            path: ['endDate'],
        });
        const result = schema.safeParse(query);
        if (!result.success) {
            throw new bad_request_error_1.BadRequestError(result.error.errors.map(({ message }) => message).join(' '));
        }
    }
    prepareDateFilters(query) {
        this.validateQueryDates(query);
        const { startDate, endDate } = this.getSanitizedDateFilters(query);
        this.checkDatesFiltersAgainstLicense({ startDate, endDate });
        return { startDate, endDate };
    }
    getSanitizedDateFilters(query) {
        const today = new Date();
        if (!query.startDate) {
            return {
                startDate: luxon_1.DateTime.now().minus({ days: 7 }).toJSDate(),
                endDate: today,
            };
        }
        return { startDate: query.startDate, endDate: query.endDate ?? today };
    }
    checkDatesFiltersAgainstLicense(dateFilters) {
        try {
            this.insightsService.validateDateFiltersLicense(dateFilters);
        }
        catch (error) {
            if (error instanceof n8n_workflow_1.UserError) {
                throw new forbidden_error_1.ForbiddenError(error.message);
            }
            throw new internal_server_error_1.InternalServerError();
        }
    }
};
exports.InsightsController = InsightsController;
__decorate([
    (0, decorators_1.Get)('/summary'),
    (0, decorators_1.GlobalScope)('insights:list'),
    __param(2, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response,
        api_types_1.InsightsDateFilterDto]),
    __metadata("design:returntype", Promise)
], InsightsController.prototype, "getInsightsSummary", null);
__decorate([
    (0, decorators_1.Get)('/by-workflow'),
    (0, decorators_1.GlobalScope)('insights:list'),
    (0, decorators_1.Licensed)('feat:insights:viewDashboard'),
    __param(2, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response,
        api_types_1.ListInsightsWorkflowQueryDto]),
    __metadata("design:returntype", Promise)
], InsightsController.prototype, "getInsightsByWorkflow", null);
__decorate([
    (0, decorators_1.Get)('/by-time'),
    (0, decorators_1.GlobalScope)('insights:list'),
    (0, decorators_1.Licensed)('feat:insights:viewDashboard'),
    __param(2, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response,
        api_types_1.InsightsDateFilterDto]),
    __metadata("design:returntype", Promise)
], InsightsController.prototype, "getInsightsByTime", null);
__decorate([
    (0, decorators_1.Get)('/by-time/time-saved'),
    (0, decorators_1.GlobalScope)('insights:list'),
    __param(2, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response,
        api_types_1.InsightsDateFilterDto]),
    __metadata("design:returntype", Promise)
], InsightsController.prototype, "getTimeSavedInsightsByTime", null);
exports.InsightsController = InsightsController = __decorate([
    (0, decorators_1.RestController)('/insights'),
    __metadata("design:paramtypes", [insights_service_1.InsightsService])
], InsightsController);
//# sourceMappingURL=insights.controller.js.map