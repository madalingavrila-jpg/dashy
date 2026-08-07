import type { BaseChatMemory } from '@langchain/classic/memory';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { IExecuteFunctions, ISupplyDataFunctions, INodeExecutionData, EngineResponse, EngineRequest } from 'n8n-workflow';
import type { RequestResponseMetadata } from '../../../../../../../utils/agent-execution/types';
export declare function executeBatch(ctx: IExecuteFunctions | ISupplyDataFunctions, batch: INodeExecutionData[], startIndex: number, model: BaseChatModel, fallbackModel: BaseChatModel | null, memory: BaseChatMemory | undefined, response?: EngineResponse<RequestResponseMetadata>): Promise<{
    returnData: INodeExecutionData[];
    request: EngineRequest<RequestResponseMetadata> | undefined;
}>;
