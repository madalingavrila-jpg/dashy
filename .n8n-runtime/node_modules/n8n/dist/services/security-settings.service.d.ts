import { SettingsRepository, SharedCredentialsRepository, SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { PERSONAL_SPACE_PUBLISHING_SETTING, PERSONAL_SPACE_SHARING_SETTING } from '@n8n/permissions';
import { RoleService } from '../services/role.service';
export declare class SecuritySettingsService {
    private readonly settingsRepository;
    private readonly roleService;
    private readonly workflowRepository;
    private readonly sharedWorkflowRepository;
    private readonly sharedCredentialsRepository;
    private readonly PERSONAL_OWNER_ROLE_SLUG;
    constructor(settingsRepository: SettingsRepository, roleService: RoleService, workflowRepository: WorkflowRepository, sharedWorkflowRepository: SharedWorkflowRepository, sharedCredentialsRepository: SharedCredentialsRepository);
    setPersonalSpaceSetting(setting: typeof PERSONAL_SPACE_PUBLISHING_SETTING | typeof PERSONAL_SPACE_SHARING_SETTING, enabled: boolean): Promise<void>;
    arePersonalSpaceSettingsEnabled(): Promise<{
        personalSpacePublishing: boolean;
        personalSpaceSharing: boolean;
    }>;
    getPublishedPersonalWorkflowsCount(): Promise<number>;
    getSharedPersonalWorkflowsCount(): Promise<number>;
    getSharedPersonalCredentialsCount(): Promise<number>;
}
