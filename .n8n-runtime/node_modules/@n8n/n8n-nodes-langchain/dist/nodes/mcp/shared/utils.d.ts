import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { IExecuteFunctions, ILoadOptionsFunctions, INode, ISupplyDataFunctions, Result } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { McpAuthenticationOption, McpServerTransport, McpTool } from './types';
export declare function getAllTools(client: Client, cursor?: string): Promise<McpTool[]>;
type OnUnauthorizedHandler = (headers?: Record<string, string>) => Promise<Record<string, string> | null>;
type ConnectMcpClientError = {
    type: 'invalid_url';
    error: Error;
} | {
    type: 'connection';
    error: Error;
} | {
    type: 'auth';
    error: Error;
};
export declare function mapToNodeOperationError(node: INode, error: ConnectMcpClientError): NodeOperationError;
export declare function connectMcpClient({ headers, serverTransport, endpointUrl, name, version, onUnauthorized, }: {
    serverTransport: McpServerTransport;
    endpointUrl: string;
    headers?: Record<string, string>;
    name: string;
    version: number;
    onUnauthorized?: OnUnauthorizedHandler;
}): Promise<Result<Client, ConnectMcpClientError>>;
export declare function getAuthHeaders(ctx: Pick<IExecuteFunctions, 'getCredentials'>, authentication: McpAuthenticationOption): Promise<{
    headers?: Record<string, string>;
}>;
export declare function tryRefreshOAuth2Token(ctx: IExecuteFunctions | ISupplyDataFunctions | ILoadOptionsFunctions, authentication: McpAuthenticationOption, headers?: Record<string, string>): Promise<{
    Authorization: string;
} | null>;
export {};
