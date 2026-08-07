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
exports.ExecutionPersistence = void 0;
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const flatted_1 = require("flatted");
const n8n_core_1 = require("n8n-core");
const fs_store_1 = require("./execution-data/fs-store");
let ExecutionPersistence = class ExecutionPersistence {
    constructor(executionRepository, binaryDataService, fsStore, storageConfig) {
        this.executionRepository = executionRepository;
        this.binaryDataService = binaryDataService;
        this.fsStore = fsStore;
        this.storageConfig = storageConfig;
    }
    async create(payload) {
        const { data: rawData, workflowData, ...rest } = payload;
        const { connections, nodes, name, settings, id } = workflowData;
        const workflowSnapshot = { connections, nodes, name, settings, id };
        const storedAt = this.storageConfig.modeTag;
        const executionEntity = { ...rest, createdAt: new Date(), storedAt };
        const data = (0, flatted_1.stringify)(rawData);
        const workflowVersionId = workflowData.versionId ?? null;
        return await this.executionRepository.manager.transaction(async (tx) => {
            const { identifiers } = await tx.insert(db_1.ExecutionEntity, executionEntity);
            const executionId = String(identifiers[0].id);
            if (storedAt === 'db') {
                await tx.insert(db_1.ExecutionData, {
                    executionId,
                    workflowData: workflowSnapshot,
                    data,
                    workflowVersionId,
                });
                return executionId;
            }
            await this.fsStore.write({ workflowId: id, executionId }, { data, workflowData: workflowSnapshot, workflowVersionId });
            return executionId;
        });
    }
    async hardDelete(target) {
        const targets = Array.isArray(target) ? target : [target];
        if (targets.length === 0)
            return;
        const fsTargets = targets.filter((t) => t.storedAt === 'fs');
        await Promise.all([
            this.executionRepository.deleteByIds(targets.map((t) => t.executionId)),
            this.binaryDataService.deleteMany(targets.map((t) => ({ type: 'execution', ...t }))),
            fsTargets.length > 0 ? this.fsStore.delete(fsTargets) : Promise.resolve(),
        ]);
    }
    async hardDeleteBy(criteria) {
        const refs = await this.executionRepository.deleteExecutionsByFilter(criteria);
        const fsRefs = refs.filter((r) => r.storedAt === 'fs');
        if (fsRefs.length > 0)
            await this.fsStore.delete(fsRefs);
    }
};
exports.ExecutionPersistence = ExecutionPersistence;
exports.ExecutionPersistence = ExecutionPersistence = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [db_1.ExecutionRepository,
        n8n_core_1.BinaryDataService,
        fs_store_1.FsStore,
        n8n_core_1.StorageConfig])
], ExecutionPersistence);
//# sourceMappingURL=execution-persistence.js.map