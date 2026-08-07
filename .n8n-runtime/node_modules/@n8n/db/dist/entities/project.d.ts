import { Relation } from '@n8n/typeorm';
import { WithTimestampsAndStringId } from './abstract-entity';
import type { ProjectRelation } from './project-relation';
import type { ProjectSecretsProviderAccess } from './project-secrets-provider-access';
import type { SharedCredentials } from './shared-credentials';
import type { SharedWorkflow } from './shared-workflow';
import { User } from './user';
import type { Variables } from './variables';
export declare class Project extends WithTimestampsAndStringId {
    name: string;
    type: 'personal' | 'team';
    icon: {
        type: 'emoji' | 'icon';
        value: string;
    } | null;
    description: string | null;
    projectRelations: ProjectRelation[];
    sharedCredentials: SharedCredentials[];
    sharedWorkflows: SharedWorkflow[];
    secretsProviderAccess: ProjectSecretsProviderAccess[];
    variables: Variables[];
    creatorId: string | null;
    creator?: Relation<User>;
}
