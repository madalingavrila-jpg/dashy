import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
export interface AnthropicModel {
    id: string;
    display_name: string;
    type: string;
    created_at: string;
}
export declare function searchModels(this: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult>;
