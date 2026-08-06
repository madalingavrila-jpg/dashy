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
exports.WorkflowHistoryRepository = void 0;
const di_1 = require("@n8n/di");
const typeorm_1 = require("@n8n/typeorm");
const n8n_workflow_1 = require("n8n-workflow");
const entities_1 = require("../entities");
const workflow_publish_history_repository_1 = require("./workflow-publish-history.repository");
let WorkflowHistoryRepository = class WorkflowHistoryRepository extends typeorm_1.Repository {
    constructor(dataSource, workflowPublishHistoryRepository) {
        super(entities_1.WorkflowHistory, dataSource.manager);
        this.workflowPublishHistoryRepository = workflowPublishHistoryRepository;
    }
    async deleteEarlierThan(date) {
        return await this.delete({ createdAt: (0, typeorm_1.LessThan)(date) });
    }
    async deleteEarlierThanExceptCurrentAndActive(date, preserveNamedVersions = false) {
        const currentVersionIdsSubquery = this.manager
            .createQueryBuilder()
            .subQuery()
            .select('w.versionId')
            .from(entities_1.WorkflowEntity, 'w')
            .getQuery();
        const activeVersionIdsSubquery = this.manager
            .createQueryBuilder()
            .subQuery()
            .select('w.activeVersionId')
            .from(entities_1.WorkflowEntity, 'w')
            .where('w.activeVersionId IS NOT NULL')
            .getQuery();
        const query = this.manager
            .createQueryBuilder()
            .delete()
            .from(entities_1.WorkflowHistory)
            .where('createdAt < :date', { date })
            .andWhere(`versionId NOT IN (${currentVersionIdsSubquery})`)
            .andWhere(`versionId NOT IN (${activeVersionIdsSubquery})`);
        if (preserveNamedVersions) {
            query.andWhere('name IS NULL');
        }
        return await query.execute();
    }
    makeSkipActiveAndNamedVersionsRule(activeVersions) {
        return (prev, _next) => prev.name !== null || prev.description !== null || activeVersions.has(prev.versionId);
    }
    async getWorkflowIdsInRange(startDate, endDate) {
        const result = await this.manager
            .createQueryBuilder(entities_1.WorkflowHistory, 'wh')
            .select('wh.workflowId', 'workflowId')
            .distinct(true)
            .where('wh.createdAt <= :endDate', {
            endDate,
        })
            .andWhere('wh.createdAt >= :startDate', {
            startDate,
        })
            .groupBy('wh.workflowId')
            .getRawMany();
        return result.map((x) => x.workflowId);
    }
    async pruneHistory(workflowId, startDate, endDate, rules = [], skipRules = [], metaData) {
        const workflows = await this.manager
            .createQueryBuilder(entities_1.WorkflowHistory, 'wh')
            .where('wh.workflowId = :workflowId', { workflowId })
            .andWhere('wh.createdAt <= :endDate', {
            endDate,
        })
            .andWhere('wh.createdAt >= :startDate', {
            startDate,
        })
            .orderBy('wh.createdAt', 'ASC')
            .getMany();
        const publishedVersions = await this.workflowPublishHistoryRepository.getPublishedVersions(workflowId);
        const grouped = (0, n8n_workflow_1.groupWorkflows)(workflows, rules, [
            this.makeSkipActiveAndNamedVersionsRule(new Set(publishedVersions.map((x) => x.versionId))),
            n8n_workflow_1.SKIP_RULES.skipDifferentUsers,
            ...skipRules,
        ], metaData);
        await this.delete({ versionId: (0, typeorm_1.In)(grouped.removed.map((x) => x.versionId)) });
        return { seen: workflows.length, deleted: grouped.removed.length };
    }
};
exports.WorkflowHistoryRepository = WorkflowHistoryRepository;
exports.WorkflowHistoryRepository = WorkflowHistoryRepository = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        workflow_publish_history_repository_1.WorkflowPublishHistoryRepository])
], WorkflowHistoryRepository);
//# sourceMappingURL=workflow-history.repository.js.map