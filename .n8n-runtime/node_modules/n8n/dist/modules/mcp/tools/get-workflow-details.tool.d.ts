import type { User } from '@n8n/db';
import z from 'zod';
import type { ToolDefinition, WorkflowDetailsResult } from '../mcp.types';
import { workflowDetailsOutputSchema } from './schemas';
import { type WebhookEndpoints } from './webhook-utils';
import type { CredentialsService } from '../../../credentials/credentials.service';
import type { ProjectService } from '../../../services/project.service.ee';
import type { RoleService } from '../../../services/role.service';
import type { Telemetry } from '../../../telemetry';
import type { WorkflowFinderService } from '../../../workflows/workflow-finder.service';
declare const inputSchema: {
    workflowId: z.ZodString;
};
export type WorkflowDetailsOutputSchema = typeof workflowDetailsOutputSchema;
export declare const createWorkflowDetailsTool: (user: User, baseWebhookUrl: string, workflowFinderService: WorkflowFinderService, credentialsService: CredentialsService, endpoints: WebhookEndpoints, telemetry: Telemetry, roleService: RoleService, projectService: ProjectService) => ToolDefinition<typeof inputSchema>;
export declare function getWorkflowDetails(user: User, baseWebhookUrl: string, workflowFinderService: WorkflowFinderService, credentialsService: CredentialsService, endpoints: WebhookEndpoints, roleService: RoleService, projectService: ProjectService, { workflowId }: {
    workflowId: string;
}): Promise<WorkflowDetailsResult>;
export {};
