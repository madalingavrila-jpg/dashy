import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
export declare function baseAnalyze(this: IExecuteFunctions, i: number, urlsPropertyName: string, type: 'image' | 'document'): Promise<INodeExecutionData[]>;
