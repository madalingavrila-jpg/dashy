import type { ILoadOptionsFunctions, INodeType, INodeTypeDescription, ISupplyDataFunctions, SupplyData } from 'n8n-workflow';
export declare class EmbeddingsGoogleVertex implements INodeType {
    methods: {
        listSearch: {
            gcpProjectsList(this: ILoadOptionsFunctions): Promise<{
                results: {
                    name: string;
                    value: string;
                }[];
            }>;
        };
    };
    description: INodeTypeDescription;
    supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData>;
}
