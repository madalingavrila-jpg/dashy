import { ModuleRegistry, Logger } from '@n8n/backend-common';
import { type AuthenticatedRequest } from '@n8n/db';
import { ChatHubSettingsService } from './chat-hub.settings.service';
import { ChatHubLLMProvider, UpdateChatSettingsRequest } from '@n8n/api-types';
export declare class ChatHubSettingsController {
    private readonly settings;
    private readonly logger;
    private readonly moduleRegistry;
    constructor(settings: ChatHubSettingsService, logger: Logger, moduleRegistry: ModuleRegistry);
    getSettings(_req: AuthenticatedRequest, _res: Response): Promise<{
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
    getProviderSettings(_req: AuthenticatedRequest, _res: Response, provider: ChatHubLLMProvider): Promise<{
        settings: {
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
        };
    }>;
    updateSettings(_req: AuthenticatedRequest, _res: Response, body: UpdateChatSettingsRequest): Promise<{
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
}
