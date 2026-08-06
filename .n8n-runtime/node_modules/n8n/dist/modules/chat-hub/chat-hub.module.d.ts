import type { ModuleInterface } from '@n8n/decorators';
export declare class ChatHubModule implements ModuleInterface {
    init(): Promise<void>;
    settings(): Promise<{
        enabled: boolean;
        providers: Record<"openai" | "anthropic" | "google" | "azureOpenAi" | "azureEntraId" | "ollama" | "awsBedrock" | "vercelAiGateway" | "xAiGrok" | "groq" | "openRouter" | "deepSeek" | "cohere" | "mistralCloud", {
            provider: "openai" | "anthropic" | "google" | "azureOpenAi" | "azureEntraId" | "ollama" | "awsBedrock" | "vercelAiGateway" | "xAiGrok" | "groq" | "openRouter" | "deepSeek" | "cohere" | "mistralCloud";
            credentialId: string | null;
            allowedModels: {
                model: string;
                displayName: string;
                isManual?: boolean | undefined;
            }[];
            createdAt: string;
            updatedAt: string | null;
            enabled?: boolean | undefined;
        }>;
    }>;
    entities(): Promise<(typeof import("./chat-hub-agent.entity").ChatHubAgent | typeof import("./chat-hub-session.entity").ChatHubSession | typeof import("./chat-hub-message.entity").ChatHubMessage)[]>;
    shutdown(): Promise<void>;
}
