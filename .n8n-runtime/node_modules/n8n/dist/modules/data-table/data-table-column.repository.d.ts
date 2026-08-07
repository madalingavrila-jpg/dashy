import { DataTableCreateColumnSchema } from '@n8n/api-types';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';
import { DataTableColumn } from './data-table-column.entity';
import { DataTableDDLService } from './data-table-ddl.service';
import { DataTable } from './data-table.entity';
export declare class DataTableColumnRepository extends Repository<DataTableColumn> {
    private ddlService;
    constructor(dataSource: DataSource, ddlService: DataTableDDLService);
    private validateNotSystemColumn;
    private validateUniqueColumnName;
    getColumns(dataTableId: string, trx?: EntityManager): Promise<DataTableColumn[]>;
    addColumn(dataTableId: string, schema: DataTableCreateColumnSchema, trx?: EntityManager): Promise<DataTableColumn>;
    deleteColumn(dataTableId: string, column: DataTableColumn, trx?: EntityManager): Promise<void>;
    moveColumn(dataTableId: string, column: DataTableColumn, targetIndex: number, trx?: EntityManager): Promise<void>;
    renameColumn(dataTableId: string, column: DataTableColumn, newName: string, trx?: EntityManager): Promise<{
        name: string;
        dataTableId: string;
        type: "string" | "number" | "boolean" | "date";
        index: number;
        dataTable: DataTable;
        id: string;
        generateId(): void;
        createdAt: Date;
        updatedAt: Date;
        setUpdateDate(): void;
    }>;
    shiftColumns(dataTableId: string, lowestIndex: number, delta: -1 | 1, trx?: EntityManager): Promise<void>;
}
