import { PaginationDto, WorkflowHistoryVersionsByIdsDto, UpdateWorkflowHistoryVersionDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { WorkflowHistoryRequest } from '../../requests';
import { WorkflowHistoryService } from './workflow-history.service';
export declare class WorkflowHistoryController {
    private readonly historyService;
    constructor(historyService: WorkflowHistoryService);
    getList(req: WorkflowHistoryRequest.GetList, _res: Response, query: PaginationDto): Promise<Omit<import("@n8n/db").WorkflowHistory, "nodes" | "connections">[]>;
    getVersion(req: WorkflowHistoryRequest.GetVersion): Promise<import("@n8n/db").WorkflowHistory>;
    getVersionsByIds(req: WorkflowHistoryRequest.GetList, _res: Response, body: WorkflowHistoryVersionsByIdsDto): Promise<{
        versions: {
            versionId: string;
            createdAt: Date;
        }[];
    }>;
    updateVersion(req: AuthenticatedRequest<{
        workflowId: string;
        versionId: string;
    }>, _res: Response, workflowId: string, versionId: string, body: UpdateWorkflowHistoryVersionDto): Promise<void>;
}
