import type { MigrationContext, ReversibleMigration } from '../migration-types';
export declare class AddWorkflowUnpublishScopeToCustomRoles1769900001000 implements ReversibleMigration {
    up({ escape, runQuery, dbType }: MigrationContext): Promise<void>;
    down({ escape, runQuery }: MigrationContext): Promise<void>;
}
