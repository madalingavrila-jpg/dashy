import type { ILoadOptions, INodeListSearchResult, INodePropertyOptions, IWorkflowExecuteAdditionalData, ResourceMapperFields, INodeCredentials, INodeParameters, INodeTypeNameVersion, NodeParameterValueType, IDataObject } from 'n8n-workflow';
import { NodeTypes } from '../node-types';
import { WorkflowLoaderService } from './workflow-loader.service';
import { SharedWorkflowRepository, User } from '@n8n/db';
import { Logger } from '@n8n/backend-common';
export declare class DynamicNodeParametersService {
    private logger;
    private nodeTypes;
    private workflowLoaderService;
    private sharedWorkflowRepository;
    constructor(logger: Logger, nodeTypes: NodeTypes, workflowLoaderService: WorkflowLoaderService, sharedWorkflowRepository: SharedWorkflowRepository);
    refineResourceIds(user: User, payload: {
        projectId?: string;
        workflowId?: string;
    }): Promise<void>;
    getOptionsViaMethodName(methodName: string, path: string, additionalData: IWorkflowExecuteAdditionalData, nodeTypeAndVersion: INodeTypeNameVersion, currentNodeParameters: INodeParameters, credentials?: INodeCredentials): Promise<INodePropertyOptions[]>;
    getOptionsViaLoadOptions(loadOptions: ILoadOptions, additionalData: IWorkflowExecuteAdditionalData, nodeTypeAndVersion: INodeTypeNameVersion, currentNodeParameters: INodeParameters, credentials?: INodeCredentials): Promise<INodePropertyOptions[]>;
    getResourceLocatorResults(methodName: string, path: string, additionalData: IWorkflowExecuteAdditionalData, nodeTypeAndVersion: INodeTypeNameVersion, currentNodeParameters: INodeParameters, credentials?: INodeCredentials, filter?: string, paginationToken?: string): Promise<INodeListSearchResult>;
    getResourceMappingFields(methodName: string, path: string, additionalData: IWorkflowExecuteAdditionalData, nodeTypeAndVersion: INodeTypeNameVersion, currentNodeParameters: INodeParameters, credentials?: INodeCredentials): Promise<ResourceMapperFields>;
    getLocalResourceMappingFields(methodName: string, path: string, additionalData: IWorkflowExecuteAdditionalData, nodeTypeAndVersion: INodeTypeNameVersion): Promise<ResourceMapperFields>;
    getActionResult(handler: string, path: string, additionalData: IWorkflowExecuteAdditionalData, nodeTypeAndVersion: INodeTypeNameVersion, currentNodeParameters: INodeParameters, payload: IDataObject | string | undefined, credentials?: INodeCredentials): Promise<NodeParameterValueType>;
    private getMethod;
    private getNodeType;
    private getWorkflow;
    private getThisArg;
    private getLocalLoadOptionsContext;
    private removeDuplicateResourceMappingFields;
}
