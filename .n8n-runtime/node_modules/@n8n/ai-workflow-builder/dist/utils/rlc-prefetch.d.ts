import type { Logger } from '@n8n/backend-common';
import type { INode, INodeTypeDescription, INodeListSearchItems } from 'n8n-workflow';
import type { ResourceLocatorCallback } from '../types/callbacks';
export interface RLCParameterInfo {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    nodeTypeVersion: number;
    parameterPath: string;
    searchMethod: string;
}
export interface RLCPrefetchResult {
    nodeId: string;
    nodeName: string;
    parameterPath: string;
    options: INodeListSearchItems[];
    error?: string;
}
export declare function detectRLCParametersForPrefetch(nodes: INode[], nodeTypes: INodeTypeDescription[]): RLCParameterInfo[];
export declare function prefetchRLCOptions(parameters: RLCParameterInfo[], nodes: INode[], resourceLocatorCallback: ResourceLocatorCallback, logger?: Logger, timeoutMs?: number): Promise<RLCPrefetchResult[]>;
export declare function formatPrefetchedOptionsForLLM(results: RLCPrefetchResult[]): string;
