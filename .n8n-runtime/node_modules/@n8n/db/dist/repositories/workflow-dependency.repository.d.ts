import { DatabaseConfig } from '@n8n/config';
import { DataSource, Repository } from '@n8n/typeorm';
import { WorkflowDependency } from '../entities';
export declare class WorkflowDependencies {
    readonly workflowId: string;
    readonly workflowVersionId: number | undefined;
    readonly publishedVersionId: string | null;
    readonly dependencies: WorkflowDependency[];
    constructor(workflowId: string, workflowVersionId: number | undefined, publishedVersionId?: string | null);
    add(dependency: {
        dependencyType: string;
        dependencyKey: string | null;
        dependencyInfo: Record<string, unknown> | null;
    }): void;
}
export declare class WorkflowDependencyRepository extends Repository<WorkflowDependency> {
    private readonly databaseConfig;
    constructor(dataSource: DataSource, databaseConfig: DatabaseConfig);
    updateDependenciesForWorkflow(workflowId: string, dependencies: WorkflowDependencies): Promise<boolean>;
    private executeUpdate;
    removeDependenciesForWorkflow(workflowId: string): Promise<boolean>;
    private acquireLockAndCheckForExistingData;
    private getTableName;
}
