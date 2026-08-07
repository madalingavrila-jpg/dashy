import type { BaseOutputParser } from '@langchain/core/output_parsers';
import type { DynamicStructuredTool, Tool } from '@langchain/classic/tools';
import { type IExecuteFunctions, type INode } from 'n8n-workflow';
import type { ZodObjectAny } from '../../../../types/types';
export declare function extractParsedOutput(ctx: IExecuteFunctions, outputParser: BaseOutputParser<unknown>, output: string): Promise<Record<string, unknown> | undefined>;
export declare function checkForStructuredTools(tools: Array<Tool | DynamicStructuredTool<ZodObjectAny>>, node: INode, currentAgentType: string): Promise<void>;
