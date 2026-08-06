import { z } from 'zod';
export declare const MAX_ITEMS_PER_PAGE = 100;
declare const ListInsightsWorkflowQueryDto_base: import("../../zod-class").ZodClass<{
    skip: number;
    take: number;
    projectId?: string | undefined;
    sortBy?: "total:asc" | "total:desc" | "succeeded:asc" | "succeeded:desc" | "failed:asc" | "failed:desc" | "failureRate:asc" | "failureRate:desc" | "timeSaved:asc" | "timeSaved:desc" | "runTime:asc" | "runTime:desc" | "averageRunTime:asc" | "averageRunTime:desc" | "workflowName:asc" | "workflowName:desc" | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
}, {
    take: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>, number, string | undefined>, number, string | undefined>;
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
    sortBy: z.ZodOptional<z.ZodEnum<["total:asc", "total:desc", "succeeded:asc", "succeeded:desc", "failed:asc", "failed:desc", "failureRate:asc", "failureRate:desc", "timeSaved:asc", "timeSaved:desc", "runTime:asc", "runTime:desc", "averageRunTime:asc", "averageRunTime:desc", "workflowName:asc", "workflowName:desc"]>>;
    projectId: z.ZodOptional<z.ZodString>;
    skip: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>, number, string | undefined>;
}>;
export declare class ListInsightsWorkflowQueryDto extends ListInsightsWorkflowQueryDto_base {
}
export {};
