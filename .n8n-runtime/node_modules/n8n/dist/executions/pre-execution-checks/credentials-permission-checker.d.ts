import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { OwnershipService } from '../../services/ownership.service';
import { ProjectService } from '../../services/project.service.ee';
export declare class CredentialsPermissionChecker {
    private readonly sharedCredentialsRepository;
    private readonly credentialsRepository;
    private readonly ownershipService;
    private readonly projectService;
    constructor(sharedCredentialsRepository: SharedCredentialsRepository, credentialsRepository: CredentialsRepository, ownershipService: OwnershipService, projectService: ProjectService);
    check(workflowId: string, nodes: INode[]): Promise<void>;
    private addGlobalCredentialsToAccessibleSet;
    private mapCredIdsToNodes;
}
