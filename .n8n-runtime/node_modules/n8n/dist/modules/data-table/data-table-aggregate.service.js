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
exports.DataTableAggregateService = void 0;
const backend_common_1 = require("@n8n/backend-common");
const di_1 = require("@n8n/di");
const project_service_ee_1 = require("../../services/project.service.ee");
const data_table_repository_1 = require("./data-table.repository");
const permissions_1 = require("@n8n/permissions");
let DataTableAggregateService = class DataTableAggregateService {
    constructor(dataTableRepository, projectService, logger) {
        this.dataTableRepository = dataTableRepository;
        this.projectService = projectService;
        this.logger = logger;
        this.logger = this.logger.scoped('data-table');
    }
    async start() { }
    async shutdown() { }
    async getManyAndCount(user, options) {
        if ((0, permissions_1.hasGlobalScope)(user, 'dataTable:listProject')) {
            return await this.dataTableRepository.getManyAndCount(options);
        }
        const projects = await this.projectService.getProjectRelationsForUser(user);
        let projectIds = projects.map((x) => x.projectId);
        if (options.filter?.projectId) {
            const mask = [options.filter?.projectId].flat();
            projectIds = projectIds.filter((x) => mask.includes(x));
        }
        if (projectIds.length === 0) {
            return { count: 0, data: [] };
        }
        return await this.dataTableRepository.getManyAndCount({
            ...options,
            filter: {
                ...options.filter,
                projectId: projectIds,
            },
        });
    }
};
exports.DataTableAggregateService = DataTableAggregateService;
exports.DataTableAggregateService = DataTableAggregateService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [data_table_repository_1.DataTableRepository,
        project_service_ee_1.ProjectService,
        backend_common_1.Logger])
], DataTableAggregateService);
//# sourceMappingURL=data-table-aggregate.service.js.map