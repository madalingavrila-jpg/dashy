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
exports.DataTableProxyService = void 0;
exports.isAllowedNode = isAllowedNode;
const backend_common_1 = require("@n8n/backend-common");
const di_1 = require("@n8n/di");
const data_table_service_1 = require("./data-table.service");
const ownership_service_1 = require("../../services/ownership.service");
const ALLOWED_NODES = [
    'n8n-nodes-base.dataTable',
    'n8n-nodes-base.dataTableTool',
    'n8n-nodes-base.evaluationTrigger',
    'n8n-nodes-base.evaluation',
];
function isAllowedNode(s) {
    return ALLOWED_NODES.includes(s);
}
let DataTableProxyService = class DataTableProxyService {
    constructor(dataTableService, ownershipService, logger) {
        this.dataTableService = dataTableService;
        this.ownershipService = ownershipService;
        this.logger = logger;
        this.logger = this.logger.scoped('data-table');
    }
    validateRequest(node) {
        if (!isAllowedNode(node.type)) {
            throw new Error('This proxy is only available for Data table nodes');
        }
    }
    async getProjectId(workflow) {
        const homeProject = await this.ownershipService.getWorkflowProjectCached(workflow.id);
        return homeProject.id;
    }
    async getDataTableAggregateProxy(workflow, node, projectId) {
        this.validateRequest(node);
        projectId = projectId ?? (await this.getProjectId(workflow));
        return this.makeAggregateOperations(projectId);
    }
    async getDataTableProxy(workflow, node, dataTableId, projectId) {
        this.validateRequest(node);
        projectId = projectId ?? (await this.getProjectId(workflow));
        return this.makeDataTableOperations(projectId, dataTableId);
    }
    makeAggregateOperations(projectId) {
        const dataTableService = this.dataTableService;
        return {
            getProjectId() {
                return projectId;
            },
            async getManyAndCount(options = {}) {
                const serviceOptions = {
                    ...options,
                    filter: { projectId, ...(options.filter ?? {}) },
                };
                return await dataTableService.getManyAndCount(serviceOptions);
            },
            async createDataTable(options) {
                return await dataTableService.createDataTable(projectId, options);
            },
            async deleteDataTableAll() {
                return await dataTableService.deleteDataTableByProjectId(projectId);
            },
        };
    }
    makeDataTableOperations(projectId, dataTableId) {
        const dataTableService = this.dataTableService;
        return {
            async updateDataTable(options) {
                return await dataTableService.updateDataTable(dataTableId, projectId, options);
            },
            async deleteDataTable() {
                return await dataTableService.deleteDataTable(dataTableId, projectId);
            },
            async getColumns() {
                return await dataTableService.getColumns(dataTableId, projectId);
            },
            async addColumn(options) {
                return await dataTableService.addColumn(dataTableId, projectId, options);
            },
            async moveColumn(columnId, options) {
                return await dataTableService.moveColumn(dataTableId, projectId, columnId, options);
            },
            async deleteColumn(columnId) {
                return await dataTableService.deleteColumn(dataTableId, projectId, columnId);
            },
            async getManyRowsAndCount(options) {
                return await dataTableService.getManyRowsAndCount(dataTableId, projectId, options);
            },
            async insertRows(rows, returnType) {
                return await dataTableService.insertRows(dataTableId, projectId, rows, returnType);
            },
            async updateRows(options) {
                return await dataTableService.updateRows(dataTableId, projectId, { filter: options.filter, data: options.data }, true, options.dryRun);
            },
            async upsertRow(options) {
                return await dataTableService.upsertRow(dataTableId, projectId, options, true, options.dryRun);
            },
            async deleteRows(options) {
                return await dataTableService.deleteRows(dataTableId, projectId, { filter: options.filter }, true, options.dryRun);
            },
        };
    }
};
exports.DataTableProxyService = DataTableProxyService;
exports.DataTableProxyService = DataTableProxyService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [data_table_service_1.DataTableService,
        ownership_service_1.OwnershipService,
        backend_common_1.Logger])
], DataTableProxyService);
//# sourceMappingURL=data-table-proxy.service.js.map