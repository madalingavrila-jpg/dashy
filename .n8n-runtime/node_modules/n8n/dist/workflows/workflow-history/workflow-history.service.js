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
exports.WorkflowHistoryService = void 0;
const backend_common_1 = require("@n8n/backend-common");
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const typeorm_1 = require("@n8n/typeorm");
const n8n_workflow_1 = require("n8n-workflow");
const workflow_finder_service_1 = require("../workflow-finder.service");
const shared_workflow_not_found_error_1 = require("../../errors/shared-workflow-not-found.error");
const workflow_history_version_not_found_error_1 = require("../../errors/workflow-history-version-not-found.error");
const event_service_1 = require("../../events/event.service");
let WorkflowHistoryService = class WorkflowHistoryService {
    constructor(logger, workflowHistoryRepository, workflowFinderService, eventService) {
        this.logger = logger;
        this.workflowHistoryRepository = workflowHistoryRepository;
        this.workflowFinderService = workflowFinderService;
        this.eventService = eventService;
    }
    async getList(user, workflowId, take, skip) {
        const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
            'workflow:read',
        ]);
        if (!workflow) {
            throw new shared_workflow_not_found_error_1.SharedWorkflowNotFoundError('');
        }
        return await this.workflowHistoryRepository.find({
            where: {
                workflowId: workflow.id,
            },
            take,
            skip,
            select: [
                'workflowId',
                'versionId',
                'authors',
                'createdAt',
                'updatedAt',
                'name',
                'description',
            ],
            relations: ['workflowPublishHistory'],
            order: { createdAt: 'DESC' },
        });
    }
    async getVersion(user, workflowId, versionId, settings) {
        const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
            'workflow:read',
        ]);
        if (!workflow) {
            throw new shared_workflow_not_found_error_1.SharedWorkflowNotFoundError('');
        }
        const includePublishHistory = settings?.includePublishHistory ?? true;
        const relations = includePublishHistory ? ['workflowPublishHistory'] : [];
        const hist = await this.workflowHistoryRepository.findOne({
            where: {
                workflowId: workflow.id,
                versionId,
            },
            relations,
        });
        if (!hist) {
            throw new workflow_history_version_not_found_error_1.WorkflowHistoryVersionNotFoundError('');
        }
        return hist;
    }
    async findVersion(workflowId, versionId) {
        return await this.workflowHistoryRepository.findOne({
            where: {
                workflowId,
                versionId,
            },
        });
    }
    async saveVersion(user, workflow, workflowId, autosaved = false, transactionManager) {
        if (!workflow.nodes || !workflow.connections) {
            throw new n8n_workflow_1.UnexpectedError(`Cannot save workflow history: nodes and connections are required for workflow ${workflowId}`);
        }
        const authors = typeof user === 'string' ? user : `${user.firstName} ${user.lastName}`;
        const repository = transactionManager
            ? transactionManager.getRepository(db_1.WorkflowHistory)
            : this.workflowHistoryRepository;
        try {
            await repository.insert({
                authors,
                connections: workflow.connections,
                nodes: workflow.nodes,
                versionId: workflow.versionId,
                workflowId,
                autosaved,
            });
        }
        catch (e) {
            const error = (0, n8n_workflow_1.ensureError)(e);
            this.logger.error(`Failed to save workflow history version for workflow ${workflowId}`, {
                error,
            });
        }
    }
    async updateVersionForUser(user, workflowId, versionId, updateData) {
        const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
            'workflow:update',
        ]);
        if (!workflow) {
            throw new shared_workflow_not_found_error_1.SharedWorkflowNotFoundError('');
        }
        const version = await this.workflowHistoryRepository.findOne({
            where: {
                workflowId: workflow.id,
                versionId,
            },
        });
        if (!version) {
            throw new workflow_history_version_not_found_error_1.WorkflowHistoryVersionNotFoundError('');
        }
        await this.updateVersion(workflowId, versionId, updateData);
        if (updateData.name !== undefined || updateData.description !== undefined) {
            this.eventService.emit('workflow-version-updated', {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                },
                workflowId: workflow.id,
                workflowName: workflow.name,
                versionId,
                versionName: updateData.name,
                versionDescription: updateData.description,
            });
        }
    }
    async updateVersion(workflowId, versionId, updateData) {
        await this.workflowHistoryRepository.update({ versionId, workflowId }, updateData);
    }
    async getVersionsByIds(user, workflowId, versionIds) {
        if (versionIds.length === 0) {
            return [];
        }
        const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
            'workflow:read',
        ]);
        if (!workflow) {
            throw new shared_workflow_not_found_error_1.SharedWorkflowNotFoundError('');
        }
        const versions = await this.workflowHistoryRepository.find({
            where: {
                workflowId: workflow.id,
                versionId: (0, typeorm_1.In)(versionIds),
            },
            select: ['versionId', 'createdAt'],
        });
        return versions.map((v) => ({ versionId: v.versionId, createdAt: v.createdAt }));
    }
};
exports.WorkflowHistoryService = WorkflowHistoryService;
exports.WorkflowHistoryService = WorkflowHistoryService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [backend_common_1.Logger,
        db_1.WorkflowHistoryRepository,
        workflow_finder_service_1.WorkflowFinderService,
        event_service_1.EventService])
], WorkflowHistoryService);
//# sourceMappingURL=workflow-history.service.js.map