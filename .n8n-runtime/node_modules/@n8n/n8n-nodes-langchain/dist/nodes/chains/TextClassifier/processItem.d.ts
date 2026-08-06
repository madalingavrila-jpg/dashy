import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { OutputFixingParser, StructuredOutputParser } from '@langchain/classic/output_parsers';
import { type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
export declare function processItem(ctx: IExecuteFunctions, itemIndex: number, item: INodeExecutionData, llm: BaseLanguageModel, parser: StructuredOutputParser<any> | OutputFixingParser<any>, categories: Array<{
    category: string;
    description: string;
}>, multiClassPrompt: string, fallbackPrompt: string | undefined): Promise<Record<string, unknown>>;
