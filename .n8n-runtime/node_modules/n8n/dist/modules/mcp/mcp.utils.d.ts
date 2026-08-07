import type { AuthenticatedRequest } from '@n8n/db';
import type { Request } from 'express';
import type { INode } from 'n8n-workflow';
export declare const getClientInfo: (req: Request | AuthenticatedRequest) => {
    name?: string;
    version?: string;
} | undefined;
export declare const getToolName: (body: unknown) => string;
export declare const getToolArguments: (body: unknown) => Record<string, unknown>;
export declare const findMcpSupportedTrigger: (nodes: INode[]) => INode | undefined;
