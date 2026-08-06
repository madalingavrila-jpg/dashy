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
exports.BreakingChangesController = void 0;
const decorators_1 = require("@n8n/decorators");
const breaking_changes_service_1 = require("./breaking-changes.service");
const not_found_error_1 = require("../../errors/response-errors/not-found.error");
let BreakingChangesController = class BreakingChangesController {
    constructor(service) {
        this.service = service;
    }
    getLightDetectionResults(report) {
        return {
            ...report,
            workflowResults: report.workflowResults.map((r) => {
                const { affectedWorkflows, ...otherFields } = r;
                return { ...otherFields, nbAffectedWorkflows: affectedWorkflows.length };
            }),
        };
    }
    async getDetectionReport(query) {
        const report = await this.service.getDetectionResults(query.version ?? 'v2');
        return {
            ...report,
            report: this.getLightDetectionResults(report.report),
        };
    }
    async refreshCache(query) {
        const report = await this.service.refreshDetectionResults(query.version ?? 'v2');
        return {
            ...report,
            report: this.getLightDetectionResults(report.report),
        };
    }
    async getDetectionReportForRule(_req, _res, ruleId) {
        const result = await this.service.getDetectionReportForRule(ruleId);
        if (!result) {
            throw new not_found_error_1.NotFoundError(`Breaking change rule with ID '${ruleId}' not found.`);
        }
        return result;
    }
};
exports.BreakingChangesController = BreakingChangesController;
__decorate([
    (0, decorators_1.Get)('/report'),
    (0, decorators_1.GlobalScope)('breakingChanges:list'),
    __param(0, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BreakingChangesController.prototype, "getDetectionReport", null);
__decorate([
    (0, decorators_1.Post)('/report/refresh'),
    (0, decorators_1.GlobalScope)('breakingChanges:list'),
    __param(0, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BreakingChangesController.prototype, "refreshCache", null);
__decorate([
    (0, decorators_1.Get)('/report/:ruleId'),
    (0, decorators_1.GlobalScope)('breakingChanges:list'),
    __param(2, (0, decorators_1.Param)('ruleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String]),
    __metadata("design:returntype", Promise)
], BreakingChangesController.prototype, "getDetectionReportForRule", null);
exports.BreakingChangesController = BreakingChangesController = __decorate([
    (0, decorators_1.RestController)('/breaking-changes'),
    __metadata("design:paramtypes", [breaking_changes_service_1.BreakingChangeService])
], BreakingChangesController);
//# sourceMappingURL=breaking-changes.controller.js.map