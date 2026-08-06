import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
export interface LLMProviderConfig {
    apiKey: string;
    baseUrl?: string;
    headers?: Record<string, string>;
}
export declare const gpt52: (config: LLMProviderConfig) => Promise<import("@langchain/openai").ChatOpenAI<import("@langchain/openai").ChatOpenAICallOptions>>;
export declare const anthropicClaudeSonnet45: (config: LLMProviderConfig) => Promise<import("@langchain/anthropic").ChatAnthropic>;
export declare const anthropicClaudeSonnet45Think: (config: LLMProviderConfig) => Promise<import("@langchain/anthropic").ChatAnthropic>;
export declare const anthropicHaiku45: (config: LLMProviderConfig) => Promise<import("@langchain/anthropic").ChatAnthropic>;
export declare const anthropicClaudeOpus45: (config: LLMProviderConfig) => Promise<import("@langchain/anthropic").ChatAnthropic>;
export declare const glm47: (config: LLMProviderConfig) => Promise<import("@langchain/openai").ChatOpenAI<import("@langchain/openai").ChatOpenAICallOptions>>;
export declare const gemini3Flash: (config: LLMProviderConfig) => Promise<import("@langchain/openai").ChatOpenAI<import("@langchain/openai").ChatOpenAICallOptions>>;
export declare const deepseekV32: (config: LLMProviderConfig) => Promise<import("@langchain/openai").ChatOpenAI<import("@langchain/openai").ChatOpenAICallOptions>>;
export declare const gemini3Pro: (config: LLMProviderConfig) => Promise<import("@langchain/openai").ChatOpenAI<import("@langchain/openai").ChatOpenAICallOptions>>;
export declare const devstral: (config: LLMProviderConfig) => Promise<import("@langchain/openai").ChatOpenAI<import("@langchain/openai").ChatOpenAICallOptions>>;
export type ModelId = 'claude-opus-4.5' | 'claude-sonnet-4.5' | 'claude-sonnet-4.5-think' | 'claude-haiku-4.5' | 'gpt-5.2' | 'glm-4.7' | 'gemini-3-flash' | 'deepseek-v3.2' | 'gemini-3-pro' | 'devstral';
export declare const MODEL_FACTORIES: Record<ModelId, (config: LLMProviderConfig) => Promise<BaseChatModel>>;
export declare function getApiKeyEnvVar(modelId: ModelId): string;
export declare const AVAILABLE_MODELS: readonly ModelId[];
export declare const DEFAULT_MODEL: ModelId;
