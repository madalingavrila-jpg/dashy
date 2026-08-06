import { SettingsRepository } from '@n8n/db';
import { CacheService } from '../services/cache/cache.service';
export declare class AiUsageService {
    private readonly settingsRepository;
    private readonly cacheService;
    constructor(settingsRepository: SettingsRepository, cacheService: CacheService);
    getAiUsageSettings(): Promise<boolean>;
    updateAiUsageSettings(allowSendingActualData: boolean): Promise<void>;
}
