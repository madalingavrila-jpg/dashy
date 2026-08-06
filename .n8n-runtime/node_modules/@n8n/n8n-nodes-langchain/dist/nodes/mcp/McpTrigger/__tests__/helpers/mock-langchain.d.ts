import type { Tool } from '@langchain/core/tools';
export declare function createMockTool(toolName: string, opts?: {
    description?: string;
    invokeReturn?: unknown;
    invokeError?: Error;
    metadata?: Record<string, unknown>;
}): jest.Mocked<Tool>;
export declare function createMockTools(toolNames: string[]): Array<jest.Mocked<Tool>>;
