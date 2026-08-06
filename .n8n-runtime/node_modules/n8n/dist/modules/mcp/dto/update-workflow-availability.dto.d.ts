import { z } from 'zod';
declare const UpdateWorkflowAvailabilityDto_base: import("@n8n/api-types").ZodClass<{
    availableInMCP: boolean;
}, {
    availableInMCP: z.ZodBoolean;
}>;
export declare class UpdateWorkflowAvailabilityDto extends UpdateWorkflowAvailabilityDto_base {
}
export {};
