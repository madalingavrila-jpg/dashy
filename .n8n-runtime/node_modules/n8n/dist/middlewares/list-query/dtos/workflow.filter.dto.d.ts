import { BaseFilter } from './base.filter.dto';
export declare class WorkflowFilter extends BaseFilter {
    query?: string;
    active?: boolean;
    isArchived?: boolean;
    tags?: string[];
    projectId?: string;
    parentFolderId?: string;
    availableInMCP?: boolean;
    nodeTypes?: string[];
    triggerNodeTypes?: string[];
    static fromString(rawFilter: string): Promise<Record<string, any>>;
}
