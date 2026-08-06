import { ChatHubConversationModel, ChatHubLLMProvider, ChatProviderSettingsDto } from '@n8n/api-types';
import { SettingsRepository } from '@n8n/db';
export declare class ChatHubSettingsService {
    private readonly settingsRepository;
    constructor(settingsRepository: SettingsRepository);
    getEnabled(): Promise<boolean>;
    setEnabled(enabled: boolean): Promise<void>;
    ensureModelIsAllowed(model: ChatHubConversationModel): Promise<void>;
    getProviderSettings(provider: ChatHubLLMProvider): Promise<ChatProviderSettingsDto>;
    getAllProviderSettings(): Promise<Record<ChatHubLLMProvider, ChatProviderSettingsDto>>;
    setProviderSettings(provider: ChatHubLLMProvider, settings: ChatProviderSettingsDto): Promise<void>;
}
