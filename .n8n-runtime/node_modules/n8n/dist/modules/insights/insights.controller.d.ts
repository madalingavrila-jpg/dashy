import type { InsightsByTime, InsightsByWorkflow, InsightsSummary, RestrictedInsightsByTime } from '@n8n/api-types';
import { InsightsDateFilterDto, ListInsightsWorkflowQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { InsightsService } from './insights.service';
export declare class InsightsController {
    private readonly insightsService;
    constructor(insightsService: InsightsService);
    getInsightsSummary(_req: AuthenticatedRequest, _res: Response, query?: InsightsDateFilterDto): Promise<InsightsSummary>;
    getInsightsByWorkflow(_req: AuthenticatedRequest, _res: Response, query: ListInsightsWorkflowQueryDto): Promise<InsightsByWorkflow>;
    getInsightsByTime(_req: AuthenticatedRequest, _res: Response, query: InsightsDateFilterDto): Promise<InsightsByTime[]>;
    getTimeSavedInsightsByTime(_req: AuthenticatedRequest, _res: Response, query: InsightsDateFilterDto): Promise<RestrictedInsightsByTime[]>;
    private validateQueryDates;
    private prepareDateFilters;
    private getSanitizedDateFilters;
    private checkDatesFiltersAgainstLicense;
}
