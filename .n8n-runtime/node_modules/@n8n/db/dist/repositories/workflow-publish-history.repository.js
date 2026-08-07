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
exports.WorkflowPublishHistoryRepository = void 0;
const di_1 = require("@n8n/di");
const typeorm_1 = require("@n8n/typeorm");
const entities_1 = require("../entities");
let WorkflowPublishHistoryRepository = class WorkflowPublishHistoryRepository extends typeorm_1.Repository {
    constructor(dataSource) {
        super(entities_1.WorkflowPublishHistory, dataSource.manager);
    }
    async addRecord({ workflowId, versionId, event, userId, }) {
        await this.insert({
            workflowId,
            versionId,
            event,
            userId,
        });
    }
    async getPublishedVersions(workflowId) {
        return await this.manager
            .createQueryBuilder(entities_1.WorkflowPublishHistory, 'wph')
            .select('wph.versionId')
            .distinct(true)
            .where('wph.workflowId = :workflowId', { workflowId })
            .getMany();
    }
};
exports.WorkflowPublishHistoryRepository = WorkflowPublishHistoryRepository;
exports.WorkflowPublishHistoryRepository = WorkflowPublishHistoryRepository = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], WorkflowPublishHistoryRepository);
//# sourceMappingURL=workflow-publish-history.repository.js.map