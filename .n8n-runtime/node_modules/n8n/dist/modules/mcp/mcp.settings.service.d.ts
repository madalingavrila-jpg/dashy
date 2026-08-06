import { SettingsRepository } from '@n8n/db';
import { CacheService } from '../../services/cache/cache.service';
export declare class McpSettingsService {
    private readonly settingsRepository;
    private readonly cacheService;
    constructor(settingsRepository: SettingsRepository, cacheService: CacheService);
    getEnabled(): Promise<boolean>;
    setEnabled(enabled: boolean): Promise<void>;
}
