import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, SupplyData, ISupplyDataFunctions } from 'n8n-workflow';
export declare function transformLegacyLangchainImport(moduleName: string): string;
export declare const vmResolver: import("vm2").Resolver;
export declare class Code implements INodeType {
    description: INodeTypeDescription;
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
    supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData>;
}
