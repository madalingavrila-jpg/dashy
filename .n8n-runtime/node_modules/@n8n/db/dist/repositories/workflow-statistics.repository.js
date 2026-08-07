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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowStatisticsRepository = void 0;
const config_1 = require("@n8n/config");
const di_1 = require("@n8n/di");
const permissions_1 = require("@n8n/permissions");
const typeorm_1 = require("@n8n/typeorm");
const node_assert_1 = __importDefault(require("node:assert"));
const entities_1 = require("../entities");
let WorkflowStatisticsRepository = class WorkflowStatisticsRepository extends typeorm_1.Repository {
    constructor(dataSource, globalConfig) {
        super(entities_1.WorkflowStatistics, dataSource.manager);
        this.globalConfig = globalConfig;
    }
    async insertWorkflowStatistics(eventName, workflowId, workflowName) {
        try {
            const exists = await this.findOne({
                where: {
                    workflowId,
                    name: eventName,
                },
            });
            if (exists)
                return 'alreadyExists';
            await this.insert({
                workflowId,
                name: eventName,
                count: 1,
                rootCount: 1,
                latestEvent: new Date(),
                workflowName: workflowName ?? null,
            });
            return 'insert';
        }
        catch (error) {
            if (!(error instanceof typeorm_1.QueryFailedError)) {
                throw error;
            }
            return 'failed';
        }
    }
    async upsertWorkflowStatistics(eventName, workflowId, isRootExecution, workflowName) {
        const dbType = this.globalConfig.database.type;
        const escapedTableName = this.manager.connection.driver.escape(this.metadata.tableName);
        try {
            const rootCountIncrement = isRootExecution ? 1 : 0;
            if (dbType === 'sqlite') {
                await this.query(`INSERT INTO ${escapedTableName} ("count", "rootCount", "name", "workflowId", "workflowName", "latestEvent")
					VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
					ON CONFLICT (workflowId, name)
					DO UPDATE SET
						count = count + 1,
						rootCount = rootCount + ?,
						workflowName = excluded.workflowName,
						latestEvent = CURRENT_TIMESTAMP`, [rootCountIncrement, eventName, workflowId, workflowName ?? null, rootCountIncrement]);
                const counter = await this.findOne({
                    select: ['count'],
                    where: { name: eventName, workflowId },
                });
                return (counter?.count ?? 0) > 1 ? 'update' : counter?.count === 1 ? 'insert' : 'failed';
            }
            else if (dbType === 'postgresdb') {
                const queryResult = (await this.query(`INSERT INTO ${escapedTableName} ("count", "rootCount", "name", "workflowId", "workflowName", "latestEvent")
					VALUES (1, $1, $2, $3, $4, CURRENT_TIMESTAMP)
					ON CONFLICT ("name", "workflowId")
					DO UPDATE SET
						"count" = ${escapedTableName}."count" + 1,
						"rootCount" = ${escapedTableName}."rootCount" + $5,
						"workflowName" = $4,
						"latestEvent" = CURRENT_TIMESTAMP
					RETURNING *;`, [rootCountIncrement, eventName, workflowId, workflowName ?? null, rootCountIncrement]));
                return Number(queryResult[0].count) === 1 ? 'insert' : 'update';
            }
            node_assert_1.default.fail('Unknown database type');
        }
        catch (error) {
            console.log('error', error);
            if (error instanceof typeorm_1.QueryFailedError)
                return 'failed';
            throw error;
        }
    }
    async queryNumWorkflowsUserHasWithFiveOrMoreProdExecs(userId) {
        const result = await this.createQueryBuilder('ws')
            .select('COUNT(DISTINCT ws.workflowId)', 'count')
            .innerJoin(entities_1.WorkflowEntity, 'we', 'ws.workflowId = we.id')
            .innerJoin(entities_1.SharedWorkflow, 'sw', 'we.id = sw.workflowId')
            .innerJoin(entities_1.ProjectRelation, 'pr', 'sw.projectId = pr.projectId')
            .innerJoin(entities_1.Role, 'r', 'pr.role = r.slug')
            .where('sw.role = :role', { role: 'workflow:owner' })
            .andWhere('pr.userId = :userId', { userId })
            .andWhere('r.slug = :slug', { slug: permissions_1.PROJECT_OWNER_ROLE_SLUG })
            .andWhere('we.activeVersionId IS NOT NULL')
            .andWhere('ws.name = :name', { name: "production_success" })
            .andWhere('ws.count >= :minCount', { minCount: 5 })
            .getRawOne();
        return Number(result?.count ?? 0);
    }
};
exports.WorkflowStatisticsRepository = WorkflowStatisticsRepository;
exports.WorkflowStatisticsRepository = WorkflowStatisticsRepository = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        config_1.GlobalConfig])
], WorkflowStatisticsRepository);
//# sourceMappingURL=workflow-statistics.repository.js.map