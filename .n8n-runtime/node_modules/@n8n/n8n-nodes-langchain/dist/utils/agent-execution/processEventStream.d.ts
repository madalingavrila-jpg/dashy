import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { IExecuteFunctions } from 'n8n-workflow';
import type { AgentResult } from './types';
export declare function processEventStream(ctx: IExecuteFunctions, eventStream: IterableReadableStream<StreamEvent>, itemIndex: number): Promise<AgentResult>;
