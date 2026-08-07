import type { PushType } from '@n8n/api-types';
import type { IDataObject, IExecuteWorkflowInfo, INodeExecutionData, INodeParameters, IWorkflowBase, IWorkflowExecuteAdditionalData, IWorkflowSettings, ExecutionStatus, ExecuteWorkflowOptions, IWorkflowExecutionDataProcess, ExecuteWorkflowData, RelatedExecution } from 'n8n-workflow';
export declare function getRunData(workflowData: IWorkflowBase, inputData?: INodeExecutionData[], parentExecution?: RelatedExecution): IWorkflowExecutionDataProcess;
export declare function getDraftWorkflowData(workflowInfo: IExecuteWorkflowInfo, parentWorkflowId: string, parentWorkflowSettings?: IWorkflowSettings): Promise<IWorkflowBase>;
export declare function getPublishedWorkflowData(workflowInfo: IExecuteWorkflowInfo, parentWorkflowId: string, parentWorkflowSettings?: IWorkflowSettings): Promise<IWorkflowBase>;
export declare function executeWorkflow(workflowInfo: IExecuteWorkflowInfo, additionalData: IWorkflowExecuteAdditionalData, options: ExecuteWorkflowOptions): Promise<ExecuteWorkflowData>;
export declare function setExecutionStatus(status: ExecutionStatus): void;
export declare function sendDataToUI(type: PushType, data: IDataObject | IDataObject[]): void;
export declare function getBase({ userId, workflowId, projectId, currentNodeParameters, executionTimeoutTimestamp, workflowSettings, }?: {
    userId?: string;
    workflowId?: string;
    projectId?: string;
    currentNodeParameters?: INodeParameters;
    executionTimeoutTimestamp?: number;
    workflowSettings?: IWorkflowSettings;
}): Promise<IWorkflowExecuteAdditionalData>;
