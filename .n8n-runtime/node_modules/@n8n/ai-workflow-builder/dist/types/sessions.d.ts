import type { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
export interface Session {
    sessionId: string;
    messages: Array<Record<string, unknown>>;
    lastUpdated?: string;
}
export type LangchainMessage = AIMessage | HumanMessage | ToolMessage;
export declare function isLangchainMessagesArray(value: unknown): value is LangchainMessage[];
