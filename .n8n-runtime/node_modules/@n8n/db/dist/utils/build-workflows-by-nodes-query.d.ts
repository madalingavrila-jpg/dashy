export declare function buildWorkflowsByNodesQuery(nodeTypes: string[], dbType: 'postgresdb' | 'sqlite'): {
    whereClause: string;
    parameters: Record<string, string | string[]>;
};
