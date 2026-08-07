import { type User } from '@n8n/db';
import z from 'zod';
import type { ToolDefinition, SearchWorkflowsParams, SearchWorkflowsResult } from '../mcp.types';
import type { Telemetry } from '../../../telemetry';
import type { WorkflowService } from '../../../workflows/workflow.service';
declare const inputSchema: {
    limit: z.ZodOptional<z.ZodNumber>;
    query: z.ZodOptional<z.ZodString>;
    projectId: z.ZodOptional<z.ZodString>;
};
export declare const createSearchWorkflowsTool: (user: User, workflowService: WorkflowService, telemetry: Telemetry) => ToolDefinition<typeof inputSchema>;
export declare function searchWorkflows(user: User, workflowService: WorkflowService, { limit, query, projectId }: SearchWorkflowsParams): Promise<SearchWorkflowsResult>;
export {};
