import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
export interface McpToolCallInfo {
    toolName: string;
    arguments: Record<string, unknown>;
    sourceNodeName?: string;
}
export interface McpToolResult {
    [key: string]: unknown;
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
}
export type { JSONRPCMessage };
export declare const MCP_LIST_TOOLS_REQUEST_MARKER: {
    readonly _listToolsRequest: true;
};
