declare const ChatModelsRequestDto_base: import("@n8n/api-types").ZodClass<{
    credentials: Partial<Record<"n8n" | "openai" | "anthropic" | "google" | "azureOpenAi" | "azureEntraId" | "ollama" | "awsBedrock" | "vercelAiGateway" | "xAiGrok" | "groq" | "openRouter" | "deepSeek" | "cohere" | "mistralCloud" | "custom-agent", string | null>>;
}, {
    credentials: import("zod").ZodRecord<import("zod").ZodEnum<["openai", "anthropic", "google", "azureOpenAi", "azureEntraId", "ollama", "awsBedrock", "vercelAiGateway", "xAiGrok", "groq", "openRouter", "deepSeek", "cohere", "mistralCloud", "n8n", "custom-agent"]>, import("zod").ZodNullable<import("zod").ZodString>>;
}>;
export declare class ChatModelsRequestDto extends ChatModelsRequestDto_base {
}
export {};
