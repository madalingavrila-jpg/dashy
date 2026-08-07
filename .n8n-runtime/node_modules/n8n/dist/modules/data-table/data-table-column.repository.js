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
exports.DataTableColumnRepository = void 0;
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const typeorm_1 = require("@n8n/typeorm");
const n8n_workflow_1 = require("n8n-workflow");
const data_table_column_entity_1 = require("./data-table-column.entity");
const data_table_ddl_service_1 = require("./data-table-ddl.service");
const data_table_entity_1 = require("./data-table.entity");
const data_table_column_name_conflict_error_1 = require("./errors/data-table-column-name-conflict.error");
const data_table_system_column_name_conflict_error_1 = require("./errors/data-table-system-column-name-conflict.error");
const data_table_validation_error_1 = require("./errors/data-table-validation.error");
let DataTableColumnRepository = class DataTableColumnRepository extends typeorm_1.Repository {
    constructor(dataSource, ddlService) {
        super(data_table_column_entity_1.DataTableColumn, dataSource.manager);
        this.ddlService = ddlService;
    }
    validateNotSystemColumn(columnName) {
        if (n8n_workflow_1.DATA_TABLE_SYSTEM_COLUMNS.includes(columnName)) {
            throw new data_table_system_column_name_conflict_error_1.DataTableSystemColumnNameConflictError(columnName);
        }
        if (columnName === n8n_workflow_1.DATA_TABLE_SYSTEM_TESTING_COLUMN) {
            throw new data_table_system_column_name_conflict_error_1.DataTableSystemColumnNameConflictError(columnName, 'testing');
        }
    }
    async validateUniqueColumnName(columnName, dataTableId, em) {
        const existingColumnMatch = await em.existsBy(data_table_column_entity_1.DataTableColumn, {
            name: columnName,
            dataTableId,
        });
        if (existingColumnMatch) {
            const dataTable = await em.findOneBy(data_table_entity_1.DataTable, { id: dataTableId });
            if (!dataTable) {
                throw new n8n_workflow_1.UnexpectedError('Data table not found');
            }
            throw new data_table_column_name_conflict_error_1.DataTableColumnNameConflictError(columnName, dataTable.name);
        }
    }
    async getColumns(dataTableId, trx) {
        const em = trx ?? this.manager;
        const columns = await em
            .createQueryBuilder(data_table_column_entity_1.DataTableColumn, 'dsc')
            .where('dsc.dataTableId = :dataTableId', { dataTableId })
            .getMany();
        columns.sort((a, b) => a.index - b.index);
        return columns;
    }
    async addColumn(dataTableId, schema, trx) {
        return await (0, db_1.withTransaction)(this.manager, trx, async (em) => {
            this.validateNotSystemColumn(schema.name);
            await this.validateUniqueColumnName(schema.name, dataTableId, em);
            if (schema.index === undefined) {
                const columns = await this.getColumns(dataTableId, em);
                schema.index = columns.length;
            }
            else {
                await this.shiftColumns(dataTableId, schema.index, 1, em);
            }
            const column = em.create(data_table_column_entity_1.DataTableColumn, {
                ...schema,
                dataTableId,
            });
            await em.insert(data_table_column_entity_1.DataTableColumn, column);
            await this.ddlService.addColumn(dataTableId, column, em.connection.options.type, em);
            return column;
        });
    }
    async deleteColumn(dataTableId, column, trx) {
        await (0, db_1.withTransaction)(this.manager, trx, async (em) => {
            await em.remove(data_table_column_entity_1.DataTableColumn, column);
            await this.ddlService.dropColumnFromTable(dataTableId, column.name, em.connection.options.type, em);
            await this.shiftColumns(dataTableId, column.index, -1, em);
        });
    }
    async moveColumn(dataTableId, column, targetIndex, trx) {
        await (0, db_1.withTransaction)(this.manager, trx, async (em) => {
            const columnCount = await em.countBy(data_table_column_entity_1.DataTableColumn, { dataTableId });
            if (targetIndex < 0) {
                throw new data_table_validation_error_1.DataTableValidationError('tried to move column to negative index');
            }
            if (targetIndex >= columnCount) {
                throw new data_table_validation_error_1.DataTableValidationError('tried to move column to an index larger than column count');
            }
            await this.shiftColumns(dataTableId, column.index, -1, em);
            await this.shiftColumns(dataTableId, targetIndex, 1, em);
            await em.update(data_table_column_entity_1.DataTableColumn, { id: column.id }, { index: targetIndex });
        });
    }
    async renameColumn(dataTableId, column, newName, trx) {
        return await (0, db_1.withTransaction)(this.manager, trx, async (em) => {
            this.validateNotSystemColumn(newName);
            await this.validateUniqueColumnName(newName, dataTableId, em);
            const oldName = column.name;
            await em.update(data_table_column_entity_1.DataTableColumn, { id: column.id }, { name: newName });
            await this.ddlService.renameColumn(dataTableId, oldName, newName, em.connection.options.type, em);
            return { ...column, name: newName };
        });
    }
    async shiftColumns(dataTableId, lowestIndex, delta, trx) {
        await (0, db_1.withTransaction)(this.manager, trx, async (em) => {
            await em
                .createQueryBuilder()
                .update(data_table_column_entity_1.DataTableColumn)
                .set({
                index: () => `index + ${delta}`,
            })
                .where('dataTableId = :dataTableId AND index >= :thresholdValue', {
                dataTableId,
                thresholdValue: lowestIndex,
            })
                .execute();
        });
    }
};
exports.DataTableColumnRepository = DataTableColumnRepository;
exports.DataTableColumnRepository = DataTableColumnRepository = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        data_table_ddl_service_1.DataTableDDLService])
], DataTableColumnRepository);
//# sourceMappingURL=data-table-column.repository.js.map