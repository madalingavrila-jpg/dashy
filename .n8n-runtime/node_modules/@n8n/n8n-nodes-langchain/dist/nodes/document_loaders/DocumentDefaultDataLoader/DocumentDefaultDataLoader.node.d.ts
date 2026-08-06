import { type INodeType, type INodeTypeDescription, type ISupplyDataFunctions, type SupplyData } from 'n8n-workflow';
import 'mammoth';
import 'epub2';
import 'pdf-parse';
export declare class DocumentDefaultDataLoader implements INodeType {
    description: INodeTypeDescription;
    supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData>;
}
