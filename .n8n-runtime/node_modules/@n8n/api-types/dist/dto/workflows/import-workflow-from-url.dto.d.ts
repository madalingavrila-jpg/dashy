import { z } from 'zod';
declare const ImportWorkflowFromUrlDto_base: import("../../zod-class").ZodClass<{
    projectId: string;
    url: string;
}, {
    url: z.ZodString;
    projectId: z.ZodString;
}>;
export declare class ImportWorkflowFromUrlDto extends ImportWorkflowFromUrlDto_base {
}
export {};
