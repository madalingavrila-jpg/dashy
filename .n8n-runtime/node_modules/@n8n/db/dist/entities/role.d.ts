import { WithTimestamps } from './abstract-entity';
import type { ProjectRelation } from './project-relation';
import { Scope } from './scope';
export declare class Role extends WithTimestamps {
    slug: string;
    displayName: string;
    description: string | null;
    systemRole: boolean;
    roleType: 'global' | 'project' | 'workflow' | 'credential';
    projectRelations: ProjectRelation[];
    scopes: Scope[];
}
