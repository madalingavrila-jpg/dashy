import { DynamicStructuredTool, type DynamicStructuredToolInput } from '@langchain/core/tools';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { type IDataObject } from 'n8n-workflow';
import type { McpToolIncludeMode } from './types';
import type { McpTool } from '../shared/types';
export declare function getSelectedTools({ mode, includeTools, excludeTools, tools, }: {
    mode: McpToolIncludeMode;
    includeTools?: string[];
    excludeTools?: string[];
    tools: McpTool[];
}): McpTool[];
export declare const getErrorDescriptionFromToolCall: (result: unknown) => string | undefined;
export declare const createCallTool: (name: string, client: Client, timeout: number, onError: (error: string) => void) => (args: IDataObject) => Promise<{} | null>;
export declare function mcpToolToDynamicTool(tool: McpTool, onCallTool: DynamicStructuredToolInput['func']): DynamicStructuredTool;
