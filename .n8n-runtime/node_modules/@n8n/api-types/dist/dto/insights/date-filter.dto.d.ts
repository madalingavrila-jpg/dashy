import { z } from 'zod';
declare const InsightsDateFilterDto_base: import("../../zod-class").ZodClass<{
    projectId?: string | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
}, {
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
    projectId: z.ZodOptional<z.ZodString>;
}>;
export declare class InsightsDateFilterDto extends InsightsDateFilterDto_base {
}
export {};
