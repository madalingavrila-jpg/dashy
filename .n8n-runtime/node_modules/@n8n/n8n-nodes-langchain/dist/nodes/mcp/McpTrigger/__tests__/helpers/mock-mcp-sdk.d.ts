import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { McpTransport, TransportType } from '../../transport/Transport';
export declare function createMockServer(): jest.Mocked<Server>;
export declare function createMockTransport(sessionId: string, transportType?: TransportType): jest.Mocked<McpTransport>;
