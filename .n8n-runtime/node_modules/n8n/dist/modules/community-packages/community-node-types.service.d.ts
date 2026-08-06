import type { CommunityNodeType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { StrapiCommunityNodeType } from './community-node-types-utils';
import { CommunityPackagesConfig } from './community-packages.config';
import { CommunityPackagesService } from './community-packages.service';
export declare class CommunityNodeTypesService {
    private readonly logger;
    private config;
    private communityPackagesService;
    private communityNodeTypes;
    private lastUpdateTimestamp;
    constructor(logger: Logger, config: CommunityPackagesConfig, communityPackagesService: CommunityPackagesService);
    private detectUpdates;
    private fetchNodeTypes;
    private detectEnvironment;
    private updateCommunityNodeTypes;
    private createAiTools;
    private setCommunityNodeTypes;
    private updateRequired;
    private setTimestampForRetry;
    private createIsInstalled;
    getCommunityNodeTypes(): Promise<CommunityNodeType[]>;
    getCommunityNodeType(type: string): Promise<CommunityNodeType | null>;
    findVetted(packageName: string): StrapiCommunityNodeType | undefined;
}
