import type { ExecutionStatus, ITaskData, ITaskStartedData, NodeConnectionType, WorkflowExecuteMode } from 'n8n-workflow';
export type ExecutionStarted = {
    type: 'executionStarted';
    data: {
        executionId: string;
        mode: WorkflowExecuteMode;
        startedAt: Date;
        workflowId: string;
        workflowName?: string;
        retryOf?: string;
        flattedRunData: string;
    };
};
export type ExecutionWaiting = {
    type: 'executionWaiting';
    data: {
        executionId: string;
    };
};
export type ExecutionFinished = {
    type: 'executionFinished';
    data: {
        executionId: string;
        workflowId: string;
        status: ExecutionStatus;
    };
};
export type ExecutionRecovered = {
    type: 'executionRecovered';
    data: {
        executionId: string;
    };
};
export type NodeExecuteBefore = {
    type: 'nodeExecuteBefore';
    data: {
        executionId: string;
        nodeName: string;
        data: ITaskStartedData;
    };
};
export type NodeExecuteAfter = {
    type: 'nodeExecuteAfter';
    data: {
        executionId: string;
        nodeName: string;
        data: Omit<ITaskData, 'data'>;
        itemCountByConnectionType: Partial<Record<NodeConnectionType, number[]>>;
    };
};
export type NodeExecuteAfterData = {
    type: 'nodeExecuteAfterData';
    data: {
        executionId: string;
        nodeName: string;
        data: ITaskData;
        itemCountByConnectionType: NodeExecuteAfter['data']['itemCountByConnectionType'];
    };
};
export type ExecutionPushMessage = ExecutionStarted | ExecutionWaiting | ExecutionFinished | ExecutionRecovered | NodeExecuteBefore | NodeExecuteAfter | NodeExecuteAfterData;
