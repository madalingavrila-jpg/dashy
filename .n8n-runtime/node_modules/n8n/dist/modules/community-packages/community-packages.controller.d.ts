import { EventService } from '../../events/event.service';
import { Push } from '../../push';
import { NodeRequest } from '../../requests';
import { CommunityNodeTypesService } from './community-node-types.service';
import { CommunityPackagesService } from './community-packages.service';
import { InstalledPackages } from './installed-packages.entity';
import { InstanceSettings } from 'n8n-core';
export declare function isNpmError(error: unknown): error is {
    code: number;
    stdout: string;
};
export declare class CommunityPackagesController {
    private readonly push;
    private readonly communityPackagesService;
    private readonly eventService;
    private readonly communityNodeTypesService;
    private readonly instanceSettings;
    constructor(push: Push, communityPackagesService: CommunityPackagesService, eventService: EventService, communityNodeTypesService: CommunityNodeTypesService, instanceSettings: InstanceSettings);
    installPackage(req: NodeRequest.Post): Promise<InstalledPackages>;
    getInstalledPackages(): Promise<InstalledPackages[] | import("n8n-workflow").PublicInstalledPackage[]>;
    uninstallPackage(req: NodeRequest.Delete): Promise<void>;
    updatePackage(req: NodeRequest.Update): Promise<InstalledPackages>;
}
