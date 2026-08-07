import type { McpToolResult } from './types';
export declare class MessageFormatter {
    static formatToolResult(result: unknown): McpToolResult;
    static formatError(error: Error): McpToolResult;
}
