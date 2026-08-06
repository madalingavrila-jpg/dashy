import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { type AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { UpdateMcpSettingsDto } from './dto/update-mcp-settings.dto';
import { UpdateWorkflowAvailabilityDto } from './dto/update-workflow-availability.dto';
import { McpServerApiKeyService } from './mcp-api-key.service';
import { McpSettingsService } from './mcp.settings.service';
import type { ListQuery } from '../../requests';
import { WorkflowFinderService } from '../../workflows/workflow-finder.service';
import { WorkflowService } from '../../workflows/workflow.service';
export declare class McpSettingsController {
    private readonly mcpSettingsService;
    private readonly logger;
    private readonly moduleRegistry;
    private readonly mcpServerApiKeyService;
    private readonly workflowFinderService;
    private readonly workflowService;
    constructor(mcpSettingsService: McpSettingsService, logger: Logger, moduleRegistry: ModuleRegistry, mcpServerApiKeyService: McpServerApiKeyService, workflowFinderService: WorkflowFinderService, workflowService: WorkflowService);
    updateSettings(_req: AuthenticatedRequest, _res: Response, dto: UpdateMcpSettingsDto): Promise<{
        mcpAccessEnabled: boolean;
    }>;
    getApiKeyForMcpServer(req: AuthenticatedRequest): Promise<import("@n8n/db").ApiKey>;
    rotateApiKeyForMcpServer(req: AuthenticatedRequest): Promise<import("@n8n/db").ApiKey>;
    getMcpEligibleWorkflows(req: ListQuery.Request, res: Response): Promise<void>;
    toggleWorkflowMCPAccess(req: AuthenticatedRequest, _res: Response, workflowId: string, dto: UpdateWorkflowAvailabilityDto): Promise<{
        id: string;
        settings: import("n8n-workflow").IWorkflowSettings | undefined;
        versionId: string;
    }>;
}
