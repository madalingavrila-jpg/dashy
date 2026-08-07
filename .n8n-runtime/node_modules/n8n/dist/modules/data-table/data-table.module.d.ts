import type { ModuleInterface } from '@n8n/decorators';
export declare class DataTableModule implements ModuleInterface {
    init(): Promise<void>;
    shutdown(): Promise<void>;
    entities(): Promise<(typeof import("./data-table.entity").DataTable | typeof import("./data-table-column.entity").DataTableColumn)[]>;
    context(): Promise<{
        dataTableProxyProvider: import("./data-table-proxy.service").DataTableProxyService;
    }>;
}
