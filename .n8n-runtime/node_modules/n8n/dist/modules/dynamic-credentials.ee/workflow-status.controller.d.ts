import { Request, Response } from 'express';
import { CredentialResolverWorkflowService } from './services/credential-resolver-workflow.service';
import { WorkflowExecutionStatus } from '@n8n/api-types';
import { UrlService } from '../../services/url.service';
import { GlobalConfig } from '@n8n/config';
import { DynamicCredentialCorsService } from './services/dynamic-credential-cors.service';
import { DynamicCredentialWebService } from './services/dynamic-credential-web.service';
export declare class WorkflowStatusController {
    private readonly credentialResolverWorkflowService;
    private readonly urlService;
    private readonly globalConfig;
    private readonly dynamicCredentialCorsService;
    private readonly dynamicCredentialWebService;
    constructor(credentialResolverWorkflowService: CredentialResolverWorkflowService, urlService: UrlService, globalConfig: GlobalConfig, dynamicCredentialCorsService: DynamicCredentialCorsService, dynamicCredentialWebService: DynamicCredentialWebService);
    handlePreflightExecutionStatus(req: Request, res: Response): void;
    checkWorkflowForExecution(req: Request, res: Response): Promise<WorkflowExecutionStatus>;
}
