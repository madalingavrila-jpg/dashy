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
exports.WorkflowDependencyRepository = exports.WorkflowDependencies = void 0;
const config_1 = require("@n8n/config");
const di_1 = require("@n8n/di");
const typeorm_1 = require("@n8n/typeorm");
const entities_1 = require("../entities");
const INDEX_VERSION_ID = 1;
class WorkflowDependencies {
    constructor(workflowId, workflowVersionId, publishedVersionId = null) {
        this.workflowId = workflowId;
        this.workflowVersionId = workflowVersionId;
        this.publishedVersionId = publishedVersionId;
        this.dependencies = [];
    }
    add(dependency) {
        const dep = new entities_1.WorkflowDependency();
        Object.assign(dep, dependency);
        Object.assign(dep, {
            workflowId: this.workflowId,
            workflowVersionId: this.workflowVersionId,
            publishedVersionId: this.publishedVersionId,
            indexVersionId: INDEX_VERSION_ID,
        });
        this.dependencies.push(dep);
    }
}
exports.WorkflowDependencies = WorkflowDependencies;
let WorkflowDependencyRepository = class WorkflowDependencyRepository extends typeorm_1.Repository {
    constructor(dataSource, databaseConfig) {
        super(entities_1.WorkflowDependency, dataSource.manager);
        this.databaseConfig = databaseConfig;
    }
    async updateDependenciesForWorkflow(workflowId, dependencies) {
        return await this.manager.transaction(async (tx) => {
            return await this.executeUpdate(workflowId, dependencies, tx);
        });
    }
    async executeUpdate(workflowId, dependencies, tx) {
        const deleteResult = await tx.delete(entities_1.WorkflowDependency, {
            workflowId,
            workflowVersionId: (0, typeorm_1.LessThan)(dependencies.workflowVersionId),
            publishedVersionId: dependencies.publishedVersionId ? (0, typeorm_1.Not)((0, typeorm_1.IsNull)()) : (0, typeorm_1.IsNull)(),
        });
        if (deleteResult.affected && deleteResult.affected > 0) {
            await tx.insert(entities_1.WorkflowDependency, dependencies.dependencies);
            return true;
        }
        const hasData = await this.acquireLockAndCheckForExistingData(workflowId, dependencies.publishedVersionId, tx);
        if (!hasData) {
            const entities = dependencies.dependencies.map((dep) => this.create(dep));
            await tx.insert(entities_1.WorkflowDependency, entities);
            return true;
        }
        return false;
    }
    async removeDependenciesForWorkflow(workflowId) {
        return await this.manager.transaction(async (tx) => {
            const deleteResult = await tx.delete(entities_1.WorkflowDependency, { workflowId });
            return (deleteResult.affected !== undefined &&
                deleteResult.affected !== null &&
                deleteResult.affected > 0);
        });
    }
    async acquireLockAndCheckForExistingData(workflowId, publishedVersionId, tx) {
        const whereConditions = {
            workflowId,
            publishedVersionId: publishedVersionId ?? (0, typeorm_1.IsNull)(),
        };
        if (this.databaseConfig.type === 'sqlite') {
            return await tx.existsBy(entities_1.WorkflowDependency, whereConditions);
        }
        const placeholder = this.databaseConfig.type === 'postgresdb' ? '$1' : '?';
        const tableName = this.getTableName('workflow_entity');
        await tx.query(`SELECT id FROM ${tableName} WHERE id = ${placeholder} FOR UPDATE`, [
            workflowId,
        ]);
        return await tx.existsBy(entities_1.WorkflowDependency, whereConditions);
    }
    getTableName(name) {
        const { tablePrefix } = this.databaseConfig;
        return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
    }
};
exports.WorkflowDependencyRepository = WorkflowDependencyRepository;
exports.WorkflowDependencyRepository = WorkflowDependencyRepository = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        config_1.DatabaseConfig])
], WorkflowDependencyRepository);
//# sourceMappingURL=workflow-dependency.repository.js.map