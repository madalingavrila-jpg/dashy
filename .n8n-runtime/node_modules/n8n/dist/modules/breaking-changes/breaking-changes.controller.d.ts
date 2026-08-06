import { BreakingChangeInstanceRuleResult, BreakingChangeLightReportResult, BreakingChangeVersion, BreakingChangeWorkflowRuleResult } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { BreakingChangeService } from './breaking-changes.service';
export declare class BreakingChangesController {
    private readonly service;
    constructor(service: BreakingChangeService);
    private getLightDetectionResults;
    getDetectionReport(query: {
        version?: BreakingChangeVersion;
    }): Promise<BreakingChangeLightReportResult>;
    refreshCache(query: {
        version?: BreakingChangeVersion;
    }): Promise<BreakingChangeLightReportResult>;
    getDetectionReportForRule(_req: AuthenticatedRequest, _res: Response, ruleId: string): Promise<BreakingChangeInstanceRuleResult | BreakingChangeWorkflowRuleResult>;
}
