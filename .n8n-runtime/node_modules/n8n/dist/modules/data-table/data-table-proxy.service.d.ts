import { Logger } from '@n8n/backend-common';
import { DataTableProxyProvider, IDataTableProjectAggregateService, IDataTableProjectService, INode, Workflow } from 'n8n-workflow';
import { DataTableService } from './data-table.service';
import { OwnershipService } from '../../services/ownership.service';
declare const ALLOWED_NODES: readonly ["n8n-nodes-base.dataTable", "n8n-nodes-base.dataTableTool", "n8n-nodes-base.evaluationTrigger", "n8n-nodes-base.evaluation"];
type AllowedNode = (typeof ALLOWED_NODES)[number];
export declare function isAllowedNode(s: string): s is AllowedNode;
export declare class DataTableProxyService implements DataTableProxyProvider {
    private readonly dataTableService;
    private readonly ownershipService;
    private readonly logger;
    constructor(dataTableService: DataTableService, ownershipService: OwnershipService, logger: Logger);
    private validateRequest;
    private getProjectId;
    getDataTableAggregateProxy(workflow: Workflow, node: INode, projectId?: string): Promise<IDataTableProjectAggregateService>;
    getDataTableProxy(workflow: Workflow, node: INode, dataTableId: string, projectId?: string): Promise<IDataTableProjectService>;
    private makeAggregateOperations;
    private makeDataTableOperations;
}
export {};
