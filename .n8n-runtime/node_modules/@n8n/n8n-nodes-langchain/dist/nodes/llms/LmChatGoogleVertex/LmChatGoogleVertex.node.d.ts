import { type INodeType, type INodeTypeDescription, type ISupplyDataFunctions, type SupplyData, type ILoadOptionsFunctions } from 'n8n-workflow';
export declare class LmChatGoogleVertex implements INodeType {
    description: INodeTypeDescription;
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
    supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData>;
}
