import { GlobalConfig, TaskRunnersConfig } from '@n8n/config';
import type { TaskResultData, RequesterMessage, BrokerMessage, TaskData } from '@n8n/task-runner';
import { ErrorReporter } from 'n8n-core';
import type { EnvProviderState, IExecuteFunctions, Workflow, IRunExecutionData, INodeExecutionData, ITaskDataConnections, INode, INodeParameters, WorkflowExecuteMode, IExecuteData, IDataObject, IWorkflowExecuteAdditionalData, Result } from 'n8n-workflow';
import { EventService } from '../../events/event.service';
import { NodeTypes } from '../../node-types';
export type RequestAccept = (jobId: string) => void;
export type RequestReject = (reason: string | Error) => void;
export type TaskAccept = (data: TaskResultData) => void;
export type TaskReject = (error: unknown) => void;
export interface TaskRequest {
    requestId: string;
    taskType: string;
    settings: unknown;
    data: TaskData;
}
export interface Task {
    taskId: string;
    settings: unknown;
    data: TaskData;
}
export type RunnerStatus = {
    available: true;
} | {
    available: false;
    reason?: string;
};
export declare abstract class TaskRequester {
    private readonly nodeTypes;
    private readonly eventService;
    private readonly taskRunnersConfig;
    private readonly globalConfig;
    private readonly errorReporter;
    requestAcceptRejects: Map<string, {
        accept: RequestAccept;
        reject: RequestReject;
    }>;
    taskAcceptRejects: Map<string, {
        accept: TaskAccept;
        reject: TaskReject;
    }>;
    tasks: Map<string, Task>;
    private readonly dataResponseBuilder;
    private readonly executionIdsToTaskIds;
    private readonly unavailableRunners;
    constructor(nodeTypes: NodeTypes, eventService: EventService, taskRunnersConfig: TaskRunnersConfig, globalConfig: GlobalConfig, errorReporter: ErrorReporter);
    setRunnerUnavailable(taskType: string, reason: string): void;
    getRunnerStatus(taskType: string): RunnerStatus;
    startTask<TData, TError>(additionalData: IWorkflowExecuteAdditionalData, taskType: string, settings: unknown, executeFunctions: IExecuteFunctions, inputData: ITaskDataConnections, node: INode, workflow: Workflow, runExecutionData: IRunExecutionData, runIndex: number, itemIndex: number, activeNodeName: string, connectionInputData: INodeExecutionData[], siblingParameters: INodeParameters, mode: WorkflowExecuteMode, envProviderState: EnvProviderState, executeData?: IExecuteData, defaultReturnRunIndex?: number, selfData?: IDataObject, contextNodeName?: string): Promise<Result<TData, TError>>;
    cancelTasks(executionId: string): void;
    private getTaskIds;
    private cancelTask;
    private clearExecutionsMap;
    sendMessage(_message: RequesterMessage.ToBroker.All): void;
    onMessage(message: BrokerMessage.ToRequester.All): void;
    taskReady(requestId: string, taskId: string): void;
    requestExpired(requestId: string): void;
    rejectTask(jobId: string, reason: string): void;
    taskDone(taskId: string, data: TaskResultData): void;
    taskError(taskId: string, error: unknown): void;
    sendTaskData(taskId: string, requestId: string, requestParams: BrokerMessage.ToRequester.TaskDataRequest['requestParams']): void;
    sendNodeTypes(taskId: string, requestId: string, neededNodeTypes: BrokerMessage.ToRequester.NodeTypesRequest['requestParams']): void;
    handleRpc(taskId: string, callId: string, name: BrokerMessage.ToRequester.RPC['name'], params: unknown[]): Promise<void>;
}
